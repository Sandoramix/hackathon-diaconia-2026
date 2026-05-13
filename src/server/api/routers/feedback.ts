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
