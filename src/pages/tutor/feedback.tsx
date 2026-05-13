import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { useEffect } from "react";
import { getDashboardLayout } from "~/layouts/DashboardLayout";
import type { NextPageWithLayout } from "../_app";
import { api } from "~/utils/api";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

const EMOJI_MAP: Record<number, string> = { 1: "😕", 2: "😐", 3: "😊" };

const TutorFeedbackPage: NextPageWithLayout = function TutorFeedbackPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [selectedTaskId, setSelectedTaskId] = useState<string>("");

  useEffect(() => {
    if (status === "unauthenticated") void router.replace("/auth/tipo");
    if (status === "authenticated" && session.user.role === "STUDENTE") {
      void router.replace("/studente");
    }
  }, [status, session, router]);

  const { data: events = [] } = api.event.list.useQuery(
    { upcoming: false },
    { enabled: status === "authenticated" },
  );
  const { data: tasks = [] } = api.task.list.useQuery(undefined, {
    enabled: status === "authenticated",
  });

  const { data: eventFeedbacks = [] } = api.feedback.forEvent.useQuery(
    { eventId: selectedEventId },
    { enabled: !!selectedEventId },
  );
  const { data: taskFeedbacks = [] } = api.feedback.forTask.useQuery(
    { taskId: selectedTaskId },
    { enabled: !!selectedTaskId },
  );

  if (status !== "authenticated") return null;

  const feedbackEvents = events.filter((e) => e.hasFeedback);
  const feedbackTasks = tasks.filter((t) => t.hasFeedback);

  return (
    <div className="space-y-4 max-w-3xl">
      <Tabs defaultValue="eventi">
        <TabsList>
          <TabsTrigger value="eventi">Feedback eventi</TabsTrigger>
          <TabsTrigger value="task">Feedback task</TabsTrigger>
        </TabsList>

        <TabsContent value="eventi" className="space-y-4">
          <Select value={selectedEventId} onValueChange={setSelectedEventId}>
            <SelectTrigger className="max-w-sm">
              <SelectValue placeholder="Seleziona evento..." />
            </SelectTrigger>
            <SelectContent>
              {feedbackEvents.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedEventId && (
            <FeedbackList feedbacks={eventFeedbacks} />
          )}
          {!selectedEventId && (
            <p className="py-8 text-center text-sm text-gray-500">
              Seleziona un evento con feedback abilitato
            </p>
          )}
        </TabsContent>

        <TabsContent value="task" className="space-y-4">
          <Select value={selectedTaskId} onValueChange={setSelectedTaskId}>
            <SelectTrigger className="max-w-sm">
              <SelectValue placeholder="Seleziona task..." />
            </SelectTrigger>
            <SelectContent>
              {feedbackTasks.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedTaskId && (
            <FeedbackList feedbacks={taskFeedbacks} />
          )}
          {!selectedTaskId && (
            <p className="py-8 text-center text-sm text-gray-500">
              Seleziona un task con feedback abilitato
            </p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

function FeedbackList({
  feedbacks,
}: {
  feedbacks: {
    id: string;
    emoji: number;
    text: string | null;
    createdAt: Date;
    user: { id: string; name: string | null; username: string };
  }[];
}) {
  if (feedbacks.length === 0) {
    return <p className="py-8 text-center text-sm text-gray-500">Nessun feedback</p>;
  }

  const avg = feedbacks.reduce((s, f) => s + f.emoji, 0) / feedbacks.length;

  return (
    <div className="space-y-3">
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-6">
            <div>
              <p className="text-3xl font-bold">{avg.toFixed(1)}</p>
              <p className="text-xs text-gray-500">Media</p>
            </div>
            <div className="flex gap-4">
              {[1, 2, 3].map((v) => (
                <div key={v} className="text-center">
                  <p className="text-xl">{EMOJI_MAP[v]}</p>
                  <p className="text-sm font-medium">
                    {feedbacks.filter((f) => f.emoji === v).length}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {feedbacks.map((fb) => (
        <Card key={fb.id}>
          <CardContent className="flex items-start gap-4 py-3">
            <span className="text-2xl">{EMOJI_MAP[fb.emoji] ?? "?"}</span>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {fb.user.name ?? fb.user.username}
                </Badge>
                <span className="text-xs text-gray-400">
                  {new Date(fb.createdAt).toLocaleDateString("it-IT")}
                </span>
              </div>
              {fb.text && (
                <p className="mt-1 text-sm text-gray-700">{fb.text}</p>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

TutorFeedbackPage.getLayout = getDashboardLayout("Feedback");

export default TutorFeedbackPage;
