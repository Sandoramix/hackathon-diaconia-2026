import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { getDashboardLayout } from "~/layouts/DashboardLayout";
import type { NextPageWithLayout } from "../_app";
import { api } from "~/utils/api";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { Input } from "~/components/ui/input";
import { DatePicker } from "~/components/ui/date-time-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Scheduler } from "calendarkit-pro";
import type { CalendarEvent, ViewType } from "calendarkit-pro";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { format } from "date-fns";

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  event:         { label: "Evento",      color: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300" },
  slot:          { label: "Slot task",   color: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300" },
  task_complete: { label: "Completato",  color: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300" },
};

type Entry = { id: string; date: Date; type: string; title: string; description: string };

const StoricoPage: NextPageWithLayout = function StoricoPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [cursor, setCursor] = useState<Date | undefined>(undefined);
  const [allEntries, setAllEntries] = useState<Entry[]>([]);
  const [calView, setCalView] = useState<ViewType>("month");
  const [calDate, setCalDate] = useState(new Date());

  useEffect(() => {
    if (status === "unauthenticated") void router.replace("/auth/tipo");
    if (status === "authenticated" && session.user.mustChangePassword) {
      void router.replace("/auth/cambio-password");
    }
  }, [status, session, router]);

  const queryInput = {
    type: typeFilter !== "all" ? (typeFilter as "event" | "slot" | "task_complete") : undefined,
    dateFrom: dateFrom ? new Date(dateFrom) : undefined,
    dateTo: dateTo ? new Date(dateTo) : undefined,
    cursor,
    limit: 20,
  };

  const { data, isLoading, isFetching } = api.history.mine.useQuery(queryInput, {
    enabled: status === "authenticated",
  });

  useEffect(() => {
    setCursor(undefined);
    setAllEntries([]);
  }, [typeFilter, dateFrom, dateTo]);

  useEffect(() => {
    if (data?.entries) {
      if (!cursor) {
        setAllEntries(data.entries as Entry[]);
      } else {
        setAllEntries((prev) => [...prev, ...(data.entries as Entry[])]);
      }
    }
  }, [data]);

  if (status !== "authenticated") return null;

  const calEvents: CalendarEvent[] = allEntries.map((e) => ({
    id: e.id,
    title: e.title,
    start: new Date(e.date),
    end: new Date(new Date(e.date).getTime() + 60 * 60 * 1000),
    color: e.type === "event" ? "#0081C6" : e.type === "slot" ? "#7c3aed" : "#059669",
  }));

  return (
    <div className="space-y-4">
      <Tabs defaultValue="lista">
        <TabsList className="w-full">
          <TabsTrigger value="lista" className="flex-1">Lista</TabsTrigger>
          <TabsTrigger value="calendario" className="flex-1">Calendario</TabsTrigger>
        </TabsList>

        {/* ── Lista ── */}
        <TabsContent value="lista" className="space-y-3 pt-3">
          <div className="flex flex-wrap gap-2">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-36 dark:bg-gray-800 dark:border-gray-700">
                <SelectValue placeholder="Tipo..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti</SelectItem>
                <SelectItem value="event">Evento</SelectItem>
                <SelectItem value="slot">Slot task</SelectItem>
                <SelectItem value="task_complete">Completato</SelectItem>
              </SelectContent>
            </Select>
            <DatePicker value={dateFrom} onChange={setDateFrom} placeholder="Da" className="w-36" />
            <DatePicker value={dateTo} onChange={setDateTo} placeholder="A" className="w-36" />
            {(typeFilter !== "all" || dateFrom || dateTo) && (
              <Button variant="ghost" size="sm" onClick={() => { setTypeFilter("all"); setDateFrom(""); setDateTo(""); }}>
                Reset
              </Button>
            )}
          </div>

          {isLoading && !allEntries.length && (
            <>
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </>
          )}

          {allEntries.map((entry) => {
            const t = TYPE_LABELS[entry.type] ?? { label: entry.type, color: "bg-gray-100 text-gray-700" };
            return (
              <div key={entry.id} className="flex gap-3 rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 p-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${t.color}`}>
                      {t.label}
                    </span>
                    <span className="text-xs text-gray-900 dark:text-gray-100 font-medium truncate">
                      {entry.title}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{entry.description}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-xs text-gray-400 dark:text-gray-500">{format(new Date(entry.date), "d MMM yy")}</p>
                </div>
              </div>
            );
          })}

          {!isLoading && allEntries.length === 0 && (
            <p className="py-12 text-center text-sm text-gray-500 dark:text-gray-400">Nessuna attività</p>
          )}

          {data?.nextCursor && (
            <Button
              variant="outline"
              className="w-full dark:border-gray-700 dark:text-gray-300"
              disabled={isFetching}
              onClick={() => setCursor(data.nextCursor!)}
            >
              {isFetching ? "Caricamento..." : "Carica altro"}
            </Button>
          )}
        </TabsContent>

        {/* ── Calendario ── */}
        <TabsContent value="calendario" className="pt-3">
          <div className="mb-2 flex gap-3 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
            <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-[#0081C6]" /> Evento</span>
            <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-purple-600" /> Slot task</span>
            <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-green-600" /> Completato</span>
          </div>
          <div className="h-[550px] rounded-xl overflow-hidden border dark:border-gray-700">
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
