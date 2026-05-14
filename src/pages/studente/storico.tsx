import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { useEffect, useState, useMemo } from "react";
import { getDashboardLayout } from "~/layouts/DashboardLayout";
import type { NextPageWithLayout } from "../_app";
import { api } from "~/utils/api";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Skeleton } from "~/components/ui/skeleton";
import { Badge } from "~/components/ui/badge";
import { DatePicker } from "~/components/ui/date-time-picker";
import { Scheduler } from "calendarkit-pro";
import type { CalendarEvent, ViewType } from "calendarkit-pro";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { cn } from "~/lib/utils";
import { CalendarDays, Clock, CheckCircle2, Search, X } from "lucide-react";

// ─── Config ───────────────────────────────────────────────────────────────────

const TYPE_CONFIG = {
  event:         { label: "Evento",     icon: CalendarDays, color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",   dot: "bg-[#0081C6]" },
  slot:          { label: "Slot task",  icon: Clock,        color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300", dot: "bg-purple-600" },
  task_complete: { label: "Completato", icon: CheckCircle2, color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",  dot: "bg-green-600" },
} as const;

type FilterType = "all" | "event" | "slot" | "task_complete";

const FILTER_OPTIONS: { value: FilterType; label: string }[] = [
  { value: "all",           label: "Tutti" },
  { value: "event",         label: "Eventi" },
  { value: "slot",          label: "Slot task" },
  { value: "task_complete", label: "Completati" },
];

type Entry = { id: string; date: Date; type: string; title: string; description: string };

// ─── Page ─────────────────────────────────────────────────────────────────────

const StoricoPage: NextPageWithLayout = function StoricoPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<FilterType>("all");
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
    type: typeFilter !== "all" ? typeFilter as "event" | "slot" | "task_complete" : undefined,
    dateFrom: dateFrom ? new Date(dateFrom + "T00:00") : undefined,
    dateTo: dateTo ? new Date(dateTo + "T23:59") : undefined,
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

  const displayEntries = useMemo(() => {
    if (!search.trim()) return allEntries;
    const q = search.toLowerCase();
    return allEntries.filter(
      (e) => e.title.toLowerCase().includes(q) || e.description.toLowerCase().includes(q),
    );
  }, [allEntries, search]);

  if (status !== "authenticated") return null;

  const hasActiveFilters = typeFilter !== "all" || dateFrom || dateTo;
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

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" aria-hidden="true" />
            <Input
              placeholder="Cerca attività…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-9"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label="Cancella ricerca"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Type pills */}
          <div className="flex flex-wrap gap-1.5">
            {FILTER_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setTypeFilter(value)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  typeFilter === value
                    ? "border-blue-600 bg-blue-600 text-white"
                    : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-gray-600",
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Date range */}
          <div className="flex flex-wrap items-center gap-2">
            <DatePicker value={dateFrom} onChange={setDateFrom} placeholder="Da data" className="w-36" />
            <span className="text-xs text-gray-400">—</span>
            <DatePicker value={dateTo} onChange={setDateTo} placeholder="A data" className="w-36" />
            {(dateFrom || dateTo) && (
              <Button variant="ghost" size="sm" className="h-8 px-2 text-xs"
                onClick={() => { setDateFrom(""); setDateTo(""); }}>
                <X className="h-3.5 w-3.5 mr-1" />Reset date
              </Button>
            )}
          </div>

          {/* Active filter summary */}
          {(hasActiveFilters || search) && (
            <div className="flex items-center justify-between rounded-lg bg-blue-50 dark:bg-blue-900/10 px-3 py-1.5">
              <p className="text-xs text-blue-700 dark:text-blue-300">
                {displayEntries.length} risultat{displayEntries.length === 1 ? "o" : "i"}
                {search ? ` per "${search}"` : ""}
              </p>
              <button
                type="button"
                onClick={() => { setTypeFilter("all"); setDateFrom(""); setDateTo(""); setSearch(""); }}
                className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 font-medium"
              >
                Azzera tutto
              </button>
            </div>
          )}

          {/* Loading skeletons */}
          {isLoading && !allEntries.length && (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          )}

          {/* Entry list */}
          <div className="space-y-2">
            {displayEntries.map((entry) => {
              const cfg = TYPE_CONFIG[entry.type as keyof typeof TYPE_CONFIG];
              const Icon = cfg?.icon ?? CalendarDays;
              return (
                <div key={entry.id}
                  className="flex items-start gap-3 rounded-xl border border-gray-100 bg-white p-3 dark:border-gray-700 dark:bg-gray-800">
                  {/* Icon + type */}
                  <div className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", cfg?.color ?? "bg-gray-100 text-gray-600")}>
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold leading-tight text-gray-900 dark:text-gray-100 truncate">
                        {entry.title}
                      </p>
                      <span className="shrink-0 text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
                        {format(new Date(entry.date), "d MMM yy", { locale: it })}
                      </span>
                    </div>
                    {entry.description && (
                      <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{entry.description}</p>
                    )}
                    <div className="mt-1">
                      <Badge variant="secondary" className={cn("text-xs border-0", cfg?.color ?? "")}>
                        {cfg?.label ?? entry.type}
                      </Badge>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {!isLoading && displayEntries.length === 0 && (
            <div className="py-12 text-center">
              <Search className="mx-auto mb-3 h-8 w-8 text-gray-300 dark:text-gray-600" aria-hidden="true" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {search ? `Nessun risultato per "${search}"` : "Nessuna attività"}
              </p>
            </div>
          )}

          {data?.nextCursor && !search && (
            <Button variant="outline" className="w-full" disabled={isFetching}
              onClick={() => setCursor(data.nextCursor!)}>
              {isFetching ? "Caricamento…" : "Carica altro"}
            </Button>
          )}
        </TabsContent>

        {/* ── Calendario ── */}
        <TabsContent value="calendario" className="pt-3">
          <div className="mb-2 flex gap-4 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
            {Object.entries(TYPE_CONFIG).map(([, cfg]) => (
              <span key={cfg.label} className="flex items-center gap-1.5">
                <span className={cn("h-2 w-2 rounded-full", cfg.dot)} />
                {cfg.label}
              </span>
            ))}
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
