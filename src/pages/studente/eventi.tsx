import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";
import { getDashboardLayout } from "~/layouts/DashboardLayout";
import type { NextPageWithLayout } from "../_app";
import { api } from "~/utils/api";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Skeleton } from "~/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Separator } from "~/components/ui/separator";
import { Textarea } from "~/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Scheduler } from "calendarkit-pro";
import type { CalendarEvent, ViewType } from "calendarkit-pro";
import { toast } from "sonner";
import { format, isSameDay, addDays, startOfDay } from "date-fns";
import { cn } from "~/lib/utils";

const EMOJI_MAP: Record<number, string> = { 1: "😕", 2: "😐", 3: "😊" };

// Horizontal scrollable date strip
function DateStrip({
  selected,
  onChange,
  highlightedDates,
}: {
  selected: Date | null;
  onChange: (d: Date) => void;
  highlightedDates: Date[];
}) {
  const today = startOfDay(new Date());
  const days = Array.from({ length: 60 }, (_, i) => addDays(today, i));
  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll selected date into view
  useEffect(() => {
    if (!scrollRef.current) return;
    const idx = selected ? days.findIndex((d) => isSameDay(d, selected)) : 0;
    const el = scrollRef.current.children[idx] as HTMLElement | undefined;
    el?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [selected]);

  return (
    <div
      ref={scrollRef}
      className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide"
      style={{ scrollbarWidth: "none" }}
    >
      {days.map((day) => {
        const isSelected = selected ? isSameDay(day, selected) : false;
        const hasEvent = highlightedDates.some((d) => isSameDay(d, day));
        const isToday = isSameDay(day, today);

        return (
          <button
            key={day.toISOString()}
            onClick={() => onChange(isSelected ? today : day)}
            className={cn(
              "flex shrink-0 flex-col items-center rounded-xl px-3 py-2 text-center transition-colors",
              isSelected
                ? "bg-blue-600 text-white"
                : isToday
                ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 border border-blue-200 dark:border-blue-700"
                : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700",
            )}
          >
            <span className="text-[10px] font-medium uppercase">
              {format(day, "EEE")}
            </span>
            <span className="text-base font-bold leading-tight">{format(day, "d")}</span>
            <span className="text-[10px]">{format(day, "MMM")}</span>
            {hasEvent && (
              <span
                className={cn(
                  "mt-0.5 h-1 w-1 rounded-full",
                  isSelected ? "bg-white" : "bg-blue-500",
                )}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

const StudentiEventiPage: NextPageWithLayout = function StudentiEventiPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(new Date()));
  const [detailId, setDetailId] = useState<string | null>(null);
  const [calView, setCalView] = useState<ViewType>("month");
  const [calDate, setCalDate] = useState(new Date());

  useEffect(() => {
    if (status === "unauthenticated") void router.replace("/auth/tipo");
    if (status === "authenticated" && session.user.mustChangePassword) {
      void router.replace("/auth/cambio-password");
    }
  }, [status, session, router]);

  const utils = api.useUtils();
  const { data: events = [], isLoading } = api.event.list.useQuery(
    { upcoming: false },
    { enabled: status === "authenticated" },
  );

  const toggleMut = api.event.toggleRegistration.useMutation({
    onSuccess: () => {
      void utils.event.list.invalidate();
      void utils.event.getById.invalidate({ id: detailId! });
      toast.success("Iscrizione aggiornata");
    },
    onError: (e) => toast.error(e.message),
  });

  if (status !== "authenticated") return null;

  const eventDates = events.map((e) => new Date(e.startDate));
  const filteredEvents = events.filter((e) => isSameDay(new Date(e.startDate), selectedDate));

  const calEvents: CalendarEvent[] = events.map((e) => ({
    id: e.id,
    title: e.title,
    start: new Date(e.startDate),
    end: new Date(e.endDate),
    description: e.description ?? undefined,
    color: e.participants.length > 0 ? "#16a34a" : "#3b82f6",
  }));

  return (
    <div className="space-y-4 overflow-x-hidden">
      <Tabs defaultValue="lista" className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="lista" className="flex-1">Lista</TabsTrigger>
          <TabsTrigger value="calendario" className="flex-1">Calendario</TabsTrigger>
        </TabsList>

        {/* ── Lista ── */}
        <TabsContent value="lista" className="space-y-3 pt-3">
          {/* Date strip */}
          <DateStrip
            selected={selectedDate}
            onChange={setSelectedDate}
            highlightedDates={eventDates}
          />

          {isLoading && <Skeleton className="h-20 w-full" />}

          {!isLoading && filteredEvents.length === 0 && (
            <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
              Nessun evento il {format(selectedDate, "d MMMM")}
            </p>
          )}

          {filteredEvents.map((event) => {
            const isRegistered = event.participants.length > 0;
            const isFull =
              !!event.userLimit &&
              event._count.participants >= event.userLimit &&
              !isRegistered;

            return (
              <button
                key={event.id}
                onClick={() => setDetailId(event.id)}
                className="flex w-full items-start gap-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 text-left hover:border-blue-200 dark:hover:border-blue-700 hover:bg-blue-50/30 dark:hover:bg-blue-900/20 transition-colors"
              >
                {event.image && (
                  <img
                    src={event.image}
                    alt={event.title}
                    className="h-14 w-14 rounded-lg object-cover shrink-0"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-sm leading-tight">{event.title}</p>
                    {isRegistered && (
                      <Badge className="shrink-0 bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300 border-green-200 dark:border-green-700 text-xs">✓</Badge>
                    )}
                  </div>
                  {event.place && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">📍 {event.place}</p>}
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    {format(new Date(event.startDate), "HH:mm")} — {format(new Date(event.endDate), "HH:mm")}
                  </p>
                  {isFull && (
                    <Badge variant="outline" className="mt-1 text-xs text-red-600 border-red-200">
                      Al completo
                    </Badge>
                  )}
                  {event.tags.length > 0 && (
                    <div className="flex gap-1 flex-wrap mt-1">
                      {event.tags.map((t) => (
                        <Badge key={t.id} variant="secondary" className="text-xs">{t.name}</Badge>
                      ))}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </TabsContent>

        {/* ── Calendario ── */}
        <TabsContent value="calendario" className="pt-3">
          <div className="h-[600px] rounded-xl overflow-hidden border">
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

      {detailId && (
        <EventDetailDialog
          eventId={detailId}
          onClose={() => setDetailId(null)}
          onToggle={(id, register) => toggleMut.mutate({ eventId: id, register })}
          toggling={toggleMut.isPending}
        />
      )}
    </div>
  );
};

function EventDetailDialog({
  eventId,
  onClose,
  onToggle,
  toggling,
}: {
  eventId: string;
  onClose: () => void;
  onToggle: (id: string, register: boolean) => void;
  toggling: boolean;
}) {
  const { data: session } = useSession();
  const { data: event, isLoading } = api.event.getById.useQuery({ id: eventId });
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [emoji, setEmoji] = useState<number | null>(null);
  const [text, setText] = useState("");

  const submitFeedback = api.feedback.submit.useMutation({
    onSuccess: () => {
      toast.success("Feedback inviato");
      setFeedbackOpen(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const isRegistered = event?.participants.some((p) => p.userId === session?.user.id) ?? false;
  const isFull = !!event?.userLimit && (event._count.participants ?? 0) >= event.userLimit && !isRegistered;
  const isPast = event ? new Date(event.endDate) < new Date() : false;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        {isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : event ? (
          <>
            {event.image && (
              <img src={event.image} alt={event.title} className="w-full h-44 object-cover rounded-lg -mt-1" />
            )}
            <DialogHeader>
              <DialogTitle>{event.title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-2 text-sm">
              {event.place && <p className="text-gray-600 dark:text-gray-300">📍 {event.place}</p>}
              <p className="text-gray-600 dark:text-gray-300">
                📅 {format(new Date(event.startDate), "d MMM yyyy · HH:mm")} — {format(new Date(event.endDate), "HH:mm")}
              </p>
              {event.userLimit && (
                <p className="text-gray-600 dark:text-gray-300">👥 {event._count.participants}/{event.userLimit} posti</p>
              )}
              {event.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {event.tags.map((t) => (
                    <Badge key={t.id} variant="secondary" className="text-xs">{t.name}</Badge>
                  ))}
                </div>
              )}
              {event.description && (
                <>
                  <Separator />
                  <p className="text-gray-700 dark:text-gray-200 whitespace-pre-line">{event.description}</p>
                </>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              {!isPast && (
                <Button
                  className="flex-1"
                  variant={isRegistered ? "outline" : "default"}
                  disabled={isFull || toggling}
                  onClick={() => onToggle(event.id, !isRegistered)}
                >
                  {isFull ? "Al completo" : isRegistered ? "Annulla iscrizione" : "Iscriviti"}
                </Button>
              )}
              {isPast && isRegistered && event.hasFeedback && !feedbackOpen && (
                <Button variant="outline" className="flex-1" onClick={() => setFeedbackOpen(true)}>
                  ⭐ Lascia feedback
                </Button>
              )}
            </div>

            {feedbackOpen && (
              <div className="space-y-3 rounded-lg border p-3">
                <p className="text-sm font-medium">Come è andata?</p>
                <div className="flex justify-center gap-4">
                  {[1, 2, 3].map((v) => (
                    <button key={v} onClick={() => setEmoji(v)}
                      className={`text-3xl transition-transform hover:scale-110 ${emoji === v ? "scale-125" : "opacity-50"}`}>
                      {EMOJI_MAP[v]}
                    </button>
                  ))}
                </div>
                <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Commento opzionale..." rows={2} />
                <Button className="w-full" disabled={!emoji || submitFeedback.isPending}
                  onClick={() => submitFeedback.mutate({ eventId: event.id, emoji: emoji!, text: text || undefined })}>
                  Invia
                </Button>
              </div>
            )}
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

StudentiEventiPage.getLayout = getDashboardLayout("Eventi");

export default StudentiEventiPage;
