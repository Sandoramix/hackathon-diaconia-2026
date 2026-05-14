import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, tutorProcedure } from "~/server/api/trpc";

const emojiSchema = z.number().int().min(1).max(3);

export const feedbackRouter = createTRPCRouter({
  // Student: submit feedback for event or task
  submit: protectedProcedure
    .input(
      z
        .object({
          emoji: emojiSchema,
          text: z.string().optional(),
          eventId: z.string().optional(),
          taskId: z.string().optional(),
        })
        .refine((d) => !!d.eventId !== !!d.taskId, {
          message: "Specifica solo eventId oppure solo taskId",
        }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = ctx.session.user;
      if (!user.structureId) throw new TRPCError({ code: "FORBIDDEN" });

      // Verify the event/task is hasFeedback and belongs to user's structure
      if (input.eventId) {
        const event = await ctx.db.event.findFirst({
          where: { id: input.eventId, structureId: user.structureId, hasFeedback: true },
        });
        if (!event) throw new TRPCError({ code: "NOT_FOUND" });
      }
      if (input.taskId) {
        const task = await ctx.db.task.findFirst({
          where: { id: input.taskId, structureId: user.structureId, hasFeedback: true },
        });
        if (!task) throw new TRPCError({ code: "NOT_FOUND" });
      }

      return ctx.db.feedback.upsert({
        where: input.eventId
          ? { userId_eventId: { userId: user.id, eventId: input.eventId } }
          : { userId_taskId: { userId: user.id, taskId: input.taskId! } },
        create: { ...input, userId: user.id },
        update: { emoji: input.emoji, text: input.text },
      });
    }),

  // Student: events and tasks awaiting feedback
  pending: protectedProcedure.query(async ({ ctx }) => {
    const user = ctx.session.user;
    if (!user.structureId) return { events: [], tasks: [] };
    const now = new Date();

    const [events, tasks] = await Promise.all([
      ctx.db.event.findMany({
        where: {
          structureId: user.structureId,
          hasFeedback: true,
          endDate: { lt: now },
          participants: { some: { userId: user.id } },
          feedbacks: { none: { userId: user.id } },
        },
        select: {
          id: true, title: true, startDate: true, endDate: true,
          place: true, image: true,
          tags: { select: { id: true, name: true } },
        },
        orderBy: { endDate: "desc" },
        take: 10,
      }),
      ctx.db.task.findMany({
        where: {
          structureId: user.structureId,
          hasFeedback: true,
          slots: { some: { date: { lt: now }, occupations: { some: { userId: user.id, isActive: true } } } },
          feedbacks: { none: { userId: user.id } },
        },
        select: {
          id: true, title: true, image: true,
          tags: { select: { id: true, name: true } },
          slots: {
            where: { date: { lt: now }, occupations: { some: { userId: user.id, isActive: true } } },
            select: { date: true, slotStart: true, slotEnd: true },
            orderBy: { date: "desc" },
            take: 1,
          },
        },
        take: 10,
      }),
    ]);

    return { events, tasks };
  }),

  // Student: own feedback history
  myHistory: protectedProcedure.query(async ({ ctx }) => {
    const user = ctx.session.user;
    return ctx.db.feedback.findMany({
      where: { userId: user.id },
      include: {
        event: { select: { id: true, title: true, startDate: true } },
        task: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }),

  // Tutor: all feedbacks for an event
  forEvent: tutorProcedure
    .input(z.object({ eventId: z.string() }))
    .query(async ({ ctx, input }) => {
      const event = await ctx.db.event.findFirst({
        where: { id: input.eventId, structureId: ctx.session.user.structureId },
      });
      if (!event) throw new TRPCError({ code: "NOT_FOUND" });

      return ctx.db.feedback.findMany({
        where: { eventId: input.eventId },
        include: { user: { select: { id: true, name: true, username: true } } },
        orderBy: { createdAt: "desc" },
      });
    }),

  // Tutor: all feedbacks for a task
  forTask: tutorProcedure
    .input(z.object({ taskId: z.string() }))
    .query(async ({ ctx, input }) => {
      const task = await ctx.db.task.findFirst({
        where: { id: input.taskId, structureId: ctx.session.user.structureId },
      });
      if (!task) throw new TRPCError({ code: "NOT_FOUND" });

      return ctx.db.feedback.findMany({
        where: { taskId: input.taskId },
        include: { user: { select: { id: true, name: true, username: true } } },
        orderBy: { createdAt: "desc" },
      });
    }),
});
