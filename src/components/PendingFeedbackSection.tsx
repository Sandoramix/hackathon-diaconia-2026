import { useState } from "react";
import { api } from "~/utils/api";
import { toast } from "sonner";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Frown, Meh, Smile, MapPin, CalendarDays, Clock } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import { Badge } from "~/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "~/components/ui/dialog";
import { cn } from "~/lib/utils";

type PendingEvent = {
  id: string;
  title: string;
  startDate: Date | string;
  endDate: Date | string;
  place: string | null;
  image: string | null;
  tags: { id: string; name: string }[];
};

type PendingTask = {
  id: string;
  title: string;
  image: string | null;
  tags: { id: string; name: string }[];
  slots: { date: Date | string; slotStart: Date | string | null; slotEnd: Date | string | null }[];
};

type FeedbackTarget =
  | { kind: "event"; item: PendingEvent }
  | { kind: "task"; item: PendingTask };

const EMOJI_OPTIONS: { value: 1 | 2 | 3; icon: React.ComponentType<{ className?: string }>; label: string; active: string; hover: string }[] = [
  { value: 1, icon: Frown,  label: "Non mi è piaciuto", active: "text-red-500 scale-125",    hover: "hover:text-red-400" },
  { value: 2, icon: Meh,    label: "Così così",         active: "text-amber-400 scale-125",  hover: "hover:text-amber-400" },
  { value: 3, icon: Smile,  label: "Mi è piaciuto",     active: "text-green-500 scale-125",  hover: "hover:text-green-400" },
];

function FeedbackModal({
  target,
  onClose,
  onDone,
}: {
  target: FeedbackTarget;
  onClose: () => void;
  onDone: () => void;
}) {
  const [emoji, setEmoji] = useState<1 | 2 | 3 | null>(null);
  const [text, setText] = useState("");

  const submit = api.feedback.submit.useMutation({
    onSuccess: () => {
      toast.success("Feedback inviato!");
      onDone();
    },
    onError: (e) => toast.error(e.message),
  });

  function handleSubmit() {
    if (!emoji) return;
    if (target.kind === "event") {
      submit.mutate({ emoji, text: text || undefined, eventId: target.item.id });
    } else {
      submit.mutate({ emoji, text: text || undefined, taskId: target.item.id });
    }
  }

  const item = target.item;
  const slot = target.kind === "task" ? target.item.slots[0] : null;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">Lascia il tuo feedback</DialogTitle>
        </DialogHeader>

        {/* Item details */}
        <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
          <div className="flex gap-3">
            {item.image && (
              <img src={item.image} alt={item.title} className="h-12 w-12 shrink-0 rounded-lg object-cover" />
            )}
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-tight text-gray-900 dark:text-gray-100">{item.title}</p>
              {target.kind === "event" && target.item.place && (
                <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-500">
                  <MapPin className="h-3 w-3" aria-hidden="true" />{target.item.place}
                </p>
              )}
              {target.kind === "event" && (
                <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-500">
                  <CalendarDays className="h-3 w-3" aria-hidden="true" />
                  <span className="capitalize">{format(new Date(target.item.startDate), "d MMM yyyy", { locale: it })}</span>
                </p>
              )}
              {slot && (
                <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-500">
                  <Clock className="h-3 w-3" aria-hidden="true" />
                  {slot.slotStart && slot.slotEnd
                    ? `${format(new Date(slot.slotStart), "HH:mm")} – ${format(new Date(slot.slotEnd), "HH:mm")}`
                    : format(new Date(slot.date), "d MMM, HH:mm", { locale: it })}
                </p>
              )}
              {item.tags.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {item.tags.slice(0, 3).map((t) => (
                    <Badge key={t.id} variant="secondary" className="text-xs">{t.name}</Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Emoji picker */}
        <div className="flex justify-center gap-6 py-2">
          {EMOJI_OPTIONS.map(({ value, icon: Icon, label, active, hover }) => (
            <button
              key={value}
              type="button"
              aria-label={label}
              aria-pressed={emoji === value}
              onClick={() => setEmoji(value)}
              className={cn(
                "flex flex-col items-center gap-1 transition-all duration-150",
                emoji === value ? active : cn("text-gray-300 dark:text-gray-600 opacity-60", hover),
              )}
            >
              <Icon className="h-10 w-10" aria-hidden="true" />
              <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
            </button>
          ))}
        </div>

        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Commento opzionale…"
          rows={2}
          className="text-sm"
        />

        <Button
          className="w-full"
          disabled={!emoji || submit.isPending}
          onClick={handleSubmit}
        >
          {submit.isPending ? "Invio…" : "Invia feedback"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

export function PendingFeedbackSection() {
  const utils = api.useUtils();
  const { data, isLoading } = api.feedback.pending.useQuery();
  const [active, setActive] = useState<FeedbackTarget | null>(null);

  if (isLoading || (!data?.events.length && !data?.tasks.length)) return null;

  const total = (data?.events.length ?? 0) + (data?.tasks.length ?? 0);

  return (
    <>
      <div className="space-y-2">
        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
          ⭐ Feedback in attesa ({total})
        </p>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {data?.events.map((ev) => (
            <button
              key={ev.id}
              type="button"
              onClick={() => setActive({ kind: "event", item: ev })}
              className="flex shrink-0 flex-col gap-1 rounded-xl border border-amber-200 bg-amber-50 p-3 text-left w-52 hover:border-amber-300 hover:bg-amber-100 transition-colors dark:border-amber-800 dark:bg-amber-900/20 dark:hover:bg-amber-900/30"
            >
              <div className="flex items-start gap-2">
                {ev.image && <img src={ev.image} alt="" className="h-9 w-9 shrink-0 rounded-md object-cover" />}
                <div className="min-w-0">
                  <p className="text-xs font-semibold leading-tight text-gray-900 dark:text-gray-100 line-clamp-2">{ev.title}</p>
                  {ev.place && (
                    <p className="mt-0.5 flex items-center gap-0.5 text-xs text-gray-500 truncate">
                      <MapPin className="h-2.5 w-2.5 shrink-0" />{ev.place}
                    </p>
                  )}
                </div>
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                {format(new Date(ev.startDate), "d MMM", { locale: it })}
              </p>
              <span className="self-start rounded-full bg-amber-200 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-800/40 dark:text-amber-300">
                Lascia feedback →
              </span>
            </button>
          ))}
          {data?.tasks.map((task) => {
            const slot = task.slots[0];
            return (
              <button
                key={task.id}
                type="button"
                onClick={() => setActive({ kind: "task", item: task })}
                className="flex shrink-0 flex-col gap-1 rounded-xl border border-amber-200 bg-amber-50 p-3 text-left w-52 hover:border-amber-300 hover:bg-amber-100 transition-colors dark:border-amber-800 dark:bg-amber-900/20 dark:hover:bg-amber-900/30"
              >
                <div className="flex items-start gap-2">
                  {task.image && <img src={task.image} alt="" className="h-9 w-9 shrink-0 rounded-md object-cover" />}
                  <div className="min-w-0">
                    <p className="text-xs font-semibold leading-tight text-gray-900 dark:text-gray-100 line-clamp-2">{task.title}</p>
                    {slot && (
                      <p className="mt-0.5 text-xs text-gray-500">
                        {format(new Date(slot.date), "d MMM", { locale: it })}
                      </p>
                    )}
                  </div>
                </div>
                <span className="self-start rounded-full bg-amber-200 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-800/40 dark:text-amber-300">
                  Lascia feedback →
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {active && (
        <FeedbackModal
          target={active}
          onClose={() => setActive(null)}
          onDone={() => {
            setActive(null);
            void utils.feedback.pending.invalidate();
          }}
        />
      )}
    </>
  );
}
