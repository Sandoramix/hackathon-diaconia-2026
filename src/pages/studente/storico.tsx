import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { getDashboardLayout } from "~/layouts/DashboardLayout";
import type { NextPageWithLayout } from "../_app";
import { api } from "~/utils/api";
import { Badge } from "~/components/ui/badge";
import { Skeleton } from "~/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Scheduler } from "calendarkit-pro";
import type { CalendarEvent, ViewType } from "calendarkit-pro";
import { format } from "date-fns";

const StoricoPage: NextPageWithLayout = function StoricoPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [calView, setCalView] = useState<ViewType>("month");
  const [calDate, setCalDate] = useState(new Date());

  useEffect(() => {
    if (status === "unauthenticated") void router.replace("/auth/tipo");
    if (status === "authenticated" && session.user.mustChangePassword) {
      void router.replace("/auth/cambio-password");
    }
  }, [status, session, router]);

  const { data: history, isLoading } = api.task.myHistory.useQuery(undefined, {
    enabled: status === "authenticated",
  });

  if (status !== "authenticated") return null;

  const calEvents: CalendarEvent[] = [
    ...(history?.pastEvents ?? []).map((e: { id: string; title: string; startDate: Date; endDate: Date; description: string | null; image: string | null; place: string | null; tags: { id: string; name: string }[] }) => ({
      id: `event-${e.id}`,
      title: e.title,
      start: new Date(e.startDate),
      end: new Date(e.endDate),
      color: "#6b7280",
      description: e.description ?? undefined,
    })),
    ...(history?.pastSlotOccupations ?? []).map((o: { id: string; slot: { date: Date; task: { id: string; title: string; image: string | null } } }) => ({
      id: `slot-${o.id}`,
      title: o.slot.task.title,
      start: new Date(o.slot.date),
      end: new Date(new Date(o.slot.date).getTime() + 60 * 60 * 1000),
      color: "#7c3aed",
    })),
    ...(history?.completedTasks ?? []).map((c: { id: string; taskId: string; completedAt: Date; task: { id: string; title: string; description: string | null; image: string | null } }) => ({
      id: `completed-${c.id}`,
      title: `✓ ${c.task.title}`,
      start: new Date(c.completedAt),
      end: new Date(c.completedAt),
      allDay: true,
      color: "#059669",
    })),
  ];

  return (
    <div className="space-y-4">
      <Tabs defaultValue="lista">
        <TabsList className="w-full">
          <TabsTrigger value="lista" className="flex-1">Lista</TabsTrigger>
          <TabsTrigger value="calendario" className="flex-1">Calendario</TabsTrigger>
        </TabsList>

        {/* ── Lista ── */}
        <TabsContent value="lista" className="space-y-6 pt-3">
          {isLoading && <Skeleton className="h-20 w-full" />}

          {/* Past Events */}
          <section>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
              📅 Eventi completati ({history?.pastEvents.length ?? 0})
            </h2>
            <div className="space-y-2">
              {history?.pastEvents.length === 0 && (
                <p className="text-sm text-gray-500">Nessun evento</p>
              )}
              {history?.pastEvents.map((e: { id: string; title: string; startDate: Date; endDate: Date; description: string | null; image: string | null; place: string | null; tags: { id: string; name: string }[] }) => (
                <div key={e.id} className="flex items-start gap-3 rounded-xl border bg-white p-3">
                  {e.image && (
                    <img src={e.image} alt={e.title} className="h-12 w-12 rounded-lg object-cover shrink-0" />
                  )}
                  <div>
                    <p className="font-semibold text-sm">{e.title}</p>
                    {e.place && <p className="text-xs text-gray-500">📍 {e.place}</p>}
                    <p className="text-xs text-gray-400">
                      {format(new Date(e.startDate), "d MMM yyyy")}
                    </p>
                    {e.tags.length > 0 && (
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {e.tags.map((t: { id: string; name: string }) => (
                          <Badge key={t.id} variant="secondary" className="text-xs">{t.name}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Past Slot Occupations */}
          <section>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
              ✅ Slot occupati ({history?.pastSlotOccupations.length ?? 0})
            </h2>
            <div className="space-y-2">
              {history?.pastSlotOccupations.length === 0 && (
                <p className="text-sm text-gray-500">Nessuno slot</p>
              )}
              {history?.pastSlotOccupations.map((o: { id: string; slot: { date: Date; task: { id: string; title: string; image: string | null } } }) => (
                <div key={o.id} className="flex items-center gap-3 rounded-xl border bg-white p-3">
                  {o.slot.task.image && (
                    <img src={o.slot.task.image} alt="" className="h-10 w-10 rounded-lg object-cover shrink-0" />
                  )}
                  <div>
                    <p className="font-semibold text-sm">{o.slot.task.title}</p>
                    <p className="text-xs text-gray-400">
                      {format(new Date(o.slot.date), "d MMM yyyy · HH:mm")}
                    </p>
                  </div>
                  <Badge className="ml-auto bg-purple-100 text-purple-800 border-purple-200 text-xs shrink-0">
                    Completato
                  </Badge>
                </div>
              ))}
            </div>
          </section>

          {/* Manually Completed Tasks */}
          {(history?.completedTasks.length ?? 0) > 0 && (
            <section>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                🏁 Task completati manualmente ({history?.completedTasks.length})
              </h2>
              <div className="space-y-2">
                {history?.completedTasks.map((c: { id: string; taskId: string; completedAt: Date; task: { id: string; title: string; description: string | null; image: string | null } }) => (
                  <div key={c.id} className="flex items-center gap-3 rounded-xl border bg-white p-3">
                    {c.task.image && (
                      <img src={c.task.image} alt="" className="h-10 w-10 rounded-lg object-cover shrink-0" />
                    )}
                    <div>
                      <p className="font-semibold text-sm">{c.task.title}</p>
                      <p className="text-xs text-gray-400">
                        Completato il {format(new Date(c.completedAt), "d MMM yyyy")}
                      </p>
                    </div>
                    <Badge className="ml-auto bg-green-100 text-green-800 border-green-200 text-xs shrink-0">
                      ✓
                    </Badge>
                  </div>
                ))}
              </div>
            </section>
          )}
        </TabsContent>

        {/* ── Calendario ── */}
        <TabsContent value="calendario" className="pt-3">
          <div className="mb-3 flex gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-full bg-gray-400" /> Evento</span>
            <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-full bg-purple-600" /> Slot task</span>
            <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-full bg-green-600" /> Completato</span>
          </div>
          <div className="h-[550px] rounded-xl overflow-hidden border">
            <Scheduler
              events={calEvents}
              view={calView}
              onViewChange={setCalView}
              date={calDate}
              onDateChange={setCalDate}
              readOnly
              onEventCreate={() => undefined}
              onEventUpdate={() => undefined}
              onEventDelete={() => undefined}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

StoricoPage.getLayout = getDashboardLayout("Storico");

export default StoricoPage;
