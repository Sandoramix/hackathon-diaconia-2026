import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { useContext, useEffect, useRef, useState } from "react";
import { getDashboardLayout } from "~/layouts/DashboardLayout";
import { HeaderActionsContext } from "~/layouts/DashboardLayout";
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
  format, isSameDay, addDays, startOfDay, startOfMonth, endOfMonth,
  eachDayOfInterval, startOfWeek, endOfWeek, addMonths, subMonths, isSameMonth, isToday,
} from "date-fns";
import { it } from "date-fns/locale";
import { cn } from "~/lib/utils";
import { MapPin, Users, CalendarDays, ChevronLeft, ChevronRight, RefreshCw, Frown, Meh, Smile } from "lucide-react";
import { PendingFeedbackSection } from "~/components/PendingFeedbackSection";

const EMOJI_ICONS: Record<number, React.ComponentType<{ className?: string }>> = { 1: Frown, 2: Meh, 3: Smile };
const EMOJI_COLORS: Record<number, string> = { 1: "text-red-500", 2: "text-amber-400", 3: "text-green-500" };

// ─── Shared DateStrip ─────────────────────────────────────────────────────────

export function DateStrip({
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

  useEffect(() => {
    if (!scrollRef.current) return;
    const idx = selected ? days.findIndex((d) => isSameDay(d, selected)) : 0;
    const el = scrollRef.current.children[idx] as HTMLElement | undefined;
    el?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [selected]);

  return (
    <div ref={scrollRef} className="flex gap-2 overflow-x-auto pb-1" role="list" aria-label="Selezione data">
      {days.map((day) => {
        const isSelected = selected ? isSameDay(day, selected) : false;
        const hasItem = highlightedDates.some((d) => isSameDay(d, day));
        const todayDay = isSameDay(day, today);
        return (
          <button
            key={day.toISOString()}
            role="listitem"
            onClick={() => onChange(day)}
            aria-label={format(day, "EEEE d MMMM yyyy", { locale: it })}
            aria-pressed={isSelected}
            className={cn(
              "flex shrink-0 flex-col items-center rounded-xl px-3 py-2 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
              isSelected
                ? "bg-blue-600 text-white"
                : todayDay
                ? "border border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-900/20 dark:text-blue-300"
                : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700",
            )}
          >
            <span className="text-xs font-medium uppercase">{format(day, "EEE", { locale: it })}</span>
            <span className="text-base font-bold leading-tight">{format(day, "d")}</span>
            <span className="text-xs capitalize">{format(day, "MMM", { locale: it })}</span>
            {hasItem && (
              <span className={cn("mt-0.5 h-1 w-1 rounded-full", isSelected ? "bg-white" : "bg-blue-500")} aria-hidden="true" />
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─── Month Calendar (for modal) ───────────────────────────────────────────────

export function MonthCalendarModal({
  open,
  onClose,
  highlightedDates,
  enrolledDates,
  selected,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  highlightedDates: Date[];
  enrolledDates: Date[];
  selected: Date;
  onSelect: (d: Date) => void;
}) {
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(selected));

  function getDayInfo(day: Date) {
    const hasEvent = highlightedDates.some((d) => isSameDay(d, day));
    const isEnrolled = enrolledDates.some((d) => isSameDay(d, day));
    return { hasEvent, isEnrolled };
  }

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(viewMonth), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(viewMonth), { weekStartsOn: 1 }),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm p-4">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" aria-hidden="true" />
            Calendario eventi
          </DialogTitle>
        </DialogHeader>

        <div>
          <div className="mb-3 flex items-center justify-between">
            <button onClick={() => setViewMonth((m) => subMonths(m, 1))} aria-label="Mese precedente"
              className="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <p className="text-sm font-semibold capitalize">{format(viewMonth, "MMMM yyyy", { locale: it })}</p>
            <button onClick={() => setViewMonth((m) => addMonths(m, 1))} aria-label="Mese successivo"
              className="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="mb-1 grid grid-cols-7">
            {["Lu", "Ma", "Me", "Gi", "Ve", "Sa", "Do"].map((d) => (
              <p key={d} className="text-center text-xs font-semibold uppercase tracking-wide text-gray-400">{d}</p>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0.5">
            {days.map((day) => {
              const inMonth = isSameMonth(day, viewMonth);
              const isSelected = isSameDay(day, selected);
              const { hasEvent, isEnrolled } = inMonth ? getDayInfo(day) : { hasEvent: false, isEnrolled: false };
              const todayDay = isToday(day);
              return (
                <button key={day.toISOString()}
                  onClick={() => { onSelect(day); onClose(); }}
                  disabled={!inMonth}
                  aria-label={format(day, "d MMMM", { locale: it })}
                  className={cn(
                    "flex flex-col items-center rounded-lg py-1 transition-colors",
                    !inMonth && "pointer-events-none opacity-0",
                    isSelected && "bg-blue-600 text-white",
                    !isSelected && todayDay && "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300",
                    !isSelected && !todayDay && "hover:bg-gray-100 text-gray-700 dark:hover:bg-gray-700 dark:text-gray-300",
                  )}>
                  <span className="text-xs font-medium leading-5">{format(day, "d")}</span>
                  {(hasEvent || isEnrolled) ? (
                    <span className={cn("mt-0.5 h-1.5 w-1.5 rounded-full",
                      isEnrolled ? (isSelected ? "bg-green-300" : "bg-green-500")
                        : isSelected ? "bg-blue-200" : "bg-blue-500")} />
                  ) : <span className="mt-0.5 h-1.5 w-1.5" />}
                </button>
              );
            })}
          </div>

          <div className="mt-2 flex gap-4 border-t border-gray-100 pt-2 dark:border-gray-700">
            <span className="flex items-center gap-1.5 text-xs text-gray-500">
              <span className="h-2 w-2 rounded-full bg-blue-500" /> Evento
            </span>
            <span className="flex items-center gap-1.5 text-xs text-gray-500">
              <span className="h-2 w-2 rounded-full bg-green-500" /> Iscritto
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

const StudentiEventiPage: NextPageWithLayout = function StudentiEventiPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(new Date()));
  const [detailId, setDetailId] = useState<string | null>(null);
  const [calOpen, setCalOpen] = useState(false);

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

  // Inject header actions
  const { setHeaderActions } = useContext(HeaderActionsContext);
  const setCalOpenRef = useRef(setCalOpen);
  setCalOpenRef.current = setCalOpen;
  const refetchRef = useRef(() => void utils.event.list.invalidate());
  refetchRef.current = () => void utils.event.list.invalidate();

  useEffect(() => {
    setHeaderActions(
      <div className="flex items-center gap-0.5 mr-1">
        <button type="button" onClick={() => refetchRef.current()}
          className="flex h-9 w-9 items-center justify-center rounded-full text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
          aria-label="Ricarica eventi">
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
        </button>
        <button type="button" onClick={() => setCalOpenRef.current(true)}
          className="flex h-9 w-9 items-center justify-center rounded-full text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
          aria-label="Apri calendario">
          <CalendarDays className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    );
    return () => setHeaderActions(null);
  }, [setHeaderActions]);

  if (status !== "authenticated") return null;

  const now = new Date();
  const activeEvents = events.filter((e) => new Date(e.endDate) >= now);
  const eventDates = activeEvents.map((e) => new Date(e.startDate));
  const enrolledDates = activeEvents.filter((e) => e.participants.length > 0).map((e) => new Date(e.startDate));
  const filteredEvents = activeEvents.filter((e) => isSameDay(new Date(e.startDate), selectedDate));

  return (
    <div className="space-y-4">
      {/* Date strip */}
      <DateStrip
        selected={selectedDate}
        onChange={setSelectedDate}
        highlightedDates={eventDates}
      />

      {/* Pending feedbacks */}
      <PendingFeedbackSection />

      <div className="min-h-[120px] space-y-3">
        {isLoading && <Skeleton className="h-20 w-full" />}

        {!isLoading && filteredEvents.length === 0 && (
          <div className="pt-6 text-center">
            <CalendarDays className="mx-auto mb-3 h-9 w-9 text-gray-300 dark:text-gray-600" aria-hidden="true" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Nessun evento il <span className="font-medium capitalize">{format(selectedDate, "d MMMM", { locale: it })}</span>
            </p>
          </div>
        )}
        {filteredEvents.map((event) => {
          const isRegistered = event.participants.length > 0;
          const isFull = !!event.userLimit && event._count.participants >= event.userLimit && !isRegistered;

          return (
            <button key={event.id} onClick={() => setDetailId(event.id)}
              className="flex w-full items-start gap-3 rounded-xl border border-gray-200 bg-white p-3 text-left transition-colors hover:border-blue-200 hover:bg-blue-50/30 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-blue-700 dark:hover:bg-blue-900/20">
              {event.image && (
                <img src={event.image} alt={event.title} className="h-14 w-14 shrink-0 rounded-lg object-cover" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold leading-tight">{event.title}</p>
                  {isRegistered && (
                    <Badge className="shrink-0 bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300 border-0 text-xs">✓ Iscritto</Badge>
                  )}
                </div>
                {event.place && (
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                    <MapPin className="h-3 w-3" aria-hidden="true" />{event.place}
                  </p>
                )}
                <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                  <CalendarDays className="h-3 w-3" aria-hidden="true" />
                  {format(new Date(event.startDate), "HH:mm")} — {format(new Date(event.endDate), "HH:mm")}
                </p>
                {isFull && (
                  <Badge variant="outline" className="mt-1 border-red-200 text-xs text-red-600">Al completo</Badge>
                )}
                {event.tags.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {event.tags.map((t) => (
                      <Badge key={t.id} variant="secondary" className="text-xs">{t.name}</Badge>
                    ))}
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Calendar modal */}
      <MonthCalendarModal
        open={calOpen}
        onClose={() => setCalOpen(false)}
        highlightedDates={eventDates}
        enrolledDates={enrolledDates}
        selected={selectedDate}
        onSelect={(d) => { setSelectedDate(d); setCalOpen(false); }}
      />

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

// ─── Event detail dialog ──────────────────────────────────────────────────────

export function EventDetailDialog({
  eventId,
  onClose,
  onToggle,
  toggling,
  previewMode,
}: {
  eventId: string;
  onClose: () => void;
  onToggle?: (id: string, register: boolean) => void;
  toggling?: boolean;
  previewMode?: boolean;
}) {
  const { data: session } = useSession();
  const { data: event, isLoading } = api.event.getById.useQuery({ id: eventId });

  const isRegistered = event?.participants.some((p) => p.userId === session?.user.id) ?? false;
  const isFull = !!event?.userLimit && (event._count.participants ?? 0) >= event.userLimit && !isRegistered;
  const isPast = event ? new Date(event.endDate) < new Date() : false;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
        {isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : event ? (
          <>
            {event.image && (
              <img src={event.image} alt={event.title} className="-mt-1 w-full max-h-[45vh] rounded-lg object-cover" />
            )}
            <DialogHeader>
              <DialogTitle>{event.title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-2 text-sm">
              {event.place && (
                <div className="flex items-center gap-2">
                  <p className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300">
                    <MapPin className="h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
                    {event.place}
                  </p>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.place)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 hover:bg-blue-100 dark:border-blue-700 dark:bg-blue-900/20 dark:text-blue-300"
                    aria-label={`Apri ${event.place} su Google Maps`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    Maps →
                  </a>
                </div>
              )}
              <p className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300">
                <CalendarDays className="h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
                <span className="capitalize">{format(new Date(event.startDate), "EEEE d MMMM yyyy", { locale: it })}</span>
              </p>
              <p className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300 ml-5">
                {format(new Date(event.startDate), "HH:mm")} — {format(new Date(event.endDate), "HH:mm")}
              </p>
              {event.userLimit && (
                <p className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300">
                  <Users className="h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
                  {event._count.participants}/{event.userLimit} posti
                </p>
              )}
              {event.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {event.tags.map((t) => <Badge key={t.id} variant="secondary" className="text-xs">{t.name}</Badge>)}
                </div>
              )}
              {event.description && (
                <>
                  <Separator />
                  <p className="whitespace-pre-line text-gray-700 dark:text-gray-200">{event.description}</p>
                </>
              )}
            </div>

            {previewMode && (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-center text-xs text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
                Anteprima — vista studente
              </p>
            )}

            {!previewMode && !isPast && (
              <div className="flex gap-2 pt-2">
                <Button className="flex-1" variant={isRegistered ? "outline" : "default"} disabled={isFull || toggling} onClick={() => onToggle?.(event.id, !isRegistered)}>
                  {isFull ? "Al completo" : isRegistered ? "Annulla iscrizione" : "Iscriviti"}
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
