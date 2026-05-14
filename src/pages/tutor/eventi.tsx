import { useState, useContext, useEffect, useRef, type ReactNode } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { getDashboardLayout } from "~/layouts/DashboardLayout";
import { HeaderActionsContext } from "~/layouts/DashboardLayout";
import type { NextPageWithLayout } from "../_app";
import { api } from "~/utils/api";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { DateTimePicker } from "~/components/ui/date-time-picker";
import { Label } from "~/components/ui/label";
import { Badge } from "~/components/ui/badge";
import { Textarea } from "~/components/ui/textarea";
import { Switch } from "~/components/ui/switch";
import { Separator } from "~/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { toast } from "sonner";
import {
  Plus, Pencil, Trash2, MapPin, Users, Search, UserPlus, X,
  Loader2, Copy, Tag, CalendarDays, ChevronLeft, ChevronRight,
  RefreshCw, Eye, List,
} from "lucide-react";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import { cn } from "~/lib/utils";
import { format, isSameDay, startOfDay, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isSameMonth, isToday } from "date-fns";
import { it } from "date-fns/locale";
import { DateStrip, EventDetailDialog } from "~/pages/studente/eventi";

const eventSchema = z
  .object({
    title: z.string().min(1, "Obbligatorio"),
    description: z.string().optional(),
    place: z.string().optional(),
    startDate: z.string().min(1, "Obbligatorio"),
    endDate: z.string().min(1, "Obbligatorio"),
    userLimit: z.string().optional(),
    hasFeedback: z.boolean(),
  })
  .refine((d) => !d.startDate || !d.endDate || new Date(d.startDate) < new Date(d.endDate), {
    message: "La fine deve essere dopo l'inizio",
    path: ["endDate"],
  });

type EventForm = z.infer<typeof eventSchema>;

// ─── Month calendar modal (tutor variant — no enrolled dots) ──────────────────

function MonthCalendarModal({
  open, onClose, highlightedDates, selected, onSelect,
}: {
  open: boolean;
  onClose: () => void;
  highlightedDates: Date[];
  selected: Date;
  onSelect: (d: Date) => void;
}) {
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(selected));

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
              const hasEvent = inMonth && highlightedDates.some((d) => isSameDay(d, day));
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
                  {hasEvent
                    ? <span className={cn("mt-0.5 h-1.5 w-1.5 rounded-full", isSelected ? "bg-blue-200" : "bg-blue-500")} />
                    : <span className="mt-0.5 h-1.5 w-1.5" />}
                </button>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

const EventiPage: NextPageWithLayout = function EventiPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [managingId, setManagingId] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [image, setImage] = useState<string | undefined>(undefined);
  const [view, setView] = useState<"list" | "calendar">("list");
  const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(new Date()));
  const [calOpen, setCalOpen] = useState(false);

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setImage(reader.result as string);
    reader.readAsDataURL(file);
  }

  useEffect(() => {
    if (status === "unauthenticated") void router.replace("/auth/tipo");
    if (status === "authenticated" && session.user.role === "STUDENTE") {
      void router.replace("/studente");
    }
  }, [status, session, router]);

  const utils = api.useUtils();
  const { data: existingTags = [] } = api.event.listTags.useQuery(undefined, {
    enabled: status === "authenticated",
  });
  const { data: events = [], isLoading } = api.event.list.useQuery(
    { upcoming: false },
    { enabled: status === "authenticated" },
  );

  // Header actions
  const { setHeaderActions } = useContext(HeaderActionsContext);
  const setCalOpenRef = useRef(setCalOpen);
  setCalOpenRef.current = setCalOpen;
  const setViewRef = useRef(setView);
  setViewRef.current = setView;
  const viewRef = useRef(view);
  viewRef.current = view;
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
        <button type="button"
          onClick={() => setViewRef.current(viewRef.current === "list" ? "calendar" : "list")}
          className="flex h-9 w-9 items-center justify-center rounded-full text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
          aria-label="Cambia vista">
          <List className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    );
    return () => setHeaderActions(null);
  }, [setHeaderActions]);

  const createMut = api.event.create.useMutation({
    onSuccess: () => { toast.success("Evento creato"); void utils.event.list.invalidate(); closeForm(); },
    onError: (e) => toast.error(e.message),
  });

  const updateMut = api.event.update.useMutation({
    onSuccess: () => { toast.success("Evento aggiornato"); void utils.event.list.invalidate(); closeForm(); },
    onError: (e) => toast.error(e.message),
  });

  const deleteMut = api.event.delete.useMutation({
    onSuccess: () => { toast.success("Evento eliminato"); void utils.event.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const form = useForm<EventForm>({
    resolver: zodResolver(eventSchema),
    defaultValues: { hasFeedback: true },
  });

  function openCreate() {
    setEditId(null); setTags([]); setTagInput(""); form.reset({ hasFeedback: true }); setShowForm(true);
  }

  function openEdit(event: (typeof events)[0]) {
    setEditId(event.id);
    setTags(event.tags.map((t) => t.name));
    setTagInput("");
    setImage(event.image ?? undefined);
    form.reset({
      title: event.title,
      description: event.description ?? "",
      place: event.place ?? "",
      startDate: new Date(event.startDate).toISOString().slice(0, 16),
      endDate: new Date(event.endDate).toISOString().slice(0, 16),
      userLimit: event.userLimit?.toString() ?? "",
      hasFeedback: event.hasFeedback,
    });
    setShowForm(true);
  }

  function openDuplicate(event: (typeof events)[0]) {
    setEditId(null);
    setTags(event.tags.map((t) => t.name));
    setTagInput("");
    setImage(event.image ?? undefined);
    form.reset({
      title: event.title + " (copia)",
      description: event.description ?? "",
      place: event.place ?? "",
      startDate: "",
      endDate: "",
      userLimit: event.userLimit?.toString() ?? "",
      hasFeedback: event.hasFeedback,
    });
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false); setEditId(null); setTags([]); setTagInput(""); setImage(undefined); form.reset();
  }

  function onSubmit(data: EventForm) {
    const payload = {
      title: data.title,
      description: data.description || undefined,
      place: data.place || undefined,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      userLimit: data.userLimit ? parseInt(data.userLimit) : undefined,
      hasFeedback: data.hasFeedback,
      tagNames: tags,
      image,
    };
    if (editId) {
      updateMut.mutate({ id: editId, ...payload });
    } else {
      createMut.mutate(payload);
    }
  }

  if (status !== "authenticated") return null;

  const eventDates = events.map((e) => new Date(e.startDate));
  const displayedEvents = view === "calendar"
    ? events.filter((e) => isSameDay(new Date(e.startDate), selectedDate))
    : events;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        {/* View toggle */}
        <div className="flex gap-1 rounded-lg border border-gray-200 bg-gray-50 p-0.5 dark:border-gray-700 dark:bg-gray-800">
          <button
            onClick={() => setView("list")}
            className={cn("flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              view === "list" ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-gray-100" : "text-gray-500 hover:text-gray-700 dark:text-gray-400")}
          >
            <List className="h-3.5 w-3.5" aria-hidden="true" /> Lista
          </button>
          <button
            onClick={() => setView("calendar")}
            className={cn("flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              view === "calendar" ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-gray-100" : "text-gray-500 hover:text-gray-700 dark:text-gray-400")}
          >
            <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" /> Calendario
          </button>
        </div>

        <Button onClick={openCreate} className="gap-1.5">
          <Plus className="h-4 w-4" aria-hidden="true" />
          Nuovo evento
        </Button>
      </div>

      {/* Calendar date strip */}
      {view === "calendar" && (
        <DateStrip
          selected={selectedDate}
          onChange={setSelectedDate}
          highlightedDates={eventDates}
        />
      )}

      {isLoading && <p className="py-8 text-center text-sm text-gray-500">Caricamento...</p>}

      {!isLoading && displayedEvents.length === 0 && (
        <div className="py-10 text-center">
          <CalendarDays className="mx-auto mb-3 h-9 w-9 text-gray-300 dark:text-gray-600" aria-hidden="true" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {view === "calendar"
              ? <>Nessun evento il <span className="font-medium capitalize">{format(selectedDate, "d MMMM", { locale: it })}</span></>
              : "Nessun evento"}
          </p>
        </div>
      )}

      {/* Event rows */}
      <div className="space-y-2">
        {displayedEvents.map((event) => (
          <div key={event.id}
            className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800">
            {event.image && (
              <img src={event.image} alt={event.title} className="h-14 w-14 shrink-0 rounded-lg object-cover" />
            )}
            <div className="min-w-0 flex-1">
              <p className="font-semibold leading-tight text-gray-900 dark:text-gray-100">{event.title}</p>
              {event.place && (
                <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                  <MapPin className="h-3 w-3" aria-hidden="true" />{event.place}
                </p>
              )}
              <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                <CalendarDays className="h-3 w-3" aria-hidden="true" />
                <span className="capitalize">{format(new Date(event.startDate), "d MMM yyyy", { locale: it })}</span>
                <span className="mx-1">·</span>
                {format(new Date(event.startDate), "HH:mm")} — {format(new Date(event.endDate), "HH:mm")}
              </p>
              <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                <Users className="h-3 w-3" aria-hidden="true" />
                {event._count.participants}{event.userLimit ? `/${event.userLimit}` : ""} partecipanti
              </p>
              {event.tags.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {event.tags.map((t) => (
                    <Badge key={t.id} variant="secondary" className="text-xs">{t.name}</Badge>
                  ))}
                </div>
              )}
            </div>
            <div className="flex shrink-0 flex-col gap-1 sm:flex-row sm:items-center">
              <Button size="sm" variant="outline" className="gap-1.5 whitespace-nowrap" onClick={() => setManagingId(event.id)}>
                <Users className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">Partecipanti</span>
              </Button>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setPreviewId(event.id)} aria-label="Anteprima studente">
                  <Eye className="h-4 w-4" aria-hidden="true" />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openDuplicate(event)} aria-label="Duplica evento">
                  <Copy className="h-4 w-4" aria-hidden="true" />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(event)} aria-label="Modifica evento">
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600 hover:text-red-700 dark:text-red-400"
                  onClick={() => deleteMut.mutate({ id: event.id })} disabled={deleteMut.isPending} aria-label="Elimina evento">
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Month calendar modal */}
      <MonthCalendarModal
        open={calOpen}
        onClose={() => setCalOpen(false)}
        highlightedDates={eventDates}
        selected={selectedDate}
        onSelect={(d) => { setSelectedDate(d); setView("calendar"); setCalOpen(false); }}
      />

      {/* Student preview */}
      {previewId && (
        <EventDetailDialog
          eventId={previewId}
          onClose={() => setPreviewId(null)}
          previewMode
        />
      )}

      {/* Create/Edit dialog */}
      <Dialog open={showForm} onOpenChange={(o) => !o && closeForm()}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Modifica evento" : "Nuovo evento"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
            <Field label="Titolo*">
              <Input {...form.register("title")} />
              {form.formState.errors.title && (
                <p className="text-xs text-red-600">{form.formState.errors.title.message}</p>
              )}
            </Field>
            <Field label="Luogo">
              <Input {...form.register("place")} />
            </Field>
            <Field label="Descrizione">
              <Textarea rows={3} {...form.register("description")} />
            </Field>
            <Field label="Immagine">
              {image && (
                <div className="relative mb-2">
                  <img src={image} alt="preview" className="w-full h-32 object-cover rounded-lg" />
                  <button type="button" onClick={() => setImage(undefined)}
                    className="absolute top-1 right-1 rounded-full bg-black/50 px-1.5 py-0.5 text-xs text-white">✕</button>
                </div>
              )}
              <Input type="file" accept="image/*" onChange={handleImageChange} className="text-sm" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Data inizio*">
                <Controller control={form.control} name="startDate"
                  render={({ field }) => (
                    <DateTimePicker value={field.value ?? ""} onChange={(v) => {
                      field.onChange(v);
                      const end = form.getValues("endDate");
                      if (v && end && new Date(v) >= new Date(end)) {
                        const d = new Date(v);
                        d.setHours(d.getHours() + 1);
                        form.setValue("endDate", d.toISOString().slice(0, 16), { shouldValidate: true });
                      }
                    }} />
                  )} />
              </Field>
              <Field label="Data fine*">
                <Controller control={form.control} name="endDate"
                  render={({ field }) => <DateTimePicker value={field.value ?? ""} onChange={field.onChange} />} />
                {form.formState.errors.endDate && (
                  <p className="col-span-2 text-xs text-red-600">{form.formState.errors.endDate.message}</p>
                )}
              </Field>
            </div>
            <Field label="Limite studenti (opzionale)">
              <Input type="number" min={1} {...form.register("userLimit")} />
            </Field>

            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                <Tag className="h-3.5 w-3.5" aria-hidden="true" />
                Tag
              </Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Aggiungi tag…"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  className="flex-1 text-sm"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const v = tagInput.trim();
                      if (v && !tags.includes(v)) setTags((p) => [...p, v]);
                      setTagInput("");
                    }
                  }}
                />
                <Button type="button" variant="outline" size="sm" onClick={() => {
                  const v = tagInput.trim();
                  if (v && !tags.includes(v)) setTags((p) => [...p, v]);
                  setTagInput("");
                }}>
                  <Plus className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
              {tagInput && existingTags.filter(t => t.name.toLowerCase().includes(tagInput.toLowerCase()) && !tags.includes(t.name)).length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {existingTags.filter(t => t.name.toLowerCase().includes(tagInput.toLowerCase()) && !tags.includes(t.name)).map(t => (
                    <button key={t.id} type="button" onClick={() => { setTags(p => [...p, t.name]); setTagInput(""); }}
                      className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs text-blue-700 hover:bg-blue-100 dark:border-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
                      {t.name}
                    </button>
                  ))}
                </div>
              )}
              {!tagInput && existingTags.filter(t => !tags.includes(t.name)).length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {existingTags.filter(t => !tags.includes(t.name)).map(t => (
                    <button key={t.id} type="button" onClick={() => setTags(p => [...p, t.name])}
                      className="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs text-gray-600 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
                      {t.name}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap gap-1">
                {tags.map((t) => (
                  <Badge key={t} variant="secondary" className="cursor-pointer text-xs" onClick={() => setTags((p) => p.filter((x) => x !== t))}>
                    {t} ×
                  </Badge>
                ))}
              </div>
            </div>

            <Separator />
            <div className="flex items-center gap-2">
              <Controller control={form.control} name="hasFeedback"
                render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />} />
              <Label>Abilita feedback studenti</Label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={closeForm}>Annulla</Button>
              <Button type="submit" disabled={createMut.isPending || updateMut.isPending} className="gap-1.5">
                {(createMut.isPending || updateMut.isPending) && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                {(createMut.isPending || updateMut.isPending) ? "Salvataggio…" : editId ? "Salva" : "Crea"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {managingId && (
        <ParticipantDialog eventId={managingId} onClose={() => setManagingId(null)} />
      )}
    </div>
  );
};

// ─── Participant dialog ───────────────────────────────────────────────────────

function ParticipantDialog({ eventId, onClose }: { eventId: string; onClose: () => void }) {
  const utils = api.useUtils();
  const [search, setSearch] = useState("");
  const { data: event, isLoading } = api.event.getById.useQuery({ id: eventId });
  const { data: rawAllUsers = [] } = api.user.list.useQuery({ role: "STUDENTE" });
  const allUsers = rawAllUsers as Array<{ id: string; name: string | null; username: string; deletedAt: Date | null }>;

  const assignMut = api.event.assignParticipant.useMutation({
    onSuccess: () => void utils.event.getById.invalidate({ id: eventId }),
    onError: (e) => toast.error(e.message),
  });

  // Tutor getById always includes user on each participant via Prisma include
  type EP = { userId: string; user: { id: string; name: string | null; username: string } };
  const enrolled = ((event?.participants ?? []) as EP[]).map((p) => p.user);
  const participantIds = new Set(enrolled.map((u) => u.id));
  const lowerSearch = search.toLowerCase();
  const notEnrolled = allUsers
    .filter((u) => !participantIds.has(u.id) && !u.deletedAt)
    .filter((u) =>
      (u.name ?? "").toLowerCase().includes(lowerSearch) ||
      u.username.toLowerCase().includes(lowerSearch),
    );

  const limit = event?.userLimit ?? null;
  const count = participantIds.size;
  const isFull = limit !== null && count >= limit;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex max-h-[85vh] max-w-md flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" aria-hidden="true" />
            Partecipanti
          </DialogTitle>
          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{event?.title}</p>
        </DialogHeader>

        {isLoading ? (
          <p className="py-6 text-center text-sm text-gray-500">Caricamento...</p>
        ) : (
          <div className="flex flex-1 flex-col gap-3 overflow-hidden">
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                  {count}{limit ? `/${limit}` : ""} iscritti
                </p>
                {isFull && <Badge variant="destructive" className="text-xs">Completo</Badge>}
              </div>
              {limit && (
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                  <div
                    className={cn("h-full rounded-full transition-all",
                      count / limit >= 1 ? "bg-red-500" : count / limit >= 0.8 ? "bg-orange-400" : "bg-blue-500")}
                    style={{ width: `${Math.min(100, (count / limit) * 100)}%` }}
                    role="progressbar" aria-valuenow={count} aria-valuemax={limit}
                  />
                </div>
              )}
            </div>

            {enrolled.length > 0 && (
              <div>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                  Iscritti ({enrolled.length})
                </p>
                <div className="space-y-1">
                  {enrolled.map((u) => {
                    const initials = (u.name ?? u.username).slice(0, 2).toUpperCase();
                    return (
                      <div key={u.id}
                        className="flex items-center gap-3 rounded-lg border border-green-100 bg-green-50 px-3 py-2 dark:border-green-800 dark:bg-green-900/20">
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarFallback className="bg-green-100 text-xs font-semibold text-green-700 dark:bg-green-900/40 dark:text-green-300">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-gray-800 dark:text-gray-100">{u.name ?? u.username}</p>
                          {u.name && <p className="truncate font-mono text-xs text-gray-500">@{u.username}</p>}
                        </div>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500 hover:text-red-700 dark:text-red-400"
                          onClick={() => assignMut.mutate({ eventId, userId: u.id, assign: false })}
                          disabled={assignMut.isPending} aria-label={`Rimuovi ${u.name ?? u.username}`}>
                          <X className="h-3.5 w-3.5" aria-hidden="true" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {!isFull && (
              <div className="flex flex-1 flex-col gap-2 overflow-hidden">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
                  <Input placeholder="Aggiungi studente…" value={search} onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 text-sm" aria-label="Cerca studente da aggiungere" />
                </div>
                <div className="flex-1 overflow-y-auto space-y-1 pr-0.5">
                  {notEnrolled.map((u) => {
                    const initials = (u.name ?? u.username).slice(0, 2).toUpperCase();
                    return (
                      <button key={u.id}
                        onClick={() => assignMut.mutate({ eventId, userId: u.id, assign: true })}
                        disabled={assignMut.isPending}
                        className="flex w-full items-center gap-3 rounded-lg border border-gray-200 px-3 py-2 text-left transition-colors hover:border-blue-200 hover:bg-blue-50 dark:border-gray-700 dark:hover:border-blue-700 dark:hover:bg-blue-900/20">
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarFallback className="bg-blue-100 text-xs font-semibold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-gray-700 dark:text-gray-300">{u.name ?? u.username}</p>
                          {u.name && <p className="truncate font-mono text-xs text-gray-500">@{u.username}</p>}
                        </div>
                        <UserPlus className="h-4 w-4 shrink-0 text-gray-400 dark:text-gray-500" aria-hidden="true" />
                      </button>
                    );
                  })}
                  {notEnrolled.length === 0 && search && (
                    <p className="py-4 text-center text-xs text-gray-400">Nessun risultato</p>
                  )}
                  {notEnrolled.length === 0 && !search && (
                    <p className="py-4 text-center text-xs text-gray-400">Tutti gli studenti sono iscritti</p>
                  )}
                </div>
              </div>
            )}

            {isFull && (
              <p className="text-center text-sm text-red-500">
                Evento al completo — rimuovi partecipanti per aggiungerne altri
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-gray-600">{label}</Label>
      {children}
    </div>
  );
}

EventiPage.getLayout = getDashboardLayout("Eventi", { wide: true });

export default EventiPage;
