import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { useEffect, useRef } from "react";
import { getDashboardLayout } from "~/layouts/DashboardLayout";
import type { NextPageWithLayout } from "../_app";
import { api } from "~/utils/api";
import { Card, CardContent } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Skeleton } from "~/components/ui/skeleton";
import { Bell } from "lucide-react";

const ComunicazioniPage: NextPageWithLayout = function ComunicazioniPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const markedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (status === "unauthenticated") void router.replace("/auth/tipo");
    if (status === "authenticated" && session.user.role !== "STUDENTE") {
      void router.replace("/tutor");
    }
  }, [status, session, router]);

  const { data: broadcasts, isLoading } = api.broadcast.listForStudent.useQuery(undefined, {
    enabled: status === "authenticated",
  });

  const utils = api.useUtils();
  const markRead = api.broadcast.markRead.useMutation({
    onSuccess: () => {
      void utils.broadcast.hasUnread.invalidate();
    },
  });

  useEffect(() => {
    if (!broadcasts) return;
    for (const b of broadcasts) {
      if (!b.isRead && !markedRef.current.has(b.id)) {
        markedRef.current.add(b.id);
        markRead.mutate({ broadcastId: b.id });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [broadcasts]);

  if (status !== "authenticated") return null;

  return (
    <div className="space-y-4">
      {isLoading && [1, 2, 3].map((i) => <Skeleton key={i} className="h-28 w-full" />)}

      {!isLoading && broadcasts?.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <Bell className="h-10 w-10 text-gray-300" aria-hidden="true" />
          <p className="font-medium text-gray-500">Nessuna comunicazione</p>
          <p className="text-sm text-gray-400">Il tutor non ha ancora inviato comunicazioni</p>
        </div>
      )}

      {broadcasts?.map((b) => (
        <Card
          key={b.id}
          className={b.isRead ? "" : "border-blue-400 dark:border-blue-600"}
        >
          <CardContent className="pt-4">
            <div className="flex items-start justify-between gap-2 mb-2">
              <p className="font-semibold text-sm leading-snug">{b.title}</p>
              {!b.isRead && (
                <Badge className="text-xs shrink-0 bg-blue-500 hover:bg-blue-500">Nuovo</Badge>
              )}
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
              {b.body}
            </p>
            <p className="text-xs text-gray-400 mt-2">
              {new Date(b.createdAt).toLocaleString("it-IT")}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

ComunicazioniPage.getLayout = getDashboardLayout("Comunicazioni");

export default ComunicazioniPage;
