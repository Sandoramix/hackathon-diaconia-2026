import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, tutorProcedure } from "~/server/api/trpc";

const ACTIVITY_TYPES = ["event", "slot", "task_complete", "feedback", "note"] as const;
type ActivityType = (typeof ACTIVITY_TYPES)[number];

export interface ActivityEntry {
  id: string;
  date: Date;
  type: ActivityType;
  title: string;
  description: string;
  meta?: Record<string, unknown>;
}

async function buildHistory(
  db: Parameters<Parameters<typeof tutorProcedure.query>[0]>[0]["ctx"]["db"],
  studentId: string,
  filters: {
    type?: ActivityType;
    dateFrom?: Date;
    dateTo?: Date;
  },
  cursor: Date | null,
  limit: number,
): Promise<{ entries: ActivityEntry[]; nextCursor: Date | null }> {
  const dateFilter = {
    ...(filters.dateFrom ? { gte: filters.dateFrom } : {}),
    ...(filters.dateTo ? { lte: filters.dateTo } : {}),
    ...(cursor ? { lt: cursor } : {}),
  };

  const fetch = filters.type;

  const [events, slots, completions, feedbacks, notes] = await Promise.all([
    // Event participations
    fetch && fetch !== "event" ? [] : db.eventParticipant.findMany({
      where: { userId: studentId, ...(Object.keys(dateFilter).length ? { createdAt: dateFilter } : {}) },
      include: { event: { select: { title: true, startDate: true, place: true } } },
      orderBy: { createdAt: "desc" },
      take: limit * 3,
    }),

    // Task slot occupations (SUBSCRIBED only for history)
    fetch && fetch !== "slot" ? [] : db.taskSlotOccupation.findMany({
      where: { userId: studentId, action: "SUBSCRIBED", ...(Object.keys(dateFilter).length ? { createdAt: dateFilter } : {}) },
      include: { slot: { include: { task: { select: { title: true } } } } },
      orderBy: { createdAt: "desc" },
      take: limit * 3,
    }),

    // Task completions
    fetch && fetch !== "task_complete" ? [] : db.taskCompletion.findMany({
      where: { userId: studentId, ...(Object.keys(dateFilter).length ? { completedAt: dateFilter } : {}) },
      include: { task: { select: { title: true, description: true } } },
      orderBy: { completedAt: "desc" },
      take: limit * 3,
    }),

    // Feedbacks
    fetch && fetch !== "feedback" ? [] : db.feedback.findMany({
      where: { userId: studentId, ...(Object.keys(dateFilter).length ? { createdAt: dateFilter } : {}) },
      include: {
        event: { select: { title: true } },
        task: { select: { title: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit * 3,
    }),

    // Tutor notes
    fetch && fetch !== "note" ? [] : db.studentActivityNote.findMany({
      where: { studentId, ...(Object.keys(dateFilter).length ? { createdAt: dateFilter } : {}) },
      include: { tutor: { select: { name: true, username: true } } },
      orderBy: { createdAt: "desc" },
      take: limit * 3,
    }),
  ]);

  const all: ActivityEntry[] = [
    ...(events as { id: string; createdAt: Date; event: { title: string; startDate: Date; place: string | null } }[]).map((e) => ({
      id: `event-${e.id}`,
      date: e.createdAt,
      type: "event" as const,
      title: e.event.title,
      description: `Iscrizione all'evento${e.event.place ? ` · ${e.event.place}` : ""}`,
      meta: { eventDate: e.event.startDate },
    })),

    ...(slots as { id: string; createdAt: Date; slot: { date: Date; task: { title: string } } }[]).map((o) => ({
      id: `slot-${o.id}`,
      date: o.createdAt,
      type: "slot" as const,
      title: o.slot.task.title,
      description: `Prenotazione slot · ${new Date(o.slot.date).toLocaleString("it-IT")}`,
    })),

    ...(completions as { id: string; completedAt: Date; task: { title: string; description: string | null } }[]).map((c) => ({
      id: `complete-${c.id}`,
      date: c.completedAt,
      type: "task_complete" as const,
      title: c.task.title,
      description: c.task.description ?? "Task completato manualmente",
    })),

    ...(feedbacks as { id: string; createdAt: Date; emoji: number; text: string | null; event: { title: string } | null; task: { title: string } | null }[]).map((f) => ({
      id: `feedback-${f.id}`,
      date: f.createdAt,
      type: "feedback" as const,
      title: f.event?.title ?? f.task?.title ?? "Feedback",
      description: `Valutazione: ${"⭐".repeat(f.emoji)}${f.text ? ` · ${f.text}` : ""}`,
    })),

    ...(notes as { id: string; createdAt: Date; content: string; tutor: { name: string | null; username: string } }[]).map((n) => ({
      id: `note-${n.id}`,
      date: n.createdAt,
      type: "note" as const,
      title: "Nota tutor",
      description: n.content,
      meta: { tutorName: n.tutor.name ?? n.tutor.username, noteId: n.id },
    })),
  ];

  // Sort descending by date, take cursor page
  const sorted = all.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, limit);
  const nextCursor = sorted.length === limit ? sorted[sorted.length - 1]!.date : null;

  return { entries: sorted, nextCursor };
}

export const historyRouter = createTRPCRouter({
  // Student: own history — past events attended + past slots occupied + completable tasks done
  mine: protectedProcedure
    .input(z.object({
      type: z.enum(["event", "slot", "task_complete"] as const).optional(),
      dateFrom: z.date().optional(),
      dateTo: z.date().optional(),
      cursor: z.date().optional(),
      limit: z.number().int().min(1).max(50).default(20),
    }))
    .query(async ({ ctx, input }) => {
      const user = ctx.session.user;
      if (!user.structureId) throw new TRPCError({ code: "FORBIDDEN" });

      const now = new Date();
      const dateFilter: Record<string, Date> = {};
      if (input.dateFrom) dateFilter.gte = input.dateFrom;
      if (input.dateTo) dateFilter.lte = input.dateTo;
      if (input.cursor) dateFilter.lt = input.cursor;

      const fetch = input.type;

      const [participations, slots, completions] = await Promise.all([
        fetch && fetch !== "event" ? [] : ctx.db.eventParticipant.findMany({
          where: {
            userId: user.id,
            event: {
              structureId: user.structureId,
              endDate: { lt: now },
              ...(Object.keys(dateFilter).length ? { startDate: dateFilter } : {}),
            },
          },
          include: {
            event: { select: { id: true, title: true, startDate: true, endDate: true, place: true } },
          },
          orderBy: { createdAt: "desc" },
          take: input.limit * 3,
        }),

        fetch && fetch !== "slot" ? [] : ctx.db.taskSlotOccupation.findMany({
          where: {
            userId: user.id,
            isActive: true,
            slot: {
              date: { lt: now },
              task: { structureId: user.structureId },
              ...(Object.keys(dateFilter).length ? { date: { lt: now, ...dateFilter } } : {}),
            },
          },
          include: {
            slot: {
              select: {
                date: true, slotStart: true, slotEnd: true,
                task: { select: { title: true } },
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: input.limit * 3,
        }),

        fetch && fetch !== "task_complete" ? [] : ctx.db.taskCompletion.findMany({
          where: {
            userId: user.id,
            task: { structureId: user.structureId },
            ...(Object.keys(dateFilter).length ? { completedAt: dateFilter } : {}),
          },
          include: { task: { select: { title: true, description: true } } },
          orderBy: { completedAt: "desc" },
          take: input.limit * 3,
        }),
      ]);

      const all: ActivityEntry[] = [
        ...(participations as { id: string; event: { id: string; title: string; startDate: Date; endDate: Date; place: string | null } }[]).map((p) => ({
          id: `event-${p.id}`,
          date: p.event.startDate,
          type: "event" as const,
          title: p.event.title,
          description: `${p.event.place ? `📍 ${p.event.place}` : "Evento completato"}`,
        })),

        ...(slots as { id: string; createdAt: Date; slot: { date: Date; slotStart: Date | null; slotEnd: Date | null; task: { title: string } } }[]).map((o) => {
          const timeLabel = o.slot.slotStart && o.slot.slotEnd
            ? `${new Date(o.slot.slotStart).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}–${new Date(o.slot.slotEnd).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}`
            : new Date(o.slot.date).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
          return {
            id: `slot-${o.id}`,
            date: o.slot.slotStart ?? o.slot.date,
            type: "slot" as const,
            title: o.slot.task.title,
            description: `Slot completato · ${timeLabel}`,
          };
        }),

        ...(completions as { id: string; completedAt: Date; task: { title: string; description: string | null } }[]).map((c) => ({
          id: `complete-${c.id}`,
          date: c.completedAt,
          type: "task_complete" as const,
          title: c.task.title,
          description: c.task.description ?? "Task completato",
        })),
      ];

      const sorted = all.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, input.limit);
      const nextCursor = all.length > input.limit ? sorted[sorted.length - 1]!.date : null;
      return { entries: sorted, nextCursor };
    }),

  // Tutor: history for a specific student
  forStudent: tutorProcedure
    .input(z.object({
      studentId: z.string(),
      type: z.enum(ACTIVITY_TYPES).optional(),
      dateFrom: z.date().optional(),
      dateTo: z.date().optional(),
      cursor: z.date().optional(),
      limit: z.number().int().min(1).max(50).default(20),
    }))
    .query(async ({ ctx, input }) => {
      const student = await ctx.db.user.findFirst({
        where: { id: input.studentId, structureId: ctx.session.user.structureId },
        select: { id: true, name: true, username: true },
      });
      if (!student) throw new TRPCError({ code: "NOT_FOUND" });

      const history = await buildHistory(ctx.db, input.studentId, { type: input.type, dateFrom: input.dateFrom, dateTo: input.dateTo }, input.cursor ?? null, input.limit);
      return { ...history, student };
    }),

  // Tutor: full history export (no pagination, respects type/date filters)
  exportForStudent: tutorProcedure
    .input(z.object({
      studentId: z.string(),
      type: z.enum(ACTIVITY_TYPES).optional(),
      dateFrom: z.date().optional(),
      dateTo: z.date().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const student = await ctx.db.user.findFirst({
        where: { id: input.studentId, structureId: ctx.session.user.structureId },
        select: { id: true, name: true, username: true },
      });
      if (!student) throw new TRPCError({ code: "NOT_FOUND" });

      const history = await buildHistory(
        ctx.db,
        input.studentId,
        { type: input.type, dateFrom: input.dateFrom, dateTo: input.dateTo },
        null,
        2000,
      );
      return { entries: history.entries, student };
    }),

  // Tutor: add note to student
  addNote: tutorProcedure
    .input(z.object({ studentId: z.string(), content: z.string().min(1).max(2000) }))
    .mutation(async ({ ctx, input }) => {
      const student = await ctx.db.user.findFirst({
        where: { id: input.studentId, structureId: ctx.session.user.structureId },
      });
      if (!student) throw new TRPCError({ code: "NOT_FOUND" });

      return ctx.db.studentActivityNote.create({
        data: {
          content: input.content,
          tutorId: ctx.session.user.id,
          studentId: input.studentId,
          structureId: ctx.session.user.structureId,
        },
      });
    }),

  // Tutor: delete own note
  deleteNote: tutorProcedure
    .input(z.object({ noteId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const note = await ctx.db.studentActivityNote.findFirst({
        where: { id: input.noteId, tutorId: ctx.session.user.id },
      });
      if (!note) throw new TRPCError({ code: "NOT_FOUND" });
      return ctx.db.studentActivityNote.delete({ where: { id: input.noteId } });
    }),
});
