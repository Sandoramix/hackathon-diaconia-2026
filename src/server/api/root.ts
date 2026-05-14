import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";
import { userRouter } from "~/server/api/routers/user";
import { structureRouter } from "~/server/api/routers/structure";
import { eventRouter } from "~/server/api/routers/event";
import { taskRouter } from "~/server/api/routers/task";
import { feedbackRouter } from "~/server/api/routers/feedback";
import { chatRouter } from "~/server/api/routers/chat";
import { historyRouter } from "~/server/api/routers/history";
import { alarmRouter } from "~/server/api/routers/alarm";
import { broadcastRouter } from "~/server/api/routers/broadcast";

export const appRouter = createTRPCRouter({
  user: userRouter,
  structure: structureRouter,
  event: eventRouter,
  task: taskRouter,
  feedback: feedbackRouter,
  chat: chatRouter,
  history: historyRouter,
  alarm: alarmRouter,
  broadcast: broadcastRouter,
});

export type AppRouter = typeof appRouter;
export const createCaller = createCallerFactory(appRouter);
