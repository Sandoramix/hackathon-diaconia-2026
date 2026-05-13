import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";
import { getDashboardLayout } from "~/layouts/DashboardLayout";
import type { NextPageWithLayout } from "../_app";
import { api } from "~/utils/api";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Skeleton } from "~/components/ui/skeleton";
import { Separator } from "~/components/ui/separator";
import { Textarea } from "~/components/ui/textarea";
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
  isSameMonth, isToday,
} from "date-fns";
import { it } from "date-fns/locale";
import { cn } from "~/lib/utils";
import { ChevronLeft, ChevronRight, CalendarDays, CheckCircle2, Clock, MapPin } from "lucide-react";

const EMOJI_MAP: Record<number, string> = { 1: "😕", 2: "😐", 3: "😊" };
const DAY_LABELS = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];

// ─── Month Calendar ───────────────────────────────────────────────────────────

type SlotWithOccupation = {
  id: string;
  date: Date | string;
  slotStart?: Date | string | null;
  slotEnd?: Date | string | null;
  maxOccupants: number;
  _count: { occupations: number };
  occupations: { id: string; isActive: boolean }[];
};

type TaskForCalendar = {
  id: string;
  title: string;
  isCompletable: boolean;
  slots: SlotWithOccupation[];
};

function MonthCalendar({
  tasks,
  selected,
  onSelect,
}: {
  tasks: TaskForCalendar[];
  selected: Date;
  onSelect: (d: Date) => void;
}) {
  const slotTasks = tasks.filter((t) => !t.isCompletable);
  const now = new Date();
  const nearestFutureSlot = slotTasks
    .flatMap((t) => t.slots.map((s) => new Date(s.date)))
    .filter((d) => d >= startOfDay(now))
    .sort((a, b) => a.getTime() - b.getTime())[0];

  const [viewMonth, setViewMonth] = useState(() =>
    startOfMonth(nearestFutureSlot ?? selected),
  );

  const monthStart = startOfMonth(viewMonth);
  const monthEnd = endOfMonth(viewMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  function getDayInfo(day: Date) {
    const dayTasks = slotTasks.filter((t) =>
      t.slots.some((s) => isSameDay(new Date(s.date), day)),
    );
    if (dayTasks.length === 0) return null;
    const isBooked = dayTasks.some((t) =>
      t.slots.some((s) => isSameDay(new Date(s.date), day) && s.occupations.length > 0),
    );
    return { count: dayTasks.length, isBooked };
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <button
          onClick={() => setViewMonth((m) => subMonths(m, 1))}
          className="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
          aria-label="Mese precedente"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </button>
        <p className="text-sm font-semibold capitalize text-gray-800 dark:text-gray-100">
          {format(viewMonth, "MMMM yyyy", { locale: it })}
        </p>
        <button
          onClick={() => setViewMonth((m) => addMonths(m, 1))}
          className="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
          aria-label="Mese successivo"
        >
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      {/* Day headers */}
      <div className="mb-1 grid grid-cols-7">
        {["Lu", "Ma", "Me", "Gi", "Ve", "Sa", "Do"].map((d) => (
          <p key={d} className="text-center text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
            {d}
          </p>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {days.map((day) => {
          const inMonth = isSameMonth(day, viewMonth);
          const isSelected = isSameDay(day, selected);
          const todayDay = isToday(day);
          const info = inMonth ? getDayInfo(day) : null;

          return (
            <button
              key={day.toISOString()}
              onClick={() => { onSelect(day); setViewMonth(startOfMonth(day)); }}
              aria-label={format(day, "d MMMM yyyy", { locale: it })}
              aria-pressed={isSelected}
              disabled={!inMonth}
              className={cn(
                "flex flex-col items-center rounded-lg py-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                !inMonth && "opacity-0 pointer-events-none",
                isSelected && "bg-blue-600 text-white",
                !isSelected && todayDay && "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300",
                !isSelected && !todayDay && inMonth && "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300",
              )}
            >
              <span className="text-xs font-medium leading-5">{format(day, "d")}</span>
              {info ? (
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full mt-0.5",
                    info.isBooked
                      ? isSelected ? "bg-green-300" : "bg-green-500"
                      : isSelected ? "bg-blue-200" : "bg-blue-500",
                  )}
                  aria-hidden="true"
                />
              ) : (
                <span className="h-1.5 w-1.5 mt-0.5" />
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-3 flex gap-4 border-t border-gray-100 pt-2 dark:border-gray-700">
        <span className="flex items-center gap-1.5 text-[10px] text-gray-500 dark:text-gray-400">
          <span className="h-2 w-2 rounded-full bg-blue-500" aria-hidden="true" />
          Disponibile
        </span>
        <span className="flex items-center gap-1.5 text-[10px] text-gray-500 dark:text-gray-400">
          <span className="h-2 w-2 rounded-full bg-green-500" aria-hidden="true" />
          Iscritto
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

  const completeMut = api.task.toggleComplete.useMutation({
    onSuccess: () => {
      void utils.task.myHistory.invalidate();
      toast.success("Stato aggiornato");
    },
    onError: (e) => toast.error(e.message),
  });

  if (status !== "authenticated") return null;

  const completedTaskIds = new Set(history?.completedTasks.map((c) => c.taskId) ?? []);
  const completableTasks = tasks.filter((t) => t.isCompletable);
  // Only show slot tasks where this student is assigned OR there are open slots
  const slotTasks = tasks.filter((t) => {
    if (t.isCompletable) return false;
    if (t.slots.length === 0) return false;
    const hasMyOccupation = t.slots.some((s) => s.occupations.length > 0);
    const hasAvailableSlot = t.slots.some((s) => s._count.occupations < s.maxOccupants);
    return hasMyOccupation || hasAvailableSlot;
  });

  const daySlotTasks = slotTasks
    .map((task) => ({
      ...task,
      slots: task.slots.filter((s) => isSameDay(new Date(s.date), selectedDate)),
    }))
    .filter((t) => t.slots.length > 0);

  return (
    <div className="space-y-4">
      {isLoading && <Skeleton className="h-64 w-full" />}

      {/* Completable tasks */}
      {completableTasks.length > 0 && (
        <div className="space-y-2">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
            Attività personali
          </p>
          {completableTasks.map((task) => {
            const isDone = completedTaskIds.has(task.id);
            return (
              <div
                key={task.id}
                className={cn(
                  "flex items-start gap-3 rounded-xl border p-3 transition-colors",
                  isDone
                    ? "border-green-200 bg-green-50 dark:border-green-700 dark:bg-green-900/20"
                    : "border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800",
                )}
              >
                {task.image && (
                  <img src={task.image} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
                )}
                <div className="min-w-0 flex-1">
                  <p className={cn("text-sm font-semibold", isDone && "text-gray-400 line-through dark:text-gray-500")}>
                    {task.title}
                  </p>
                  {task.description && (
                    <p className="mt-0.5 line-clamp-1 text-xs text-gray-500 dark:text-gray-400">
                      {task.description}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => completeMut.mutate({ taskId: task.id, complete: !isDone })}
                  disabled={completeMut.isPending}
                  aria-label={isDone ? "Segna come non fatto" : "Segna come fatto"}
                  className={cn(
                    "shrink-0 min-w-[80px] rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
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

          {slotTasks.length > 0 && <Separator />}
        </div>
      )}

      {/* Month Calendar */}
      {slotTasks.length > 0 && !isLoading && (
        <>
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
            <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
            Attività con iscrizione
          </p>
          <MonthCalendar
            tasks={tasks}
            selected={selectedDate}
            onSelect={setSelectedDate}
          />
        </>
      )}

      {/* Selected day tasks */}
      {slotTasks.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 capitalize">
            {format(selectedDate, "EEEE d MMMM", { locale: it })}
          </p>

          {daySlotTasks.length === 0 && (
            <p className="py-4 text-center text-sm text-gray-400 dark:text-gray-500">
              Nessuna attività questo giorno
            </p>
          )}

          {daySlotTasks.map((task) => {
            const myBookedSlots = task.slots.filter((s) => s.occupations.length > 0);
            const availableSlots = task.slots.filter((s) => s._count.occupations < s.maxOccupants && s.occupations.length === 0);
            const isBooked = myBookedSlots.length > 0;

            return (
              <button
                key={task.id}
                onClick={() => setDetailId(task.id)}
                className={cn(
                  "flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors",
                  isBooked
                    ? "border-green-200 bg-green-50 hover:bg-green-100 dark:border-green-700 dark:bg-green-900/20 dark:hover:bg-green-900/30"
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
                      <Badge className="shrink-0 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-0 text-xs">
                        Iscritto
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="shrink-0 text-xs">
                        {task.type === "RECURRENT" ? "Ricorrente" : "Occasionale"}
                      </Badge>
                    )}
                  </div>
                  {task.description && (
                    <p className="mt-0.5 line-clamp-1 text-xs text-gray-500 dark:text-gray-400">
                      {task.description}
                    </p>
                  )}

                  {/* Time slots */}
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {task.slots.map((s) => {
                      const label = s.slotStart && s.slotEnd
                        ? `${format(new Date(s.slotStart), "HH:mm")}–${format(new Date(s.slotEnd), "HH:mm")}`
                        : format(new Date(s.date), "HH:mm");
                      const full = s._count.occupations >= s.maxOccupants;
                      const mySlot = s.occupations.length > 0;
                      return (
                        <span
                          key={s.id}
                          className={cn(
                            "rounded border px-1.5 py-0.5 text-[10px] font-medium",
                            mySlot
                              ? "border-green-300 bg-green-100 text-green-700 dark:border-green-700 dark:bg-green-900/30 dark:text-green-300"
                              : full
                              ? "border-gray-200 bg-gray-100 text-gray-400 line-through dark:border-gray-600 dark:bg-gray-700 dark:text-gray-500"
                              : "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-900/20 dark:text-blue-300",
                          )}
                        >
                          {label}
                          {mySlot && " ✓"}
                        </span>
                      );
                    })}
                  </div>

                  {isBooked ? (
                    <p className="mt-1 text-[10px] font-medium text-green-600 dark:text-green-400">
                      Sei iscritto — tocca per i dettagli
                    </p>
                  ) : availableSlots.length === 0 ? (
                    <p className="mt-1 text-[10px] font-medium text-red-500">Tutti gli slot al completo</p>
                  ) : (
                    <p className="mt-1 text-[10px] font-medium text-blue-600 dark:text-blue-400">
                      Prenota il tuo slot → {availableSlots.length} disponibili
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {!isLoading && slotTasks.length === 0 && completableTasks.length === 0 && (
        <div className="py-16 text-center">
          <CalendarDays className="mx-auto mb-3 h-10 w-10 text-gray-300 dark:text-gray-600" aria-hidden="true" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Nessuna attività disponibile</p>
        </div>
      )}

      {detailId && (
        <TaskDetailDialog taskId={detailId} onClose={() => setDetailId(null)} />
      )}
    </div>
  );
};

// ─── Task detail dialog ───────────────────────────────────────────────────────

function TaskDetailDialog({ taskId, onClose }: { taskId: string; onClose: () => void }) {
  const { data: session } = useSession();
  const utils = api.useUtils();
  const { data: task, isLoading } = api.task.getById.useQuery({ id: taskId });
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [emoji, setEmoji] = useState<number | null>(null);
  const [text, setText] = useState("");

  const toggleMut = api.task.toggleOccupation.useMutation({
    onSuccess: () => {
      void utils.task.getById.invalidate({ id: taskId });
      void utils.task.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const submitFeedback = api.feedback.submit.useMutation({
    onSuccess: () => { toast.success("Feedback inviato"); setFeedbackOpen(false); },
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
                      const isPast = new Date(slot.date) < new Date();
                      const timeLabel = slot.slotStart && slot.slotEnd
                        ? `${format(new Date(slot.slotStart), "HH:mm")} – ${format(new Date(slot.slotEnd), "HH:mm")}`
                        : format(new Date(slot.date), "HH:mm");

                      return (
                        <div
                          key={slot.id}
                          className={cn(
                            "flex items-center justify-between rounded-lg border p-2.5",
                            isOccupied
                              ? "border-green-200 bg-green-50 dark:border-green-700 dark:bg-green-900/20"
                              : isPast
                              ? "border-gray-100 bg-gray-50 opacity-60 dark:border-gray-700 dark:bg-gray-900"
                              : "border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800",
                          )}
                        >
                          <div>
                            <p className="flex items-center gap-1.5 text-sm font-medium">
                              <Clock className="h-3.5 w-3.5 text-gray-400" aria-hidden="true" />
                              {timeLabel}
                            </p>
                            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                              {activeCount}/{slot.maxOccupants} iscritti
                            </p>
                          </div>
                          {!isPast ? (
                            <Button
                              size="sm"
                              variant={isOccupied ? "outline" : "default"}
                              disabled={isFull || toggleMut.isPending}
                              onClick={() => toggleMut.mutate({ slotId: slot.id, occupy: !isOccupied })}
                              className={cn("min-w-[80px]", isOccupied && "border-green-300 text-green-700 dark:border-green-700 dark:text-green-300")}
                            >
                              {isFull ? "Pieno" : isOccupied ? "Cancella" : "Iscriviti"}
                            </Button>
                          ) : (
                            isOccupied && (
                              <Badge className="bg-green-100 text-green-800 border-green-200 border text-xs dark:bg-green-900/20 dark:text-green-300 dark:border-green-700">
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
                <p className="py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                  Nessuno slot disponibile
                </p>
              )}
            </div>

            {task.hasFeedback && !feedbackOpen && (
              <>
                <Separator />
                <Button variant="outline" className="w-full gap-2" onClick={() => setFeedbackOpen(true)}>
                  ⭐ Lascia feedback
                </Button>
              </>
            )}

            {feedbackOpen && (
              <div className="space-y-3 rounded-lg border p-3">
                <p className="text-sm font-medium">Come è andata?</p>
                <div className="flex justify-center gap-4">
                  {[1, 2, 3].map((v) => (
                    <button
                      key={v}
                      onClick={() => setEmoji(v)}
                      className={`text-3xl transition-transform hover:scale-110 ${emoji === v ? "scale-125" : "opacity-50"}`}
                      aria-pressed={emoji === v}
                      aria-label={EMOJI_MAP[v]}
                    >
                      {EMOJI_MAP[v]}
                    </button>
                  ))}
                </div>
                <Textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Commento opzionale..."
                  rows={2}
                />
                <Button
                  className="w-full"
                  disabled={!emoji || submitFeedback.isPending}
                  onClick={() => submitFeedback.mutate({ taskId: task.id, emoji: emoji!, text: text || undefined })}
                >
                  Invia feedback
                </Button>
              </div>
            )}
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

StudenteTaskPage.getLayout = getDashboardLayout("Task");

export default StudenteTaskPage;
