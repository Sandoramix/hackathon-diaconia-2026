import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const chatRouter = createTRPCRouter({
  getOrCreate: protectedProcedure
    .input(z.object({ withUserId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const me = ctx.session.user;
      if (!me.structureId) throw new TRPCError({ code: "FORBIDDEN" });

      const other = await ctx.db.user.findFirst({
        where: { id: input.withUserId, structureId: me.structureId },
      });
      if (!other) throw new TRPCError({ code: "NOT_FOUND" });

      const studentId = me.role === "STUDENTE" ? me.id : other.id;
      const tutorId = me.role === "STUDENTE" ? other.id : me.id;

      return ctx.db.conversation.upsert({
        where: { studentId_tutorId: { studentId, tutorId } },
        create: { studentId, tutorId, structureId: me.structureId },
        update: {},
        include: {
          student: { select: { id: true, name: true, username: true } },
          tutor: { select: { id: true, name: true, username: true } },
        },
      });
    }),

  myConversations: protectedProcedure.query(async ({ ctx }) => {
    const me = ctx.session.user;
    if (!me.structureId) throw new TRPCError({ code: "FORBIDDEN" });

    const where =
      me.role === "STUDENTE"
        ? { studentId: me.id, structureId: me.structureId }
        : { tutorId: me.id, structureId: me.structureId };

    return ctx.db.conversation.findMany({
      where,
      include: {
        student: { select: { id: true, name: true, username: true } },
        tutor: { select: { id: true, name: true, username: true } },
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
        _count: {
          select: {
            messages: {
              where: { senderId: { not: me.id }, readAt: null },
            },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });
  }),

  hasUnread: protectedProcedure.query(async ({ ctx }) => {
    const me = ctx.session.user;
    if (!me.structureId || me.role !== "TUTOR") return false;
    const count = await ctx.db.chatMessage.count({
      where: {
        conversation: { tutorId: me.id, structureId: me.structureId },
        senderId: { not: me.id },
        readAt: null,
      },
    });
    return count > 0;
  }),

  messages: protectedProcedure
    .input(
      z.object({
        conversationId: z.string(),
        cursor: z.string().optional(),
        limit: z.number().int().min(1).max(100).default(50),
      }),
    )
    .query(async ({ ctx, input }) => {
      const me = ctx.session.user;
      if (!me.structureId) throw new TRPCError({ code: "FORBIDDEN" });

      const conversation = await ctx.db.conversation.findFirst({
        where: {
          id: input.conversationId,
          structureId: me.structureId,
          OR: [{ studentId: me.id }, { tutorId: me.id }],
        },
      });
      if (!conversation) throw new TRPCError({ code: "NOT_FOUND" });

      const messages = await ctx.db.chatMessage.findMany({
        where: {
          conversationId: input.conversationId,
          ...(input.cursor ? { createdAt: { lt: new Date(input.cursor) } } : {}),
        },
        include: { sender: { select: { id: true, name: true, username: true } } },
        orderBy: { createdAt: "desc" },
        take: input.limit,
      });

      return {
        messages: messages.reverse(),
        nextCursor:
          messages.length === input.limit ? messages[0]!.createdAt.toISOString() : null,
      };
    }),

  send: protectedProcedure
    .input(z.object({ conversationId: z.string(), text: z.string().min(1).max(2000) }))
    .mutation(async ({ ctx, input }) => {
      const me = ctx.session.user;
      if (!me.structureId) throw new TRPCError({ code: "FORBIDDEN" });

      const conversation = await ctx.db.conversation.findFirst({
        where: {
          id: input.conversationId,
          structureId: me.structureId,
          OR: [{ studentId: me.id }, { tutorId: me.id }],
        },
      });
      if (!conversation) throw new TRPCError({ code: "NOT_FOUND" });

      const [message] = await ctx.db.$transaction([
        ctx.db.chatMessage.create({
          data: { conversationId: input.conversationId, senderId: me.id, text: input.text },
          include: { sender: { select: { id: true, name: true, username: true } } },
        }),
        ctx.db.conversation.update({
          where: { id: input.conversationId },
          data: { updatedAt: new Date() },
        }),
      ]);

      return message;
    }),

  markRead: protectedProcedure
    .input(z.object({ conversationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const me = ctx.session.user;
      if (!me.structureId) throw new TRPCError({ code: "FORBIDDEN" });

      const conversation = await ctx.db.conversation.findFirst({
        where: {
          id: input.conversationId,
          structureId: me.structureId,
          OR: [{ studentId: me.id }, { tutorId: me.id }],
        },
      });
      if (!conversation) throw new TRPCError({ code: "NOT_FOUND" });

      return ctx.db.chatMessage.updateMany({
        where: {
          conversationId: input.conversationId,
          senderId: { not: me.id },
          readAt: null,
        },
        data: { readAt: new Date() },
      });
    }),
});
