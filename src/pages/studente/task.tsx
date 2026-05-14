import { useContext, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { getDashboardLayout, HeaderActionsContext } from "~/layouts/DashboardLayout";
import type { NextPageWithLayout } from "../_app";
import { api } from "~/utils/api";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Skeleton } from "~/components/ui/skeleton";
import { Separator } from "~/components/ui/separator";
import { Textarea } from "~/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { toast } from "sonner";
import {
  format, isSameDay, startOfDay, startOfMonth, endOfMonth,
  eachDayOfInterval, startOfWeek, endOfWeek, addMonths, subMonths,
  isSameMonth, isToday, isPast,
} from "date-fns";
import { it } from "date-fns/locale";
import { cn } from "~/lib/utils";
import {
  ChevronLeft, ChevronRight, CalendarDays, CheckCircle2, Clock,
  ListChecks, Search, BookmarkCheck, RefreshCw, Loader2, Frown, Meh, Smile,
} from "lucide-react";
import { DateStrip } from "./eventi";
import { PendingFeedbackSection } from "~/components/PendingFeedbackSection";

const EMOJI_ICONS: Record<number, React.ComponentType<{ className?: string }>> = { 1: Frown, 2: Meh, 3: Smile };
const EMOJI_COLORS: Record<number, string> = { 1: "text-red-500", 2: "text-amber-400", 3: "text-green-500" };
const DAY_LABELS = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];

// ─── Types ────────────────────────────────────────────────────────────────────

type SlotInfo = {
  id: string;
  date: Date | string;
  slotStart?: Date | string | null;
  slotEnd?: Date | string | null;
  maxOccupants: number;
  _count: { occupations: number };
  occupations: { id: string; isActive: boolean }[];
};

type TaskItem = {
  id: string;
  title: string;
  description: string | null;
  image: string | null;
  type: string;
  isCompletable: boolean;
  hasFeedback: boolean;
  recurrenceDays: number[];
  slots: SlotInfo[];
};

// ─── Month Calendar ───────────────────────────────────────────────────────────

function MonthCalendar({
  tasks,
  selected,
  onSelect,
}: {
  tasks: TaskItem[];
  selected: Date;
  onSelect: (d: Date) => void;
}) {
  const slotTasks = tasks.filter((t) => t.slots.length > 0);

  const now = new Date();
  const nearestFuture = slotTasks
    .flatMap((t) => t.slots.map((s) => new Date(s.date)))
    .filter((d) => d >= startOfDay(now))
    .sort((a, b) => a.getTime() - b.getTime())[0];

  const [viewMonth, setViewMonth] = useState(() => startOfMonth(nearestFuture ?? selected));

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(viewMonth), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(viewMonth), { weekStartsOn: 1 }),
  });

  function getDayInfo(day: Date) {
    const dayTasks = slotTasks.filter((t) => t.slots.some((s) => isSameDay(new Date(s.date), day)));
    if (!dayTasks.length) return null;
    const booked = dayTasks.some((t) => t.slots.some((s) => isSameDay(new Date(s.date), day) && s.occupations.length > 0));
    const available = dayTasks.some((t) => t.slots.some((s) => isSameDay(new Date(s.date), day) && s._count.occupations < s.maxOccupants));
    return { booked, available, count: dayTasks.length };
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-3 flex items-center justify-between">
        <button onClick={() => setViewMonth((m) => subMonths(m, 1))} aria-label="Mese precedente"
          className="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <p className="text-sm font-semibold capitalize text-gray-800 dark:text-gray-100">
          {format(viewMonth, "MMMM yyyy", { locale: it })}
        </p>
        <button onClick={() => setViewMonth((m) => addMonths(m, 1))} aria-label="Mese successivo"
          className="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="mb-1 grid grid-cols-7">
        {["Lu", "Ma", "Me", "Gi", "Ve", "Sa", "Do"].map((d) => (
          <p key={d} className="text-center text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">{d}</p>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {days.map((day) => {
          const inMonth = isSameMonth(day, viewMonth);
          const isSelected = isSameDay(day, selected);
          const todayDay = isToday(day);
          const info = inMonth ? getDayInfo(day) : null;

          return (
            <button key={day.toISOString()} onClick={() => { onSelect(day); if (!isSameMonth(day, viewMonth)) setViewMonth(startOfMonth(day)); }}
              aria-label={format(day, "d MMMM yyyy", { locale: it })} aria-pressed={isSelected}
              disabled={!inMonth}
              className={cn(
                "flex flex-col items-center rounded-lg py-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                !inMonth && "pointer-events-none opacity-0",
                isSelected && "bg-blue-600 text-white",
                !isSelected && todayDay && "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300",
                !isSelected && !todayDay && "hover:bg-gray-100 text-gray-700 dark:hover:bg-gray-700 dark:text-gray-300",
              )}>
              <span className="text-xs font-medium leading-5">{format(day, "d")}</span>
              {info ? (
                <span className={cn("mt-0.5 h-1.5 w-1.5 rounded-full",
                  info.booked ? (isSelected ? "bg-green-300" : "bg-green-500")
                    : isSelected ? "bg-blue-200" : "bg-blue-500")} />
              ) : (
                <span className="mt-0.5 h-1.5 w-1.5" />
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-2 flex gap-4 border-t border-gray-100 pt-2 dark:border-gray-700">
        <span className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
          <span className="h-2 w-2 rounded-full bg-blue-500" /> Disponibile
        </span>
        <span className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
          <span className="h-2 w-2 rounded-full bg-green-500" /> Iscritto
        </span>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

const StudenteTaskPage: NextPageWithLayout = function StudenteTaskPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [detailId, setDetailId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(new Date()));
  const [calOpen, setCalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("miei");

  useEffect(() => {
    if (status === "unauthenticated") void router.replace("/auth/tipo");
    if (status === "authenticated" && session.user.mustChangePassword) {
      void router.replace("/auth/cambio-password");
    }
  }, [status, session, router]);

  const utils = api.useUtils();
  const { data: tasks = [], isLoading } = api.task.list.useQuery(undefined, {
    enabled: status === "authenticated",
  });
  const { data: history } = api.task.myHistory.useQuery(undefined, {
    enabled: status === "authenticated",
  });

  // Inject header actions
  const { setHeaderActions } = useContext(HeaderActionsContext);
  const setCalOpenRef = useRef(setCalOpen);
  setCalOpenRef.current = setCalOpen;
  const setActiveTabRef = useRef(setActiveTab);
  setActiveTabRef.current = setActiveTab;
  const refetchRef = useRef(() => void utils.task.list.invalidate());
  refetchRef.current = () => void utils.task.list.invalidate();

  useEffect(() => {
    setHeaderActions(
      <div className="flex items-center gap-0.5 mr-1">
        <button type="button" onClick={() => refetchRef.current()}
          className="flex h-9 w-9 items-center justify-center rounded-full text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
          aria-label="Ricarica attività">
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
        </button>
        <button type="button" onClick={() => { setActiveTabRef.current("esplora"); setCalOpenRef.current(true); }}
          className="flex h-9 w-9 items-center justify-center rounded-full text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
          aria-label="Apri calendario attività">
          <CalendarDays className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    );
    return () => setHeaderActions(null);
  }, [setHeaderActions]);

  const completeMut = api.task.toggleComplete.useMutation({
    onSuccess: () => {
      void utils.task.myHistory.invalidate();
      toast.success("Stato aggiornato");
    },
    onError: (e) => toast.error(e.message),
  });

  if (status !== "authenticated") return null;

  const completedTaskIds = new Set(history?.completedTasks.map((c) => c.taskId) ?? []);
  // Only show "Segna fatto" for completable tasks that have no slots
  const completableTasks = tasks.filter((t) => t.isCompletable && t.slots.length === 0) as TaskItem[];

  const taskNow = new Date();

  // Slot tasks where student is enrolled in a future slot OR future available slots exist
  const slotTasks = (tasks as TaskItem[]).filter((t) => {
    if (t.slots.length === 0) return false;
    const hasMyFutureOccupation = t.slots.some((s) => s.occupations.length > 0 && new Date(s.date) >= taskNow);
    const hasFutureAvailable = t.slots.some((s) => s._count.occupations < s.maxOccupants && new Date(s.date) >= taskNow);
    return hasMyFutureOccupation || hasFutureAvailable;
  });

  // My enrolled slot tasks — only future occupied slots
  type EnrolledTask = TaskItem & { mySlots: SlotInfo[] };
  const enrolledTasks: EnrolledTask[] = slotTasks
    .filter((t) => t.slots.some((s) => s.occupations.length > 0 && new Date(s.date) >= taskNow))
    .map((t) => ({
      ...t,
      mySlots: t.slots
        .filter((s) => s.occupations.length > 0 && new Date(s.date) >= taskNow)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    }))
    .sort((a, b) => {
      const aDate = new Date(a.mySlots[0]?.date ?? 0);
      const bDate = new Date(b.mySlots[0]?.date ?? 0);
      return aDate.getTime() - bDate.getTime();
    });

  // Slot tasks available for selected day
  const dayAvailableTasks = slotTasks
    .map((t) => ({
      ...t,
      slots: t.slots.filter((s) => isSameDay(new Date(s.date), selectedDate)),
    }))
    .filter((t) => t.slots.length > 0 && t.slots.some((s) => s._count.occupations < s.maxOccupants || s.occupations.length > 0));

  const hasMyTasks = completableTasks.length > 0 || enrolledTasks.length > 0;

  return (
    <div className="space-y-2">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="miei" className="flex-1 gap-1.5">
            <BookmarkCheck className="h-4 w-4" aria-hidden="true" />
            Le mie attività
          </TabsTrigger>
          <TabsTrigger value="esplora" className="flex-1 gap-1.5">
            <CalendarDays className="h-4 w-4" aria-hidden="true" />
            Esplora
          </TabsTrigger>
        </TabsList>

        {/* ── Le mie attività ── */}
        <TabsContent value="miei" className="space-y-4 pt-3">
          {isLoading && <Skeleton className="h-48 w-full" />}
          {!isLoading && !hasMyTasks && (
            <div className="py-16 text-center">
              <BookmarkCheck className="mx-auto mb-3 h-10 w-10 text-gray-300 dark:text-gray-600" aria-hidden="true" />
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Nessuna attività personale</p>
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">Vai su "Esplora" per iscriverti a un'attività</p>
            </div>
          )}

          {/* Enrolled slot tasks */}
          {enrolledTasks.length > 0 && (
            <div className="space-y-2">
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                Attività con slot ({enrolledTasks.length})
              </p>
              {enrolledTasks.map((task) => {
                const nextSlot = task.mySlots[0];
                if (!nextSlot) return null;
                const slotDate = new Date(nextSlot.date);
                const slotStart = nextSlot.slotStart ? new Date(nextSlot.slotStart) : slotDate;
                const past = isPast(slotDate);
                const timeLabel = nextSlot.slotStart && nextSlot.slotEnd
                  ? `${format(slotStart, "HH:mm")} – ${format(new Date(nextSlot.slotEnd), "HH:mm")}`
                  : format(slotDate, "HH:mm");

                return (
                  <button
                    key={task.id}
                    onClick={() => setDetailId(task.id)}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors",
                      past
                        ? "border-gray-200 bg-gray-50 opacity-70 dark:border-gray-700 dark:bg-gray-800/50"
                        : "border-green-200 bg-green-50 hover:bg-green-100 dark:border-green-700 dark:bg-green-900/20 dark:hover:bg-green-900/30",
                    )}
                  >
                    {task.image && (
                      <img src={task.image} alt={task.title} className="h-12 w-12 shrink-0 rounded-lg object-cover" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold leading-tight text-gray-900 dark:text-gray-100">{task.title}</p>
                        {past ? (
                          <Badge variant="outline" className="shrink-0 text-xs">Passato</Badge>
                        ) : (
                          <Badge className="shrink-0 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-0 text-xs">Iscritto</Badge>
                        )}
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                          <CalendarDays className="h-3 w-3" aria-hidden="true" />
                          <span className="capitalize">{format(slotDate, "EEEE d MMMM", { locale: it })}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" aria-hidden="true" />
                          {timeLabel}
                        </span>
                      </div>
                      {task.mySlots.length > 1 && (
                        <p className="mt-0.5 text-xs text-gray-400">+{task.mySlots.length - 1} altri slot</p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {enrolledTasks.length > 0 && completableTasks.length > 0 && <Separator />}

          {/* Completable tasks */}
          {completableTasks.length > 0 && (
            <div className="space-y-2">
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                Da completare ({completableTasks.length})
              </p>
              {completableTasks.map((task) => {
                const isDone = completedTaskIds.has(task.id);
                return (
                  <div
                    key={task.id}
                    className={cn(
                      "flex items-start gap-3 rounded-xl border p-3",
                      isDone
                        ? "border-green-200 bg-green-50 dark:border-green-700 dark:bg-green-900/20"
                        : "border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800",
                    )}
                  >
                    {task.image && (
                      <img src={task.image} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className={cn("text-sm font-semibold", isDone && "line-through text-gray-400 dark:text-gray-500")}>
                        {task.title}
                      </p>
                      {task.description && (
                        <p className="mt-0.5 line-clamp-1 text-xs text-gray-500 dark:text-gray-400">{task.description}</p>
                      )}
                    </div>
                    <button
                      onClick={() => completeMut.mutate({ taskId: task.id, complete: !isDone })}
                      disabled={completeMut.isPending}
                      aria-label={isDone ? "Segna come non fatto" : "Segna come fatto"}
                      className={cn(
                        "min-w-[88px] shrink-0 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                        isDone
                          ? "border-green-600 bg-green-600 text-white"
                          : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700",
                      )}
                    >
                      {isDone ? "✓ Fatto" : "Segna fatto"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── Esplora (Calendario) ── */}
        <TabsContent value="esplora" className="space-y-4 pt-3">
          {isLoading && <Skeleton className="h-48 w-full" />}
          {!isLoading && (
            <>
              {/* Scrollable date strip */}
              <DateStrip
                selected={selectedDate}
                onChange={setSelectedDate}
                highlightedDates={slotTasks.flatMap((t) => t.slots.map((s) => new Date(s.date)))}
              />

              {/* Pending feedbacks */}
              <PendingFeedbackSection />

              <div className="space-y-2">
                <p className="text-sm font-semibold capitalize text-gray-700 dark:text-gray-300">
                  {format(selectedDate, "EEEE d MMMM", { locale: it })}
                </p>

                {dayAvailableTasks.length === 0 && (
                  <div className="py-8 text-center">
                    <Search className="mx-auto mb-2 h-8 w-8 text-gray-300 dark:text-gray-600" aria-hidden="true" />
                    <p className="text-sm text-gray-400 dark:text-gray-500">Nessuna attività questo giorno</p>
                  </div>
                )}

                {dayAvailableTasks.map((task) => {
                  const myBookedSlots = task.slots.filter((s) => s.occupations.length > 0);
                  const openSlots = task.slots.filter((s) => s._count.occupations < s.maxOccupants && s.occupations.length === 0);
                  const isBooked = myBookedSlots.length > 0;

                  return (
                    <button
                      key={task.id}
                      onClick={() => setDetailId(task.id)}
                      className={cn(
                        "flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors",
                        isBooked
                          ? "border-green-200 bg-green-50 hover:bg-green-100 dark:border-green-700 dark:bg-green-900/20"
                          : "border-gray-200 bg-white hover:border-blue-200 hover:bg-blue-50/30 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-blue-700 dark:hover:bg-blue-900/20",
                      )}
                    >
                      {task.image && (
                        <img src={task.image} alt={task.title} className="h-14 w-14 shrink-0 rounded-lg object-cover" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold leading-tight">{task.title}</p>
                          {isBooked ? (
                            <Badge className="shrink-0 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-0 text-xs">Iscritto</Badge>
                          ) : (
                            <Badge variant="outline" className="shrink-0 text-xs">
                              {openSlots.length} slot liberi
                            </Badge>
                          )}
                        </div>
                        {task.description && (
                          <p className="mt-0.5 line-clamp-1 text-xs text-gray-500 dark:text-gray-400">{task.description}</p>
                        )}
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {task.slots.map((s) => {
                            const label = s.slotStart && s.slotEnd
                              ? `${format(new Date(s.slotStart), "HH:mm")}–${format(new Date(s.slotEnd), "HH:mm")}`
                              : format(new Date(s.date), "HH:mm");
                            const full = s._count.occupations >= s.maxOccupants;
                            const mySlot = s.occupations.length > 0;
                            return (
                              <span key={s.id} className={cn(
                                "rounded border px-1.5 py-0.5 text-xs font-medium",
                                mySlot ? "border-green-300 bg-green-100 text-green-700 dark:border-green-700 dark:bg-green-900/30 dark:text-green-300"
                                  : full ? "border-gray-200 bg-gray-100 text-gray-400 line-through dark:border-gray-600 dark:bg-gray-700 dark:text-gray-500"
                                  : "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-900/20 dark:text-blue-300",
                              )}>
                                {label}{mySlot && " ✓"}
                              </span>
                            );
                          })}
                        </div>
                        {!isBooked && openSlots.length > 0 && (
                          <p className="mt-1 text-xs font-medium text-blue-600 dark:text-blue-400">
                            Tocca per scegliere il tuo slot →
                          </p>
                        )}
                        {isBooked && (
                          <p className="mt-1 text-xs font-medium text-green-600 dark:text-green-400">
                            Sei iscritto — tocca per i dettagli
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}
          {isLoading && <Skeleton className="h-72 w-full" />}
        </TabsContent>
      </Tabs>

      {detailId && (
        <TaskDetailDialog taskId={detailId} onClose={() => setDetailId(null)} />
      )}

      {/* Calendar modal — full month view */}
      <Dialog open={calOpen} onOpenChange={(o) => !o && setCalOpen(false)}>
        <DialogContent className="max-w-sm p-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" aria-hidden="true" />
              Calendario attività
            </DialogTitle>
          </DialogHeader>
          <MonthCalendar
            tasks={tasks as TaskItem[]}
            selected={selectedDate}
            onSelect={(d) => { setSelectedDate(d); setCalOpen(false); setActiveTab("esplora"); }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ─── Task detail dialog ───────────────────────────────────────────────────────

function TaskDetailDialog({ taskId, onClose }: { taskId: string; onClose: () => void }) {
  const utils = api.useUtils();
  const { data: task, isLoading } = api.task.getById.useQuery({ id: taskId });
  const toggleMut = api.task.toggleOccupation.useMutation({
    onSuccess: () => {
      void utils.task.getById.invalidate({ id: taskId });
      void utils.task.list.invalidate();
      toast.success("Iscrizione aggiornata");
    },
    onError: (e) => toast.error(e.message),
  });

  const slotsByDate: Record<string, NonNullable<typeof task>["slots"]> = {};
  if (task) {
    for (const slot of task.slots) {
      const key = format(new Date(slot.date), "yyyy-MM-dd");
      if (!slotsByDate[key]) slotsByDate[key] = [];
      slotsByDate[key].push(slot);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
        {isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : task ? (
          <>
            {task.image && (
              <img src={task.image} alt={task.title} className="-mt-1 h-40 w-full rounded-lg object-cover" />
            )}
            <DialogHeader>
              <DialogTitle>{task.title}</DialogTitle>
            </DialogHeader>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="text-xs">
                {task.type === "RECURRENT" ? "Ricorrente" : "Occasionale"}
              </Badge>
              {task.type === "RECURRENT" && task.recurrenceDays.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {task.recurrenceDays.map((d: number) => DAY_LABELS[d]).join(" · ")}
                </Badge>
              )}
            </div>
            {task.description && (
              <p className="text-sm text-gray-600 dark:text-gray-300">{task.description}</p>
            )}
            <Separator />

            <div className="space-y-4">
              {Object.entries(slotsByDate).map(([dateKey, slots]) => (
                <div key={dateKey}>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 capitalize">
                    {format(new Date(dateKey), "EEEE d MMMM", { locale: it })}
                  </p>
                  <div className="space-y-2">
                    {slots.map((slot) => {
                      const myOccupation = slot.occupations[0];
                      const isOccupied = !!myOccupation?.isActive;
                      const activeCount = slot._count.occupations;
                      const isFull = activeCount >= slot.maxOccupants && !isOccupied;
                      const isPastSlot = isPast(new Date(slot.date));
                      const timeLabel = slot.slotStart && slot.slotEnd
                        ? `${format(new Date(slot.slotStart), "HH:mm")} – ${format(new Date(slot.slotEnd), "HH:mm")}`
                        : format(new Date(slot.date), "HH:mm");

                      return (
                        <div key={slot.id} className={cn(
                          "flex items-center justify-between rounded-lg border p-2.5",
                          isOccupied ? "border-green-200 bg-green-50 dark:border-green-700 dark:bg-green-900/20"
                            : isPastSlot ? "border-gray-100 bg-gray-50 opacity-60 dark:border-gray-700 dark:bg-gray-900"
                            : "border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800",
                        )}>
                          <div>
                            <p className="flex items-center gap-1.5 text-sm font-medium">
                              <Clock className="h-3.5 w-3.5 text-gray-400" aria-hidden="true" />
                              {timeLabel}
                            </p>
                            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                              {activeCount}/{slot.maxOccupants} iscritti
                            </p>
                          </div>
                          {!isPastSlot ? (
                            <Button
                              size="sm"
                              variant={isOccupied ? "outline" : "default"}
                              disabled={isFull || toggleMut.isPending}
                              onClick={() => toggleMut.mutate({ slotId: slot.id, occupy: !isOccupied })}
                              className={cn("min-w-22.5 gap-1.5", isOccupied && "border-green-300 text-green-700 dark:border-green-700 dark:text-green-300")}
                            >
                              {toggleMut.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
                              {toggleMut.isPending ? "…" : isFull ? "Pieno" : isOccupied ? "Cancella" : "Iscriviti"}
                            </Button>
                          ) : (
                            isOccupied && (
                              <Badge className="bg-green-100 text-green-800 border border-green-200 text-xs dark:bg-green-900/20 dark:text-green-300 dark:border-green-700">
                                Partecipato
                              </Badge>
                            )
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              {task.slots.length === 0 && (
                <p className="py-4 text-center text-sm text-gray-500 dark:text-gray-400">Nessuno slot disponibile</p>
              )}
            </div>

          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

StudenteTaskPage.getLayout = getDashboardLayout("Task");

export default StudenteTaskPage;
