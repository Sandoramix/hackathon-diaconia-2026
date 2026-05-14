import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, tutorProcedure } from "~/server/api/trpc";

export const broadcastRouter = createTRPCRouter({
  create: tutorProcedure
    .input(z.object({
      title: z.string().min(1, "Obbligatorio").max(200),
      body: z.string().min(1, "Obbligatorio").max(5000),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.broadcast.create({
        data: {
          title: input.title,
          body: input.body,
          authorId: ctx.session.user.id,
          structureId: ctx.session.user.structureId,
        },
      });
    }),

  list: tutorProcedure.query(async ({ ctx }) => {
    const [broadcasts, totalStudents] = await Promise.all([
      ctx.db.broadcast.findMany({
        where: { structureId: ctx.session.user.structureId },
        include: {
          author: { select: { name: true, username: true } },
          reads: {
            include: {
              student: { select: { id: true, name: true, username: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      ctx.db.user.count({
        where: {
          structureId: ctx.session.user.structureId,
          role: "STUDENTE",
          deletedAt: null,
        },
      }),
    ]);

    return broadcasts.map((b) => ({
      ...b,
      readCount: b.reads.length,
      totalStudents,
      unreadCount: Math.max(0, totalStudents - b.reads.length),
    }));
  }),

  delete: tutorProcedure
    .input(z.object({ broadcastId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const broadcast = await ctx.db.broadcast.findFirst({
        where: { id: input.broadcastId, structureId: ctx.session.user.structureId },
      });
      if (!broadcast) throw new TRPCError({ code: "NOT_FOUND" });
      return ctx.db.broadcast.delete({ where: { id: input.broadcastId } });
    }),

  listForStudent: protectedProcedure.query(async ({ ctx }) => {
    const user = ctx.session.user;
    if (!user.structureId) throw new TRPCError({ code: "FORBIDDEN" });
    if (user.role !== "STUDENTE") throw new TRPCError({ code: "FORBIDDEN" });

    const broadcasts = await ctx.db.broadcast.findMany({
      where: { structureId: user.structureId },
      include: {
        reads: {
          where: { studentId: user.id },
          select: { readAt: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return broadcasts.map((b) => ({
      id: b.id,
      title: b.title,
      body: b.body,
      createdAt: b.createdAt,
      isRead: b.reads.length > 0,
      readAt: b.reads[0]?.readAt ?? null,
    }));
  }),

  markRead: protectedProcedure
    .input(z.object({ broadcastId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const user = ctx.session.user;
      if (!user.structureId) throw new TRPCError({ code: "FORBIDDEN" });
      if (user.role !== "STUDENTE") throw new TRPCError({ code: "FORBIDDEN" });

      const broadcast = await ctx.db.broadcast.findFirst({
        where: { id: input.broadcastId, structureId: user.structureId },
      });
      if (!broadcast) throw new TRPCError({ code: "NOT_FOUND" });

      return ctx.db.broadcastRead.upsert({
        where: {
          broadcastId_studentId: { broadcastId: input.broadcastId, studentId: user.id },
        },
        create: { broadcastId: input.broadcastId, studentId: user.id },
        update: {},
      });
    }),

  hasUnread: protectedProcedure.query(async ({ ctx }) => {
    const user = ctx.session.user;
    if (!user.structureId || user.role !== "STUDENTE") return false;

    const [total, read] = await Promise.all([
      ctx.db.broadcast.count({ where: { structureId: user.structureId } }),
      ctx.db.broadcastRead.count({
        where: { studentId: user.id, broadcast: { structureId: user.structureId } },
      }),
    ]);

    return read < total;
  }),
});
