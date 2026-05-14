import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { useEffect } from "react";
import { getDashboardLayout } from "~/layouts/DashboardLayout";
import type { NextPageWithLayout } from "../_app";
import { api } from "~/utils/api";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Skeleton } from "~/components/ui/skeleton";
import Link from "next/link";
import { Button } from "~/components/ui/button";
import { ChevronRight } from "lucide-react";
import { RenderIcon } from "~/components/RenderIcon";

const StudenteHome: NextPageWithLayout = function StudenteHome() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") void router.replace("/auth/tipo");
    if (status === "authenticated" && session.user.mustChangePassword) {
      void router.replace("/auth/cambio-password");
    }
    if (status === "authenticated" && session.user.role !== "STUDENTE") {
      void router.replace("/tutor");
    }
  }, [status, session, router]);

  const { data: events = [], isLoading: eventsLoading } = api.event.list.useQuery(
    { upcoming: true },
    { enabled: status === "authenticated" },
  );
  const { data: tasks = [], isLoading: tasksLoading } = api.task.list.useQuery(undefined, {
    enabled: status === "authenticated",
  });
  const { data: structure } = api.structure.get.useQuery(undefined, {
    enabled: status === "authenticated",
  });

  if (status !== "authenticated") return null;

  return (
    <div className="space-y-6">
      {structure && (
        <Link href="/studente/regole" className="block group" aria-label="Vai alle regole della struttura">
          <Card className="cursor-pointer transition-colors hover:border-blue-200 dark:hover:border-blue-700 group-focus-visible:ring-2 group-focus-visible:ring-blue-500">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">Regole — {structure.name}</CardTitle>
              <ChevronRight className="h-5 w-5 text-gray-400 shrink-0" aria-hidden="true" />
            </CardHeader>
            <CardContent className="space-y-2">
              {structure.rules.length === 0 && (
                <p className="text-sm text-gray-500">Nessuna regola</p>
              )}
              {structure.rules.slice(0, 3).map((r) => (
                <div key={r.id} className="flex items-start gap-2 text-sm">
                  <RenderIcon icon={r.icon} className="h-5 w-5 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{r.text}</span>
                </div>
              ))}
              {structure.rules.length > 3 && (
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  Vedi tutte le {structure.rules.length} regole →
                </p>
              )}
            </CardContent>
          </Card>
        </Link>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Prossimi eventi</CardTitle>
            <Button asChild size="sm" variant="ghost">
              <Link href="/studente/eventi">Vedi tutti</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {eventsLoading && <Skeleton className="h-10 w-full" />}
            {events.slice(0, 4).map((e) => (
              <div key={e.id} className="flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium">{e.title}</p>
                  {e.place && <p className="text-xs text-gray-500">📍 {e.place}</p>}
                </div>
                <span className="text-xs text-gray-500">
                  {new Date(e.startDate).toLocaleDateString("it-IT")}
                </span>
              </div>
            ))}
            {!eventsLoading && events.length === 0 && (
              <p className="text-sm text-gray-500">Nessun evento in programma</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Task disponibili</CardTitle>
            <Button asChild size="sm" variant="ghost">
              <Link href="/studente/task">Vedi tutti</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {tasksLoading && <Skeleton className="h-10 w-full" />}
            {tasks.slice(0, 4).map((t) => (
              <div key={t.id} className="flex items-center justify-between text-sm">
                <p className="font-medium">{t.title}</p>
                <Badge variant="outline" className="text-xs">
                  {t.slots.length} slot
                </Badge>
              </div>
            ))}
            {!tasksLoading && tasks.length === 0 && (
              <p className="text-sm text-gray-500">Nessun task disponibile</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

StudenteHome.getLayout = getDashboardLayout("Home");

export default StudenteHome;
