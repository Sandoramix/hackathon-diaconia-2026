import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, tutorProcedure } from "~/server/api/trpc";

function expandToTimeSlots(
  date: Date,
  windowStart: string,
  windowEnd: string,
  durationHours: number,
  maxOccupants: number,
): { date: Date; slotStart: Date; slotEnd: Date; maxOccupants: number }[] {
  const [sh = 0, sm = 0] = windowStart.split(":").map(Number);
  const [eh = 23, em = 59] = windowEnd.split(":").map(Number);

  const dayStart = new Date(date);
  dayStart.setHours(sh, sm, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(eh, em, 0, 0);

  const durationMs = durationHours * 60 * 60 * 1000;
  const result: { date: Date; slotStart: Date; slotEnd: Date; maxOccupants: number }[] = [];
  let cursor = dayStart.getTime();
  while (cursor + durationMs <= dayEnd.getTime()) {
    result.push({
      date: new Date(cursor),
      slotStart: new Date(cursor),
      slotEnd: new Date(cursor + durationMs),
      maxOccupants,
    });
    cursor += durationMs;
  }
  return result;
}

export const taskRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    const user = ctx.session.user;
    if (!user.structureId) throw new TRPCError({ code: "FORBIDDEN" });

    return ctx.db.task.findMany({
      where: { structureId: user.structureId },
      include: {
        tags: true,
        slots: {
          include: {
            _count: { select: { occupations: { where: { isActive: true } } } },
            occupations: {
              where: { userId: user.id, isActive: true },
              take: 1,
              select: { id: true, isActive: true },
            },
          },
          orderBy: { date: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const user = ctx.session.user;
      if (!user.structureId) throw new TRPCError({ code: "FORBIDDEN" });

      const task = await ctx.db.task.findFirst({
        where: { id: input.id, structureId: user.structureId },
        include: {
          tags: true,
          slots: {
            include: {
              _count: { select: { occupations: { where: { isActive: true } } } },
              occupations: user.role === "STUDENTE"
                ? { where: { userId: user.id, isActive: true }, take: 1 }
                : {
                    where: { isActive: true },
                    include: { user: { select: { id: true, name: true, username: true } } },
                    orderBy: { createdAt: "asc" },
                  },
            },
            orderBy: { date: "asc" },
          },
        },
      });
      if (!task) throw new TRPCError({ code: "NOT_FOUND" });
      return task;
    }),

  create: tutorProcedure
    .input(
      z.object({
        title: z.string().min(1),
        description: z.string().optional(),
        image: z.string().optional(),
        type: z.enum(["OCCASIONAL", "RECURRENT"]),
        hasFeedback: z.boolean(),
        isCompletable: z.boolean().default(false),
        tagNames: z.array(z.string().min(1)).default([]),
        recurrenceDays: z.array(z.number().int().min(0).max(6)).default([]),
        recurrenceWeeks: z.number().int().min(1).max(52).default(4),
        defaultMaxOccupants: z.number().int().min(1).default(1),
        windowStart: z.string().optional(),
        windowEnd: z.string().optional(),
        slotDurationHours: z.number().positive().optional(),
        slots: z.array(
          z.object({
            date: z.date(),
            maxOccupants: z.number().int().min(1).default(1),
          }),
        ).default([]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const {
        slots, recurrenceDays, recurrenceWeeks, defaultMaxOccupants,
        windowStart, windowEnd, slotDurationHours, tagNames,
        ...rest
      } = input;

      const hasWindow = windowStart && windowEnd && slotDurationHours;

      // Build initial date list for recurrent tasks
      const recurrentDates: Date[] = [];
      if (rest.type === "RECURRENT" && recurrenceDays.length > 0) {
        const now = new Date();
        now.setHours(9, 0, 0, 0);
        for (let week = 0; week < recurrenceWeeks; week++) {
          for (const day of recurrenceDays) {
            const d = new Date(now);
            const diff = (day - d.getDay() + 7) % 7 + week * 7;
            d.setDate(d.getDate() + (diff === 0 && week === 0 ? 7 : diff));
            recurrentDates.push(d);
          }
        }
      }

      type SlotData = { date: Date; slotStart?: Date; slotEnd?: Date; maxOccupants: number };
      let allSlots: SlotData[] = [];

      if (hasWindow) {
        // Expand occasional slots
        for (const s of slots) {
          allSlots.push(...expandToTimeSlots(s.date, windowStart, windowEnd, slotDurationHours, s.maxOccupants));
        }
        // Expand recurrent slots
        for (const d of recurrentDates) {
          allSlots.push(...expandToTimeSlots(d, windowStart, windowEnd, slotDurationHours, defaultMaxOccupants));
        }
      } else {
        allSlots = [
          ...slots,
          ...recurrentDates.map((d) => ({ date: d, maxOccupants: defaultMaxOccupants })),
        ];
      }

      return ctx.db.task.create({
        data: {
          ...rest,
          recurrenceDays,
          recurrenceWeeks,
          windowStart: windowStart ?? null,
          windowEnd: windowEnd ?? null,
          slotDurationHours: slotDurationHours ?? null,
          structureId: ctx.session.user.structureId,
          slots: { create: allSlots },
          tags: {
            connectOrCreate: tagNames.map((name) => ({
              where: { name },
              create: { name },
            })),
          },
        },
        include: { slots: true, tags: true },
      });
    }),

  update: tutorProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().min(1).optional(),
        description: z.string().optional().nullable(),
        image: z.string().optional().nullable(),
        type: z.enum(["OCCASIONAL", "RECURRENT"]).optional(),
        hasFeedback: z.boolean().optional(),
        isCompletable: z.boolean().optional(),
        tagNames: z.array(z.string().min(1)).optional(),
        windowStart: z.string().optional().nullable(),
        windowEnd: z.string().optional().nullable(),
        slotDurationHours: z.number().positive().optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, tagNames, ...data } = input;
      const task = await ctx.db.task.findFirst({
        where: { id, structureId: ctx.session.user.structureId },
      });
      if (!task) throw new TRPCError({ code: "NOT_FOUND" });
      return ctx.db.task.update({
        where: { id },
        data: {
          ...data,
          ...(tagNames !== undefined && {
            tags: {
              set: [],
              connectOrCreate: tagNames.map((name) => ({
                where: { name },
                create: { name },
              })),
            },
          }),
        },
      });
    }),

  delete: tutorProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const task = await ctx.db.task.findFirst({
        where: { id: input.id, structureId: ctx.session.user.structureId },
      });
      if (!task) throw new TRPCError({ code: "NOT_FOUND" });
      return ctx.db.task.delete({ where: { id: input.id } });
    }),

  // Tutor: add a slot (or a full day of time-window slots) to a task
  addSlot: tutorProcedure
    .input(
      z.object({
        taskId: z.string(),
        date: z.date(),
        maxOccupants: z.number().int().min(1).default(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const task = await ctx.db.task.findFirst({
        where: { id: input.taskId, structureId: ctx.session.user.structureId },
      });
      if (!task) throw new TRPCError({ code: "NOT_FOUND" });

      if (task.windowStart && task.windowEnd && task.slotDurationHours) {
        const expanded = expandToTimeSlots(
          input.date,
          task.windowStart,
          task.windowEnd,
          task.slotDurationHours,
          input.maxOccupants,
        );
        return ctx.db.taskSlot.createMany({ data: expanded.map((s) => ({ ...s, taskId: input.taskId })) });
      }

      return ctx.db.taskSlot.create({
        data: { taskId: input.taskId, date: input.date, maxOccupants: input.maxOccupants },
      });
    }),

  // Tutor: assign or remove a student from a specific slot
  assignSlot: tutorProcedure
    .input(z.object({ slotId: z.string(), userId: z.string(), assign: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const slot = await ctx.db.taskSlot.findUnique({
        where: { id: input.slotId },
        include: {
          task: true,
          _count: { select: { occupations: { where: { isActive: true } } } },
        },
      });
      if (!slot || slot.task.structureId !== ctx.session.user.structureId) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      if (input.assign) {
        if (slot._count.occupations >= slot.maxOccupants) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Slot al completo" });
        }
        const existing = await ctx.db.taskSlotOccupation.findFirst({
          where: { slotId: input.slotId, userId: input.userId, isActive: true },
        });
        if (existing) throw new TRPCError({ code: "BAD_REQUEST", message: "Già assegnato" });
        return ctx.db.taskSlotOccupation.create({
          data: { slotId: input.slotId, userId: input.userId, action: "SUBSCRIBED", isActive: true },
        });
      } else {
        return ctx.db.taskSlotOccupation.updateMany({
          where: { slotId: input.slotId, userId: input.userId, isActive: true },
          data: { isActive: false },
        });
      }
    }),

  deleteSlot: tutorProcedure
    .input(z.object({ slotId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const slot = await ctx.db.taskSlot.findUnique({
        where: { id: input.slotId },
        include: { task: true },
      });
      if (!slot || slot.task.structureId !== ctx.session.user.structureId) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      return ctx.db.taskSlot.delete({ where: { id: input.slotId } });
    }),

  // Student: occupy/free a slot
  toggleOccupation: protectedProcedure
    .input(z.object({ slotId: z.string(), occupy: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const user = ctx.session.user;
      if (user.role !== "STUDENTE") throw new TRPCError({ code: "FORBIDDEN" });
      if (!user.structureId) throw new TRPCError({ code: "FORBIDDEN" });

      const slot = await ctx.db.taskSlot.findUnique({
        where: { id: input.slotId },
        include: {
          task: true,
          _count: { select: { occupations: { where: { isActive: true } } } },
        },
      });
      if (!slot || slot.task.structureId !== user.structureId) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const currentActive = await ctx.db.taskSlotOccupation.findFirst({
        where: { slotId: input.slotId, userId: user.id, isActive: true },
      });

      if (input.occupy) {
        if (currentActive) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Già iscritto" });
        }
        if (slot._count.occupations >= slot.maxOccupants) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Slot al completo" });
        }
        return ctx.db.taskSlotOccupation.create({
          data: { slotId: input.slotId, userId: user.id, action: "SUBSCRIBED", isActive: true },
        });
      } else {
        if (!currentActive) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Non sei iscritto" });
        }
        return ctx.db.$transaction([
          ctx.db.taskSlotOccupation.update({
            where: { id: currentActive.id },
            data: { isActive: false },
          }),
          ctx.db.taskSlotOccupation.create({
            data: { slotId: input.slotId, userId: user.id, action: "UNSUBSCRIBED", isActive: false },
          }),
        ]);
      }
    }),

  // Student: mark completable task as done / undo
  toggleComplete: protectedProcedure
    .input(z.object({ taskId: z.string(), complete: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const user = ctx.session.user;
      if (user.role !== "STUDENTE") throw new TRPCError({ code: "FORBIDDEN" });
      if (!user.structureId) throw new TRPCError({ code: "FORBIDDEN" });

      const task = await ctx.db.task.findFirst({
        where: { id: input.taskId, structureId: user.structureId, isCompletable: true },
      });
      if (!task) throw new TRPCError({ code: "NOT_FOUND" });

      if (input.complete) {
        return ctx.db.taskCompletion.upsert({
          where: { taskId_userId: { taskId: input.taskId, userId: user.id } },
          create: { taskId: input.taskId, userId: user.id },
          update: {},
        });
      } else {
        return ctx.db.taskCompletion.deleteMany({
          where: { taskId: input.taskId, userId: user.id },
        });
      }
    }),

  // Student: own history
  myHistory: protectedProcedure.query(async ({ ctx }) => {
    const user = ctx.session.user;
    if (!user.structureId) throw new TRPCError({ code: "FORBIDDEN" });
    const now = new Date();

    const [pastEvents, pastSlotOccupations, completedTasks] = await Promise.all([
      ctx.db.event.findMany({
        where: {
          structureId: user.structureId,
          endDate: { lt: now },
          participants: { some: { userId: user.id } },
        },
        include: { tags: true },
        orderBy: { startDate: "desc" },
      }),
      ctx.db.taskSlotOccupation.findMany({
        where: {
          userId: user.id,
          isActive: true,
          slot: { date: { lt: now }, task: { structureId: user.structureId } },
        },
        include: {
          slot: { include: { task: { select: { id: true, title: true, image: true } } } },
        },
        orderBy: { createdAt: "desc" },
      }),
      ctx.db.taskCompletion.findMany({
        where: {
          userId: user.id,
          task: { structureId: user.structureId },
        },
        include: { task: { select: { id: true, title: true, description: true, image: true } } },
        orderBy: { completedAt: "desc" },
      }),
    ]);

    return { pastEvents, pastSlotOccupations, completedTasks };
  }),

  // Tutor: who completed a completable task
  completions: tutorProcedure
    .input(z.object({ taskId: z.string() }))
    .query(async ({ ctx, input }) => {
      const task = await ctx.db.task.findFirst({
        where: { id: input.taskId, structureId: ctx.session.user.structureId },
      });
      if (!task) throw new TRPCError({ code: "NOT_FOUND" });
      return ctx.db.taskCompletion.findMany({
        where: { taskId: input.taskId },
        include: { user: { select: { id: true, name: true, username: true } } },
        orderBy: { completedAt: "asc" },
      });
    }),

  // Tutor: get full occupation history for a slot
  slotHistory: tutorProcedure
    .input(z.object({ slotId: z.string() }))
    .query(async ({ ctx, input }) => {
      const slot = await ctx.db.taskSlot.findUnique({
        where: { id: input.slotId },
        include: { task: true },
      });
      if (!slot || slot.task.structureId !== ctx.session.user.structureId) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      return ctx.db.taskSlotOccupation.findMany({
        where: { slotId: input.slotId },
        include: { user: { select: { id: true, name: true, username: true } } },
        orderBy: { createdAt: "desc" },
      });
    }),
});
