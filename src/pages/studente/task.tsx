import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
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
import { format, isSameDay, addDays, startOfDay } from "date-fns";
import { cn } from "~/lib/utils";
import { useRef } from "react";

const EMOJI_MAP: Record<number, string> = { 1: "😕", 2: "😐", 3: "😊" };
const DAY_LABELS = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];

function DateStrip({
  selected,
  onChange,
  highlightedDates,
}: {
  selected: Date;
  onChange: (d: Date) => void;
  highlightedDates: Date[];
}) {
  const today = startOfDay(new Date());
  const days = Array.from({ length: 60 }, (_, i) => addDays(today, i));
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!scrollRef.current) return;
    const idx = days.findIndex((d) => isSameDay(d, selected));
    const el = scrollRef.current.children[idx] as HTMLElement | undefined;
    el?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [selected]);

  return (
    <div ref={scrollRef} className="flex gap-2 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
      {days.map((day) => {
        const isSelected = isSameDay(day, selected);
        const hasEvent = highlightedDates.some((d) => isSameDay(d, day));
        const isToday = isSameDay(day, today);
        return (
          <button
            key={day.toISOString()}
            onClick={() => onChange(day)}
            className={cn(
              "flex shrink-0 flex-col items-center rounded-xl px-3 py-2 transition-colors",
              isSelected ? "bg-blue-600 text-white" : isToday ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 border border-blue-200 dark:border-blue-700" : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700",
            )}
          >
            <span className="text-[10px] font-medium uppercase">{format(day, "EEE")}</span>
            <span className="text-base font-bold leading-tight">{format(day, "d")}</span>
            <span className="text-[10px]">{format(day, "MMM")}</span>
            {hasEvent && <span className={cn("mt-0.5 h-1 w-1 rounded-full", isSelected ? "bg-white" : "bg-blue-500")} />}
          </button>
        );
      })}
    </div>
  );
}

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

  // Split tasks
  const completableTasks = tasks.filter((t) => t.isCompletable);
  const slotTasks = tasks.filter((t) => !t.isCompletable);

  // All slot dates for the date strip dots
  const allSlotDates = slotTasks.flatMap((t) => t.slots.map((s) => new Date(s.date)));

  // Slot tasks filtered by selected date
  const filteredSlotTasks = slotTasks
    .map((task) => ({
      ...task,
      slots: task.slots.filter((s) => isSameDay(new Date(s.date), selectedDate)),
    }))
    .filter((t) => t.slots.length > 0);

  return (
    <div className="space-y-4">
      {/* Completable tasks — always shown */}
      {completableTasks.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">Da completare</p>
          {completableTasks.map((task) => {
            const isDone = completedTaskIds.has(task.id);
            return (
              <div
                key={task.id}
                className={cn(
                  "flex items-start gap-3 rounded-xl border p-3 transition-colors",
                  isDone ? "border-green-200 dark:border-green-700 bg-green-50 dark:bg-green-900/20" : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800",
                )}
              >
                {task.image && (
                  <img src={task.image} alt="" className="h-12 w-12 rounded-lg object-cover shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <p className={cn("font-semibold text-sm", isDone && "line-through text-gray-400 dark:text-gray-500")}>{task.title}</p>
                  {task.description && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">{task.description}</p>
                  )}
                </div>
                <button
                  onClick={() => completeMut.mutate({ taskId: task.id, complete: !isDone })}
                  disabled={completeMut.isPending}
                  className={cn(
                    "shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium border transition-colors",
                    isDone
                      ? "bg-green-600 text-white border-green-600"
                      : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700",
                  )}
                >
                  {isDone ? "✓ Fatto" : "Segna fatto"}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Slot-based tasks with date strip */}
      {slotTasks.length > 0 && (
        <>
          {completableTasks.length > 0 && (
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 pt-2">Con slot</p>
          )}
          <DateStrip
            selected={selectedDate}
            onChange={setSelectedDate}
            highlightedDates={allSlotDates}
          />
        </>
      )}

      {isLoading && <Skeleton className="h-24 w-full" />}
      {!isLoading && slotTasks.length > 0 && filteredSlotTasks.length === 0 && (
        <p className="py-4 text-center text-sm text-gray-500 dark:text-gray-400">
          Nessun slot il {format(selectedDate, "d MMMM")}
        </p>
      )}

      {filteredSlotTasks.map((task) => {
        const availableSlots = task.slots.filter(
          (s) => s._count.occupations < s.maxOccupants,
        );

        return (
          <button
            key={task.id}
            onClick={() => setDetailId(task.id)}
            className="flex w-full items-start gap-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 text-left hover:border-blue-200 dark:hover:border-blue-700 hover:bg-blue-50/30 dark:hover:bg-blue-900/20 transition-colors"
          >
            {task.image && (
              <img src={task.image} alt={task.title} className="h-14 w-14 rounded-lg object-cover shrink-0" />
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-sm leading-tight">{task.title}</p>
                <Badge variant="outline" className="shrink-0 text-xs">
                  {task.type === "RECURRENT" ? "Ricorrente" : "Occasionale"}
                </Badge>
              </div>
              {task.description && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">{task.description}</p>
              )}
              {task.type === "RECURRENT" && task.recurrenceDays.length > 0 && (
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  {task.recurrenceDays.map((d: number) => DAY_LABELS[d]).join(" · ")}
                </p>
              )}
              <p className="text-xs text-blue-600 mt-1">
                {availableSlots.length} slot disponibili · {format(selectedDate, "d MMM")}
              </p>
            </div>
          </button>
        );
      })}

      {detailId && (
        <TaskDetailDialog
          taskId={detailId}
          onClose={() => setDetailId(null)}
        />
      )}
    </div>
  );
};

function TaskDetailDialog({
  taskId,
  onClose,
}: {
  taskId: string;
  onClose: () => void;
}) {
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
    onSuccess: () => {
      toast.success("Feedback inviato");
      setFeedbackOpen(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const me = session?.user;

  // Group slots by date (YYYY-MM-DD)
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
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        {isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : task ? (
          <>
            {task.image && (
              <img
                src={task.image}
                alt={task.title}
                className="w-full h-40 object-cover rounded-lg -mt-1"
              />
            )}
            <DialogHeader>
              <DialogTitle>{task.title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-1 text-sm">
              <div className="flex gap-2">
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
                <p className="text-gray-600 dark:text-gray-300 pt-1">{task.description}</p>
              )}
            </div>

            <Separator />

            {/* Slots grouped by date */}
            <div className="space-y-4">
              {Object.entries(slotsByDate).map(([dateKey, slots]) => (
                <div key={dateKey}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-2">
                    {format(new Date(dateKey), "EEEE d MMMM")}
                  </p>
                  <div className="space-y-2">
                    {slots.map((slot) => {
                      const myOccupation = slot.occupations[0];
                      const isOccupied = !!myOccupation?.isActive;
                      const activeCount = slot._count.occupations;
                      const isFull = activeCount >= slot.maxOccupants && !isOccupied;
                      const isPast = new Date(slot.date) < new Date();

                      return (
                        <div
                          key={slot.id}
                          className={`flex items-center justify-between rounded-lg border p-2.5 ${
                            isOccupied
                              ? "border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20"
                              : isPast
                              ? "border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 opacity-60"
                              : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                          }`}
                        >
                          <div>
                            <p className="text-sm font-medium">
                              {slot.slotStart && slot.slotEnd
                                ? `${format(new Date(slot.slotStart), "HH:mm")} – ${format(new Date(slot.slotEnd), "HH:mm")}`
                                : format(new Date(slot.date), "HH:mm")}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {activeCount}/{slot.maxOccupants} occupati
                            </p>
                          </div>
                          {!isPast ? (
                            <Button
                              size="sm"
                              variant={isOccupied ? "outline" : "default"}
                              disabled={isFull || toggleMut.isPending}
                              onClick={() =>
                                toggleMut.mutate({ slotId: slot.id, occupy: !isOccupied })
                              }
                              className="min-w-[80px]"
                            >
                              {isFull
                                ? "Pieno"
                                : isOccupied
                                ? "Libera"
                                : "Prenota"}
                            </Button>
                          ) : (
                            isOccupied && (
                              <Badge className="bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300 border-green-200 dark:border-green-700 text-xs">
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
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setFeedbackOpen(true)}
                >
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
                  onClick={() =>
                    submitFeedback.mutate({
                      taskId: task.id,
                      emoji: emoji!,
                      text: text || undefined,
                    })
                  }
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
