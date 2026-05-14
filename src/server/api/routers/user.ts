import bcrypt from "bcryptjs";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { createTRPCRouter, protectedProcedure, tutorProcedure } from "~/server/api/trpc";

const passwordSchema = z.string().min(1, "Obbligatorio");

export const userRouter = createTRPCRouter({
  changePassword: protectedProcedure
    .input(
      z
        .object({
          password: passwordSchema,
          confirmPassword: z.string(),
        })
        .refine((d) => d.password === d.confirmPassword, {
          message: "Le password non coincidono",
          path: ["confirmPassword"],
        }),
    )
    .mutation(async ({ ctx, input }) => {
      const hashed = await bcrypt.hash(input.password, 12);
      await ctx.db.user.update({
        where: { id: ctx.session.user.id },
        data: { password: hashed, mustChangePassword: false },
      });
    }),

  // Any member: list tutors in own structure (students need this for chat)
  listTutors: protectedProcedure.query(async ({ ctx }) => {
    const structureId = ctx.session.user.structureId;
    if (!structureId) throw new TRPCError({ code: "FORBIDDEN" });
    return ctx.db.user.findMany({
      where: { structureId, role: "TUTOR", deletedAt: null },
      select: { id: true, name: true, username: true },
      orderBy: { username: "asc" },
    });
  }),

  // Tutor: list all non-deleted users in own structure
  list: tutorProcedure
    .input(
      z.object({
        role: z.enum(["STUDENTE", "TUTOR"]).optional(),
        includeDeleted: z.boolean().default(false),
      }),
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.user.findMany({
        where: {
          structureId: ctx.session.user.structureId,
          role: input.role,
          deletedAt: input.includeDeleted ? undefined : null,
        },
        select: {
          id: true,
          name: true,
          username: true,
          email: true,
          role: true,
          mustChangePassword: true,
          password: true,
          notes: true,
          familyContacts: true,
          deletedAt: true,
          createdAt: true,
        },
        orderBy: { username: "asc" },
      });
    }),

  // Tutor: get single user in own structure
  getById: tutorProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const user = await ctx.db.user.findFirst({
        where: { id: input.id, structureId: ctx.session.user.structureId },
        select: {
          id: true,
          name: true,
          username: true,
          email: true,
          role: true,
          mustChangePassword: true,
          password: true,
          notes: true,
          familyContacts: true,
          deletedAt: true,
          createdAt: true,
        },
      });
      if (!user) throw new TRPCError({ code: "NOT_FOUND" });
      return user;
    }),

  // Tutor: create single user
  create: tutorProcedure
    .input(
      z.object({
        username: z.string().min(3),
        password: z.string().min(1),
        role: z.enum(["STUDENTE", "TUTOR"]),
        name: z.string().optional(),
        email: z.string().email().optional(),
        notes: z.string().optional(),
        familyContacts: z.string().optional(),
        mustChangePassword: z.boolean().default(true),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.user.findUnique({ where: { username: input.username } });
      if (existing) throw new TRPCError({ code: "CONFLICT", message: "Username già in uso" });

      return ctx.db.user.create({
        data: {
          username: input.username,
          password: input.password,
          role: input.role,
          name: input.name,
          email: input.email,
          notes: input.notes,
          familyContacts: input.familyContacts,
          mustChangePassword: input.mustChangePassword,
          structureId: ctx.session.user.structureId,
          createdById: ctx.session.user.id,
        },
        select: { id: true, username: true, role: true },
      });
    }),

  // Tutor: bulk create students (N credentials on the fly)
  bulkCreate: tutorProcedure
    .input(
      z.object({
        prefix: z.string().min(1).max(20),
        count: z.number().int().min(1).max(100),
        passwordTemplate: z.string().min(1),
        mustChangePassword: z.boolean().default(true),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const users = Array.from({ length: input.count }, (_, i) => ({
        username: `${input.prefix}${String(i + 1).padStart(3, "0")}`,
        password: input.passwordTemplate,
        role: "STUDENTE" as const,
        mustChangePassword: input.mustChangePassword,
        structureId: ctx.session.user.structureId,
        createdById: ctx.session.user.id,
      }));
      await ctx.db.user.createMany({ data: users, skipDuplicates: true });
      return { created: users.length };
    }),

  // Tutor: update user in own structure
  update: tutorProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        email: z.string().email().optional().nullable(),
        notes: z.string().optional().nullable(),
        familyContacts: z.string().optional().nullable(),
        mustChangePassword: z.boolean().optional(),
        newPassword: z.string().min(1).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.findFirst({
        where: { id: input.id, structureId: ctx.session.user.structureId },
      });
      if (!user) throw new TRPCError({ code: "NOT_FOUND" });

      const data: Record<string, unknown> = {};
      if (input.name !== undefined) data.name = input.name;
      if (input.email !== undefined) data.email = input.email;
      if (input.notes !== undefined) data.notes = input.notes;
      if (input.familyContacts !== undefined) data.familyContacts = input.familyContacts;
      if (input.mustChangePassword !== undefined) data.mustChangePassword = input.mustChangePassword;
      if (input.newPassword) {
        data.password = input.newPassword;
        data.mustChangePassword = true;
      }

      return ctx.db.user.update({ where: { id: input.id }, data });
    }),

  // Tutor: soft delete
  softDelete: tutorProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.findFirst({
        where: { id: input.id, structureId: ctx.session.user.structureId },
      });
      if (!user) throw new TRPCError({ code: "NOT_FOUND" });
      return ctx.db.user.update({
        where: { id: input.id },
        data: { deletedAt: new Date() },
      });
    }),

  // Tutor: restore soft-deleted user
  restore: tutorProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.findFirst({
        where: { id: input.id, structureId: ctx.session.user.structureId },
      });
      if (!user) throw new TRPCError({ code: "NOT_FOUND" });
      return ctx.db.user.update({
        where: { id: input.id },
        data: { deletedAt: null },
      });
    }),
});
