import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { useEffect } from "react";
import { getDashboardLayout } from "~/layouts/DashboardLayout";
import type { NextPageWithLayout } from "../_app";
import { api } from "~/utils/api";
import { Card, CardContent } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Skeleton } from "~/components/ui/skeleton";

const EMOJI_MAP: Record<number, string> = { 1: "😕", 2: "😐", 3: "😊" };

const StudenteFeedbackPage: NextPageWithLayout = function StudenteFeedbackPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") void router.replace("/auth/tipo");
    if (status === "authenticated" && session.user.mustChangePassword) {
      void router.replace("/auth/cambio-password");
    }
  }, [status, session, router]);

  const { data: history = [], isLoading } = api.feedback.myHistory.useQuery(undefined, {
    enabled: status === "authenticated",
  });

  if (status !== "authenticated") return null;

  return (
    <div className="space-y-3 max-w-2xl">
      {isLoading && (
        <>
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </>
      )}
      {history.map((fb) => (
        <Card key={fb.id}>
          <CardContent className="flex items-start gap-4 py-3">
            <span className="text-3xl">{EMOJI_MAP[fb.emoji] ?? "?"}</span>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                {fb.event && (
                  <Badge variant="outline" className="text-xs">
                    📅 {fb.event.title}
                  </Badge>
                )}
                {fb.task && (
                  <Badge variant="outline" className="text-xs">
                    ✅ {fb.task.title}
                  </Badge>
                )}
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
      {!isLoading && history.length === 0 && (
        <p className="py-12 text-center text-sm text-gray-500">
          Nessun feedback ancora. Partecipa ad eventi o task per lasciare un feedback.
        </p>
      )}
    </div>
  );
};

StudenteFeedbackPage.getLayout = getDashboardLayout("I miei feedback");

export default StudenteFeedbackPage;
