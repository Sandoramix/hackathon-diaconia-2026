import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";
import { userRouter } from "~/server/api/routers/user";
import { structureRouter } from "~/server/api/routers/structure";
import { eventRouter } from "~/server/api/routers/event";
import { taskRouter } from "~/server/api/routers/task";
import { feedbackRouter } from "~/server/api/routers/feedback";
import { chatRouter } from "~/server/api/routers/chat";

export const appRouter = createTRPCRouter({
  user: userRouter,
  structure: structureRouter,
  event: eventRouter,
  task: taskRouter,
  feedback: feedbackRouter,
  chat: chatRouter,
});

export type AppRouter = typeof appRouter;
export const createCaller = createCallerFactory(appRouter);
