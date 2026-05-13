import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { useEffect, type ReactNode } from "react";
import Link from "next/link";
import { getDashboardLayout } from "~/layouts/DashboardLayout";
import type { NextPageWithLayout } from "../_app";
import { api } from "~/utils/api";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import { Button } from "~/components/ui/button";
import { ChevronRight } from "lucide-react";

const TutorDashboard: NextPageWithLayout = function TutorDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") void router.replace("/auth/tipo");
    if (status === "authenticated" && session.user.role === "STUDENTE") {
      void router.replace("/studente");
    }
  }, [status, session, router]);

  const users = api.user.list.useQuery(
    { role: undefined },
    { enabled: status === "authenticated" },
  );
  const events = api.event.list.useQuery(
    { upcoming: false },
    { enabled: status === "authenticated" },
  );
  const tasks = api.task.list.useQuery(undefined, { enabled: status === "authenticated" });
  const structure = api.structure.get.useQuery(undefined, { enabled: status === "authenticated" });

  if (status !== "authenticated") return null;

  const studentCount = users.data?.filter((u) => u.role === "STUDENTE" && !u.deletedAt).length ?? 0;
  const tutorCount = users.data?.filter((u) => u.role === "TUTOR" && !u.deletedAt).length ?? 0;
  const upcomingEvents = events.data?.filter((e) => new Date(e.startDate) >= new Date()).length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          Struttura:{" "}
          <span className="font-medium text-gray-800">
            {structure.data?.name ?? "—"}
          </span>
        </p>
        <div className="flex gap-2">
          <Button asChild size="sm" variant="outline">
            <Link href="/tutor/feedback">⭐ Feedback</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/tutor/regole">📋 Regole</Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Studenti" value={studentCount} loading={users.isLoading} icon="👤" />
        <StatCard label="Tutor" value={tutorCount} loading={users.isLoading} icon="🎓" />
        <StatCard label="Eventi futuri" value={upcomingEvents} loading={events.isLoading} icon="📅" />
        <StatCard label="Task attivi" value={tasks.data?.length ?? 0} loading={tasks.isLoading} icon="✅" />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Prossimi eventi</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {events.isLoading && <Skeleton className="h-8 w-full" />}
            {events.data
              ?.filter((e) => new Date(e.startDate) >= new Date())
              .slice(0, 5)
              .map((e) => (
                <div key={e.id} className="flex items-center justify-between text-sm">
                  <span className="font-medium">{e.title}</span>
                  <span className="text-gray-500">
                    {new Date(e.startDate).toLocaleDateString("it-IT")}
                  </span>
                </div>
              ))}
            {events.data?.filter((e) => new Date(e.startDate) >= new Date()).length === 0 && (
              <p className="text-sm text-gray-500">Nessun evento in programma</p>
            )}
          </CardContent>
        </Card>

        <Link href="/tutor/regole" className="block group" aria-label="Vai alle regole struttura">
          <Card className="cursor-pointer transition-colors hover:border-blue-200 dark:hover:border-blue-700 group-focus-visible:ring-2 group-focus-visible:ring-blue-500">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Regole struttura</CardTitle>
              <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" aria-hidden="true" />
            </CardHeader>
            <CardContent className="space-y-2">
              {structure.isLoading && <Skeleton className="h-8 w-full" />}
              {structure.data?.rules.slice(0, 3).map((r) => (
                <div key={r.id} className="flex items-start gap-2 text-sm">
                  <span aria-hidden="true">{r.icon}</span>
                  <span>{r.text}</span>
                </div>
              ))}
              {(structure.data?.rules.length ?? 0) > 3 && (
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  +{(structure.data?.rules.length ?? 0) - 3} altre regole…
                </p>
              )}
              {structure.data?.rules.length === 0 && (
                <p className="text-sm text-gray-500">Nessuna regola definita</p>
              )}
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
};

function StatCard({
  label,
  value,
  loading,
  icon,
}: {
  label: string;
  value: number;
  loading: boolean;
  icon: string;
}) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{icon}</span>
          <div>
            {loading ? (
              <Skeleton className="h-6 w-12" />
            ) : (
              <p className="text-2xl font-bold">{value}</p>
            )}
            <p className="text-xs text-gray-500">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

TutorDashboard.getLayout = getDashboardLayout("Dashboard");

export default TutorDashboard;
