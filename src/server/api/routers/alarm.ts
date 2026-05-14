import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, tutorProcedure } from "~/server/api/trpc";
import { ALARM_CONFIG } from "~/server/alarm-config";

type Db = Parameters<Parameters<typeof tutorProcedure.query>[0]>[0]["ctx"]["db"];

async function computeAlarms(db: Db, structureId: string): Promise<number> {
  const now = new Date();

  const students = await db.user.findMany({
    where: { structureId, role: "STUDENTE", deletedAt: null },
    select: { id: true },
  });

  const pastEventsLookback = new Date(now);
  pastEventsLookback.setDate(pastEventsLookback.getDate() - ALARM_CONFIG.eventParticipationLookbackDays);

  const pastEvents = await db.event.findMany({
    where: { structureId, endDate: { lt: now, gte: pastEventsLookback } },
    select: { id: true },
  });

  const candidates: {
    studentId: string;
    structureId: string;
    type: "INACTIVE" | "HIGH_ABANDONMENT" | "LOW_EVENT_PARTICIPATION";
    severity: "LOW" | "MEDIUM" | "HIGH";
    message: string;
  }[] = [];

  for (const student of students) {
    const inactiveCutoff = new Date(now);
    inactiveCutoff.setDate(inactiveCutoff.getDate() - ALARM_CONFIG.inactiveDays);

    const [lastEvent, lastSlot, lastFeedback] = await Promise.all([
      db.eventParticipant.findFirst({
        where: {
          userId: student.id,
          event: { structureId },
          createdAt: { gte: inactiveCutoff },
        },
      }),
      db.taskSlotOccupation.findFirst({
        where: {
          userId: student.id,
          action: "SUBSCRIBED",
          createdAt: { gte: inactiveCutoff },
          slot: { task: { structureId } },
        },
      }),
      db.feedback.findFirst({
        where: {
          userId: student.id,
          createdAt: { gte: inactiveCutoff },
          OR: [
            { event: { structureId } },
            { task: { structureId } },
          ],
        },
      }),
    ]);

    if (!lastEvent && !lastSlot && !lastFeedback) {
      candidates.push({
        studentId: student.id,
        structureId,
        type: "INACTIVE",
        severity: "MEDIUM",
        message: `Nessuna attività nelle ultime ${ALARM_CONFIG.inactiveDays} giorni.`,
      });
    }

    const abandonCutoff = new Date(now);
    abandonCutoff.setDate(abandonCutoff.getDate() - ALARM_CONFIG.abandonmentLookbackDays);

    const abandonCount = await db.taskSlotOccupation.count({
      where: {
        userId: student.id,
        action: "UNSUBSCRIBED",
        createdAt: { gte: abandonCutoff },
        slot: { task: { structureId } },
      },
    });

    if (abandonCount > ALARM_CONFIG.maxAbandonments) {
      candidates.push({
        studentId: student.id,
        structureId,
        type: "HIGH_ABANDONMENT",
        severity: "HIGH",
        message: `Ha abbandonato ${abandonCount} attività negli ultimi ${ALARM_CONFIG.abandonmentLookbackDays} giorni (soglia: ${ALARM_CONFIG.maxAbandonments}).`,
      });
    }

    if (pastEvents.length >= ALARM_CONFIG.minEventsForParticipationCheck) {
      const participated = await db.eventParticipant.count({
        where: { userId: student.id, eventId: { in: pastEvents.map((e) => e.id) } },
      });
      const rate = participated / pastEvents.length;
      if (rate < ALARM_CONFIG.minEventParticipationRate) {
        candidates.push({
          studentId: student.id,
          structureId,
          type: "LOW_EVENT_PARTICIPATION",
          severity: "LOW",
          message: `Partecipazione eventi: ${Math.round(rate * 100)}% (${participated}/${pastEvents.length} negli ultimi ${ALARM_CONFIG.eventParticipationLookbackDays} giorni).`,
        });
      }
    }
  }

  let created = 0;
  for (const alarm of candidates) {
    const existing = await db.studentAlarm.findFirst({
      where: { studentId: alarm.studentId, type: alarm.type, resolvedAt: null },
    });
    if (!existing) {
      await db.studentAlarm.create({ data: alarm });
      created++;
    }
  }
  return created;
}

export const alarmRouter = createTRPCRouter({
  list: tutorProcedure.query(async ({ ctx }) => {
    return ctx.db.studentAlarm.findMany({
      where: { structureId: ctx.session.user.structureId, resolvedAt: null },
      include: {
        student: { select: { id: true, name: true, username: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }),

  count: tutorProcedure.query(async ({ ctx }) => {
    return ctx.db.studentAlarm.count({
      where: { structureId: ctx.session.user.structureId, resolvedAt: null },
    });
  }),

  runCheck: tutorProcedure.mutation(async ({ ctx }) => {
    const created = await computeAlarms(ctx.db, ctx.session.user.structureId);
    return { created };
  }),

  resolve: tutorProcedure
    .input(z.object({ alarmId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const alarm = await ctx.db.studentAlarm.findFirst({
        where: { id: input.alarmId, structureId: ctx.session.user.structureId },
      });
      if (!alarm) throw new TRPCError({ code: "NOT_FOUND" });
      return ctx.db.studentAlarm.update({
        where: { id: input.alarmId },
        data: { resolvedAt: new Date(), resolvedById: ctx.session.user.id },
      });
    }),
});
