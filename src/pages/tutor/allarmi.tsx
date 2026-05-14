import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { useEffect } from "react";
import { getDashboardLayout } from "~/layouts/DashboardLayout";
import type { NextPageWithLayout } from "../_app";
import { api } from "~/utils/api";
import { Card, CardContent } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Skeleton } from "~/components/ui/skeleton";
import { AlertTriangle, CheckCircle, MessageCircle, RefreshCw } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "~/lib/utils";

const SEVERITY_ORDER = { HIGH: 0, MEDIUM: 1, LOW: 2 } as const;

const SEVERITY_LABEL: Record<string, string> = {
  HIGH: "Alta",
  MEDIUM: "Media",
  LOW: "Bassa",
};

const TYPE_LABEL: Record<string, string> = {
  INACTIVE: "Inattività",
  HIGH_ABANDONMENT: "Alto abbandono",
  LOW_EVENT_PARTICIPATION: "Bassa partecipazione",
};

const SEVERITY_COLOR: Record<string, string> = {
  HIGH: "#ef4444",
  MEDIUM: "#f59e0b",
  LOW: "#6b7280",
};

const AllarmiPage: NextPageWithLayout = function AllarmiPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") void router.replace("/auth/tipo");
    if (status === "authenticated" && session.user.role === "STUDENTE") {
      void router.replace("/studente");
    }
  }, [status, session, router]);

  const { data: alarms, isLoading, refetch } = api.alarm.list.useQuery(undefined, {
    enabled: status === "authenticated",
    refetchInterval: 30000,
  });

  const runCheck = api.alarm.runCheck.useMutation({
    onSuccess: ({ created }) => {
      void refetch();
      toast.success(created > 0 ? `${created} nuovi allarmi rilevati` : "Nessun nuovo allarme");
    },
    onError: () => toast.error("Errore durante il controllo"),
  });

  const resolve = api.alarm.resolve.useMutation({
    onSuccess: () => {
      void refetch();
      toast.success("Allarme risolto");
    },
    onError: () => toast.error("Errore"),
  });

  useEffect(() => {
    if (status === "authenticated") runCheck.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  if (status !== "authenticated") return null;

  const sorted = [...(alarms ?? [])].sort(
    (a, b) =>
      (SEVERITY_ORDER[a.severity as keyof typeof SEVERITY_ORDER] ?? 2) -
      (SEVERITY_ORDER[b.severity as keyof typeof SEVERITY_ORDER] ?? 2),
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {isLoading ? "—" : `${sorted.length} allarmi attivi`}
        </p>
        <Button
          size="sm"
          variant="outline"
          onClick={() => runCheck.mutate()}
          disabled={runCheck.isPending}
          className="gap-1.5"
        >
          <RefreshCw
            className={cn("h-3.5 w-3.5", runCheck.isPending && "animate-spin")}
            aria-hidden="true"
          />
          Controlla ora
        </Button>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      )}

      {!isLoading && sorted.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12">
            <CheckCircle className="h-10 w-10 text-green-500" aria-hidden="true" />
            <p className="font-medium text-gray-700 dark:text-gray-300">Nessun allarme attivo</p>
            <p className="text-sm text-gray-500">Tutti gli studenti risultano attivi</p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {sorted.map((alarm) => (
          <Card
            key={alarm.id}
            className="border-l-4"
            style={{ borderLeftColor: SEVERITY_COLOR[alarm.severity] ?? "#6b7280" }}
          >
            <CardContent className="pt-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <AlertTriangle
                      className="h-4 w-4 shrink-0"
                      style={{ color: SEVERITY_COLOR[alarm.severity] }}
                      aria-hidden="true"
                    />
                    <span className="font-semibold text-sm">
                      {alarm.student.name ?? alarm.student.username}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {TYPE_LABEL[alarm.type] ?? alarm.type}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      Priorità {SEVERITY_LABEL[alarm.severity] ?? alarm.severity}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{alarm.message}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(alarm.createdAt).toLocaleString("it-IT")}
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button size="sm" variant="ghost" asChild aria-label="Apri chat con studente">
                    <Link href={`/tutor/chat?username=${alarm.student.username}`}>
                      <MessageCircle className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => resolve.mutate({ alarmId: alarm.id })}
                    disabled={resolve.isPending}
                  >
                    Risolvi
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

AllarmiPage.getLayout = getDashboardLayout("Allarmi");

export default AllarmiPage;
