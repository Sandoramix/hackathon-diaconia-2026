import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, tutorProcedure } from "~/server/api/trpc";

export const structureRouter = createTRPCRouter({
  // Any member: get own structure with rules
  get: protectedProcedure.query(async ({ ctx }) => {
    const structureId = ctx.session.user.structureId;
    if (!structureId) throw new TRPCError({ code: "FORBIDDEN", message: "No structure assigned" });
    return ctx.db.structure.findUniqueOrThrow({
      where: { id: structureId },
      include: { rules: { orderBy: { order: "asc" } } },
    });
  }),

  // Admin: list all structures
  list: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.session.user.role !== "ADMIN") {
      throw new TRPCError({ code: "FORBIDDEN" });
    }
    return ctx.db.structure.findMany({ orderBy: { name: "asc" } });
  }),

  create: protectedProcedure
    .input(z.object({ name: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.session.user.role !== "ADMIN") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return ctx.db.structure.create({ data: { name: input.name } });
    }),

  update: protectedProcedure
    .input(z.object({ id: z.string(), name: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.session.user.role !== "ADMIN") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return ctx.db.structure.update({
        where: { id: input.id },
        data: { name: input.name },
      });
    }),

  // Rules CRUD (tutor manages rules of own structure)
  upsertRule: tutorProcedure
    .input(
      z.object({
        id: z.string().optional(),
        icon: z.string().min(1),
        text: z.string().min(1),
        order: z.number().int().default(0),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const structureId = ctx.session.user.structureId;
      if (input.id) {
        const existing = await ctx.db.rule.findUnique({ where: { id: input.id } });
        if (!existing || existing.structureId !== structureId) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        return ctx.db.rule.update({
          where: { id: input.id },
          data: { icon: input.icon, text: input.text, order: input.order },
        });
      }
      return ctx.db.rule.create({
        data: { icon: input.icon, text: input.text, order: input.order, structureId },
      });
    }),

  deleteRule: tutorProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.rule.findUnique({ where: { id: input.id } });
      if (!existing || existing.structureId !== ctx.session.user.structureId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return ctx.db.rule.delete({ where: { id: input.id } });
    }),

  moveRule: tutorProcedure
    .input(z.object({ id: z.string(), direction: z.enum(["up", "down"]) }))
    .mutation(async ({ ctx, input }) => {
      const structureId = ctx.session.user.structureId;
      const rules = await ctx.db.rule.findMany({
        where: { structureId },
        orderBy: { order: "asc" },
      });
      const idx = rules.findIndex((r) => r.id === input.id);
      if (idx === -1) throw new TRPCError({ code: "NOT_FOUND" });
      const swapIdx = input.direction === "up" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= rules.length) return;
      const ruleA = rules[idx]!;
      const ruleB = rules[swapIdx]!;
      await ctx.db.rule.update({ where: { id: ruleA.id }, data: { order: ruleB.order } });
      await ctx.db.rule.update({ where: { id: ruleB.id }, data: { order: ruleA.order } });
    }),
});
