import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { type PrismaClient } from "../../../../generated/prisma";
import { createTRPCRouter, protectedProcedure, tutorProcedure } from "~/server/api/trpc";

const eventInput = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  place: z.string().optional(),
  startDate: z.date(),
  endDate: z.date(),
  image: z.string().optional(),
  userLimit: z.number().int().positive().optional().nullable(),
  hasFeedback: z.boolean().default(false),
  tagNames: z.array(z.string().min(1)).default([]),
});

async function resolveOrCreateTags(db: PrismaClient, tagNames: string[]) {
  const tags: { id: string }[] = [];
  for (const name of tagNames) {
    const tag = await db.eventTag.upsert({
      where: { name },
      create: { name },
      update: {},
      select: { id: true },
    });
    tags.push(tag);
  }
  return tags;
}

export const eventRouter = createTRPCRouter({
  // List all tags for autocomplete (structure-scoped)
  listTags: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.eventTag.findMany({ orderBy: { name: "asc" } });
  }),

  // Search tags (for autocomplete)
  searchTags: protectedProcedure
    .input(z.object({ query: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.eventTag.findMany({
        where: { name: { contains: input.query, mode: "insensitive" } },
        take: 10,
        orderBy: { name: "asc" },
      });
    }),

  // List events (includes current user's registration status)
  list: protectedProcedure
    .input(
      z.object({
        upcoming: z.boolean().default(false),
        tagIds: z.array(z.string()).default([]),
      }),
    )
    .query(async ({ ctx, input }) => {
      const user = ctx.session.user;
      if (!user.structureId) throw new TRPCError({ code: "FORBIDDEN" });

      return ctx.db.event.findMany({
        where: {
          structureId: user.structureId,
          startDate: input.upcoming ? { gte: new Date() } : undefined,
          tags: input.tagIds.length ? { some: { id: { in: input.tagIds } } } : undefined,
        },
        include: {
          tags: true,
          _count: { select: { participants: true } },
          participants: { where: { userId: user.id }, select: { userId: true } },
        },
        orderBy: { startDate: "asc" },
      });
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const user = ctx.session.user;
      if (!user.structureId) throw new TRPCError({ code: "FORBIDDEN" });

      const event = await ctx.db.event.findFirst({
        where: { id: input.id, structureId: user.structureId },
        include: {
          tags: true,
          participants: user.role !== "STUDENTE"
            ? { include: { user: { select: { id: true, name: true, username: true } } } }
            : { where: { userId: user.id } },
          _count: { select: { participants: true } },
        },
      });
      if (!event) throw new TRPCError({ code: "NOT_FOUND" });
      return event;
    }),

  create: tutorProcedure
    .input(eventInput)
    .mutation(async ({ ctx, input }) => {
      const { tagNames, ...rest } = input;
      const tags = await resolveOrCreateTags(ctx.db, tagNames);
      return ctx.db.event.create({
        data: {
          ...rest,
          structureId: ctx.session.user.structureId,
          tags: { connect: tags },
        },
        include: { tags: true },
      });
    }),

  update: tutorProcedure
    .input(eventInput.extend({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { id, tagNames, ...rest } = input;
      const event = await ctx.db.event.findFirst({
        where: { id, structureId: ctx.session.user.structureId },
      });
      if (!event) throw new TRPCError({ code: "NOT_FOUND" });

      const tags = await resolveOrCreateTags(ctx.db, tagNames);
      return ctx.db.event.update({
        where: { id },
        data: { ...rest, tags: { set: tags } },
        include: { tags: true },
      });
    }),

  delete: tutorProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const event = await ctx.db.event.findFirst({
        where: { id: input.id, structureId: ctx.session.user.structureId },
      });
      if (!event) throw new TRPCError({ code: "NOT_FOUND" });
      return ctx.db.event.delete({ where: { id: input.id } });
    }),

  // Tutor: manually assign/remove participant
  assignParticipant: tutorProcedure
    .input(z.object({ eventId: z.string(), userId: z.string(), assign: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const event = await ctx.db.event.findFirst({
        where: { id: input.eventId, structureId: ctx.session.user.structureId },
        include: { _count: { select: { participants: true } } },
      });
      if (!event) throw new TRPCError({ code: "NOT_FOUND" });

      if (input.assign) {
        if (event.userLimit && event._count.participants >= event.userLimit) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Evento al completo" });
        }
        return ctx.db.eventParticipant.upsert({
          where: { eventId_userId: { eventId: input.eventId, userId: input.userId } },
          create: { eventId: input.eventId, userId: input.userId },
          update: {},
        });
      } else {
        return ctx.db.eventParticipant.deleteMany({
          where: { eventId: input.eventId, userId: input.userId },
        });
      }
    }),

  // Student: register/unregister self
  toggleRegistration: protectedProcedure
    .input(z.object({ eventId: z.string(), register: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const user = ctx.session.user;
      if (user.role !== "STUDENTE") throw new TRPCError({ code: "FORBIDDEN" });
      if (!user.structureId) throw new TRPCError({ code: "FORBIDDEN" });

      const event = await ctx.db.event.findFirst({
        where: { id: input.eventId, structureId: user.structureId },
        include: { _count: { select: { participants: true } } },
      });
      if (!event) throw new TRPCError({ code: "NOT_FOUND" });

      if (input.register) {
        if (event.userLimit && event._count.participants >= event.userLimit) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Evento al completo" });
        }
        return ctx.db.eventParticipant.upsert({
          where: { eventId_userId: { eventId: input.eventId, userId: user.id } },
          create: { eventId: input.eventId, userId: user.id },
          update: {},
        });
      } else {
        return ctx.db.eventParticipant.deleteMany({
          where: { eventId: input.eventId, userId: user.id },
        });
      }
    }),
});
