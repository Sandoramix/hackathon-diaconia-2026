import { useState, type ReactNode } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { getDashboardLayout } from "~/layouts/DashboardLayout";
import type { NextPageWithLayout } from "../_app";
import { api } from "~/utils/api";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { DateTimePicker, TimePicker } from "~/components/ui/date-time-picker";
import { Pencil, Trash2, Settings2, Loader2, Copy, Plus, Tag } from "lucide-react";
import { Label } from "~/components/ui/label";
import { Badge } from "~/components/ui/badge";
import { Textarea } from "~/components/ui/textarea";
import { Switch } from "~/components/ui/switch";
import { Card, CardContent } from "~/components/ui/card";
import { Separator } from "~/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { toast } from "sonner";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { cn } from "~/lib/utils";

const DAY_LABELS = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];

const taskSchema = z.object({
  title: z.string().min(1, "Obbligatorio"),
  description: z.string().optional(),
  type: z.enum(["OCCASIONAL", "RECURRENT"]),
  hasFeedback: z.boolean(),
  isCompletable: z.boolean(),
});

type TaskForm = z.infer<typeof taskSchema>;

const TaskPage: NextPageWithLayout = function TaskPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [managingId, setManagingId] = useState<string | null>(null);
  const [image, setImage] = useState<string | undefined>(undefined);
  const [recurrenceDays, setRecurrenceDays] = useState<number[]>([]);
  const [recurrenceWeeks, setRecurrenceWeeks] = useState(4);
  const [defaultMaxOccupants, setDefaultMaxOccupants] = useState(1);
  const [windowStart, setWindowStart] = useState("");
  const [windowEnd, setWindowEnd] = useState("");
  const [slotDurationHours, setSlotDurationHours] = useState<number | "">("");
  const [occasionalDate, setOccasionalDate] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [showFascia, setShowFascia] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") void router.replace("/auth/tipo");
    if (status === "authenticated" && session.user.role === "STUDENTE") {
      void router.replace("/studente");
    }
  }, [status, session, router]);

  const utils = api.useUtils();
  const { data: tasks = [], isLoading } = api.task.list.useQuery(undefined, {
    enabled: status === "authenticated",
  });
  const { data: existingTags = [] } = api.event.listTags.useQuery(undefined, {
    enabled: status === "authenticated",
  });

  const createMut = api.task.create.useMutation({
    onSuccess: () => {
      toast.success("Task creato");
      void utils.task.list.invalidate();
      closeForm();
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMut = api.task.update.useMutation({
    onSuccess: () => {
      toast.success("Task aggiornato");
      void utils.task.list.invalidate();
      closeForm();
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMut = api.task.delete.useMutation({
    onSuccess: () => {
      toast.success("Task eliminato");
      void utils.task.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const form = useForm<TaskForm>({
    resolver: zodResolver(taskSchema),
    defaultValues: { type: "OCCASIONAL", hasFeedback: true, isCompletable: false },
  });

  function closeForm() {
    setShowForm(false);
    setEditId(null);
    setImage(undefined);
    setRecurrenceDays([]);
    setRecurrenceWeeks(4);
    setDefaultMaxOccupants(1);
    setWindowStart("");
    setWindowEnd("");
    setSlotDurationHours("");
    setOccasionalDate("");
    setTags([]);
    setTagInput("");
    setShowFascia(false);
    form.reset({ type: "OCCASIONAL", hasFeedback: true, isCompletable: false });
  }

  function openEdit(task: (typeof tasks)[0]) {
    setEditId(task.id);
    setImage(task.image ?? undefined);
    setRecurrenceDays(task.recurrenceDays ?? []);
    setWindowStart(task.windowStart ?? "");
    setWindowEnd(task.windowEnd ?? "");
    setSlotDurationHours(task.slotDurationHours ?? "");
    setShowFascia(!!(task.windowStart ?? task.windowEnd ?? task.slotDurationHours));
    setTags((task.tags as { name: string }[] ?? []).map((t) => t.name));
    setTagInput("");
    form.reset({
      title: task.title,
      description: task.description ?? "",
      type: task.type,
      hasFeedback: task.hasFeedback,
      isCompletable: task.isCompletable ?? false,
    });
    setShowForm(true);
  }

  function openDuplicate(task: (typeof tasks)[0]) {
    setEditId(null);
    setImage(task.image ?? undefined);
    setRecurrenceDays(task.recurrenceDays ?? []);
    setWindowStart(task.windowStart ?? "");
    setWindowEnd(task.windowEnd ?? "");
    setSlotDurationHours(task.slotDurationHours ?? "");
    setShowFascia(!!(task.windowStart ?? task.windowEnd ?? task.slotDurationHours));
    setTags((task.tags as { name: string }[] ?? []).map((t) => t.name));
    setTagInput("");
    setOccasionalDate("");
    form.reset({
      title: task.title + " (copia)",
      description: task.description ?? "",
      type: task.type,
      hasFeedback: task.hasFeedback,
      isCompletable: task.isCompletable ?? false,
    });
    setShowForm(true);
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setImage(reader.result as string);
    reader.readAsDataURL(file);
  }

  function toggleDay(day: number) {
    setRecurrenceDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort(),
    );
  }

  function onSubmit(data: TaskForm) {
    const ws = windowStart || undefined;
    const we = windowEnd || undefined;
    const sdh = typeof slotDurationHours === "number" ? slotDurationHours : undefined;
    if (editId) {
      updateMut.mutate({
        id: editId, ...data, image: image ?? null, tagNames: tags,
        windowStart: ws ?? null, windowEnd: we ?? null, slotDurationHours: sdh ?? null,
      });
    } else {
      const initialSlots =
        data.type === "OCCASIONAL" && !data.isCompletable && occasionalDate
          ? [{ date: new Date(occasionalDate), maxOccupants: defaultMaxOccupants }]
          : [];
      createMut.mutate({
        ...data,
        image,
        tagNames: tags,
        recurrenceDays,
        recurrenceWeeks,
        defaultMaxOccupants,
        windowStart: ws,
        windowEnd: we,
        slotDurationHours: sdh,
        slots: initialSlots,
      });
    }
  }

  if (status !== "authenticated") return null;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => { form.reset({ type: "OCCASIONAL", hasFeedback: false, isCompletable: false }); setShowForm(true); }}>
          + Nuovo task
        </Button>
      </div>

      {isLoading && <p className="py-8 text-center text-sm text-gray-500">Caricamento...</p>}

      <div className="space-y-3">
        {tasks.map((task) => (
          <Card key={task.id}>
            <CardContent className="py-3">
              <div className="flex items-start gap-3">
                {task.image && (
                  <img src={task.image} alt={task.title} className="h-14 w-14 rounded-lg object-cover shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-sm">{task.title}</p>
                    <Badge variant="outline" className="shrink-0 text-xs">
                      {task.type === "RECURRENT" ? "Ricorrente" : "Occasionale"}
                    </Badge>
                  </div>
                  {task.type === "RECURRENT" && task.recurrenceDays.length > 0 && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      {task.recurrenceDays.map((d) => DAY_LABELS[d]).join(" · ")}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">{task.slots.length} slot</p>
                  {(task.tags as { id: string; name: string }[] | undefined)?.length ? (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {(task.tags as { id: string; name: string }[]).map(t => (
                        <Badge key={t.id} variant="secondary" className="text-xs">{t.name}</Badge>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2 border-t border-gray-100 pt-3 dark:border-gray-700">
                <Button size="sm" variant="outline" className="flex-1 gap-1.5" onClick={() => setManagingId(task.id)}>
                  <Settings2 className="h-4 w-4" aria-hidden="true" />
                  Gestisci slot
                </Button>
                <Button size="icon" variant="ghost" className="h-10 w-10" onClick={() => openDuplicate(task)} aria-label="Duplica task">
                  <Copy className="h-4 w-4" aria-hidden="true" />
                </Button>
                <Button size="icon" variant="ghost" className="h-10 w-10" onClick={() => openEdit(task)} aria-label="Modifica task">
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                </Button>
                <Button size="icon" variant="ghost" className="h-10 w-10 text-red-600 hover:text-red-700 dark:text-red-400" onClick={() => deleteMut.mutate({ id: task.id })} disabled={deleteMut.isPending} aria-label="Elimina task">
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create/Edit dialog */}
      <Dialog open={showForm} onOpenChange={(o) => !o && closeForm()}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Modifica task" : "Nuovo task"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit((d: TaskForm) => onSubmit(d))} className="space-y-3">
            <Field label="Titolo*">
              <Input {...form.register("title")} />
              {form.formState.errors.title && (
                <p className="text-xs text-red-600">{form.formState.errors.title.message}</p>
              )}
            </Field>
            <Field label="Descrizione">
              <Textarea rows={2} {...form.register("description")} />
            </Field>

            <Field label="Immagine">
              {image && (
                <div className="relative mb-2">
                  <img src={image} alt="preview" className="w-full h-32 object-cover rounded-lg" />
                  <button
                    type="button"
                    onClick={() => setImage(undefined)}
                    className="absolute top-1 right-1 rounded-full bg-black/50 px-1.5 py-0.5 text-xs text-white"
                  >
                    ✕
                  </button>
                </div>
              )}
              <Input type="file" accept="image/*" onChange={handleImageChange} className="text-sm" />
            </Field>

            <Field label="Tipo">
              <Controller
                control={form.control}
                name="type"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="OCCASIONAL">Occasionale</SelectItem>
                      <SelectItem value="RECURRENT">Ricorrente</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>

            {form.watch("type") === "OCCASIONAL" && !form.watch("isCompletable") && !editId && (
              <div className="space-y-3 rounded-lg border p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Programmazione</p>
                <Field label="Data e ora attività">
                  <DateTimePicker
                    value={occasionalDate}
                    onChange={setOccasionalDate}
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Se hai una fascia oraria configurata, viene espansa automaticamente in slot.
                  </p>
                </Field>
                <Field label="Max partecipanti per slot">
                  <Input
                    type="number"
                    min={1}
                    value={defaultMaxOccupants}
                    onChange={(e) => setDefaultMaxOccupants(parseInt(e.target.value) || 1)}
                  />
                </Field>
              </div>
            )}

            {form.watch("type") === "RECURRENT" && (
              <div className="space-y-3 rounded-lg border p-3">
                <Field label="Giorni di ripetizione">
                  <div className="flex gap-1.5 flex-wrap">
                    {DAY_LABELS.map((label, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => toggleDay(i)}
                        className={cn(
                          "rounded-full px-3 py-1 text-xs font-medium border transition-colors",
                          recurrenceDays.includes(i)
                            ? "bg-blue-600 text-white border-blue-600"
                            : "bg-white text-gray-600 border-gray-300",
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </Field>
                <Field label="Settimane da generare">
                  <Input
                    type="number"
                    min={1}
                    max={52}
                    value={recurrenceWeeks}
                    onChange={(e) => setRecurrenceWeeks(parseInt(e.target.value) || 4)}
                  />
                </Field>
                <Field label="Max occupanti per slot">
                  <Input
                    type="number"
                    min={1}
                    value={defaultMaxOccupants}
                    onChange={(e) => setDefaultMaxOccupants(parseInt(e.target.value) || 1)}
                  />
                </Field>
              </div>
            )}

            {/* Time window for slot generation */}
            <div>
              <button
                type="button"
                onClick={() => { setShowFascia(v => !v); if (showFascia) { setWindowStart(""); setWindowEnd(""); setSlotDurationHours(""); } }}
                className="flex items-center gap-2 text-xs font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <span className={cn("flex h-4 w-4 items-center justify-center rounded border transition-colors",
                  showFascia ? "border-blue-600 bg-blue-600 text-white" : "border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-800")}>
                  {showFascia && <span className="text-[10px] leading-none">✓</span>}
                </span>
                Fascia oraria slot
              </button>
            </div>
            {showFascia && (
              <div className="space-y-3 rounded-lg border p-3">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Ogni giorno viene suddiviso in slot di durata fissa.
                </p>
                <div className="flex gap-2 items-end">
                  <Field label="Inizio">
                    <TimePicker value={windowStart} onChange={setWindowStart} className="w-28" />
                  </Field>
                  <Field label="Fine">
                    <TimePicker value={windowEnd} onChange={setWindowEnd} className="w-28" />
                  </Field>
                  <Field label="Durata (ore)">
                    <Input
                      type="number"
                      min={0.5}
                      max={24}
                      step={0.5}
                      value={slotDurationHours}
                      onChange={(e) => setSlotDurationHours(parseFloat(e.target.value) || "")}
                      className="w-24"
                      placeholder="es. 2"
                    />
                  </Field>
                </div>
                {windowStart && windowEnd && slotDurationHours && (
                  <p className="text-xs text-blue-600 dark:text-blue-400">
                    → {Math.floor(
                      (new Date(`1970-01-01T${windowEnd}:00`).getTime() -
                        new Date(`1970-01-01T${windowStart}:00`).getTime()) /
                        (slotDurationHours * 3600 * 1000),
                    )} slot per giorno ({windowStart}–{windowEnd}, ogni {slotDurationHours}h)
                  </p>
                )}
              </div>
            )}

            <Separator />
            {/* Tags */}
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                <Tag className="h-3.5 w-3.5" aria-hidden="true" />
                Tag
              </Label>
              <div className="flex gap-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  placeholder="Aggiungi tag…"
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
              {/* Suggestions from existing tags */}
              {tagInput && existingTags.filter(t => t.name.toLowerCase().includes(tagInput.toLowerCase()) && !tags.includes(t.name)).length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {existingTags
                    .filter(t => t.name.toLowerCase().includes(tagInput.toLowerCase()) && !tags.includes(t.name))
                    .map(t => (
                      <button key={t.id} type="button" onClick={() => { setTags(p => [...p, t.name]); setTagInput(""); }}
                        className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs text-blue-700 hover:bg-blue-100 dark:border-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
                        {t.name}
                      </button>
                    ))}
                </div>
              )}
              {/* Show all tags when input is empty and focused */}
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
                {tags.map(t => (
                  <Badge key={t} variant="secondary" className="cursor-pointer text-xs" onClick={() => setTags(p => p.filter(x => x !== t))}>
                    {t} ×
                  </Badge>
                ))}
              </div>
            </div>

            <Separator />
            <div className="flex items-center gap-2">
              <Controller
                control={form.control}
                name="hasFeedback"
                render={({ field }) => (
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                )}
              />
              <Label>Abilita feedback studenti</Label>
            </div>
            <div className="flex items-center gap-2">
              <Controller
                control={form.control}
                name="isCompletable"
                render={({ field }) => (
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                )}
              />
              <Label>Completabile manualmente (studente segna come fatto)</Label>
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
        <SlotManagerDialog taskId={managingId} onClose={() => setManagingId(null)} />
      )}
    </div>
  );
};

function SlotManagerDialog({ taskId, onClose }: { taskId: string; onClose: () => void }) {
  const utils = api.useUtils();
  const { data: task, isLoading } = api.task.getById.useQuery({ id: taskId });
  const [newDate, setNewDate] = useState("");
  const [maxOccupants, setMaxOccupants] = useState(1);

  // Editable window state — synced from task once loaded
  const [ws, setWs] = useState("");
  const [we, setWe] = useState("");
  const [wdh, setWdh] = useState<number | "">("");
  const [windowDirty, setWindowDirty] = useState(false);

  // Sync from task on load
  const taskRef = { ws: task?.windowStart ?? "", we: task?.windowEnd ?? "", wdh: task?.slotDurationHours ?? "" as number | "" };
  useEffect(() => {
    if (task && !windowDirty) {
      setWs(task.windowStart ?? "");
      setWe(task.windowEnd ?? "");
      setWdh(task.slotDurationHours ?? "");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task?.id]);

  const hasWindow = !!(ws && we && wdh);

  const updateMut = api.task.update.useMutation({
    onSuccess: () => {
      toast.success("Fascia aggiornata");
      setWindowDirty(false);
      void utils.task.getById.invalidate({ id: taskId });
      void utils.task.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const { data: rawStudents = [] } = api.user.list.useQuery({ includeDeleted: false });
  const students = (rawStudents as Array<{ id: string; name: string | null; username: string; role: string }>)
    .filter((u) => u.role === "STUDENTE");

  const assignMut = api.task.assignSlot.useMutation({
    onSuccess: () => void utils.task.getById.invalidate({ id: taskId }),
    onError: (e) => toast.error(e.message),
  });

  const addSlotMut = api.task.addSlot.useMutation({
    onSuccess: () => {
      void utils.task.getById.invalidate({ id: taskId });
      setNewDate("");
      setMaxOccupants(1);
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteSlotMut = api.task.deleteSlot.useMutation({
    onSuccess: () => void utils.task.getById.invalidate({ id: taskId }),
    onError: (e) => toast.error(e.message),
  });

  // Group slots by date
  const slotsByDate: Record<string, NonNullable<typeof task>["slots"]> = {};
  if (task) {
    for (const slot of task.slots) {
      const key = format(new Date(slot.date), "yyyy-MM-dd");
      if (!slotsByDate[key]) slotsByDate[key] = [];
      slotsByDate[key].push(slot);
    }
  }

  function formatSlotLabel(slot: NonNullable<typeof task>["slots"][0]) {
    if (slot.slotStart && slot.slotEnd) {
      return `${format(new Date(slot.slotStart), "HH:mm")} – ${format(new Date(slot.slotEnd), "HH:mm")}`;
    }
    return format(new Date(slot.date), "HH:mm");
  }

  function slotsPerDay() {
    if (!ws || !we || !wdh) return 0;
    return Math.floor(
      (new Date(`1970-01-01T${we}:00`).getTime() - new Date(`1970-01-01T${ws}:00`).getTime()) /
        ((wdh as number) * 3600 * 1000),
    );
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Slot — {task?.title}</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <p className="py-4 text-center text-sm">Caricamento...</p>
        ) : (
          <div className="space-y-4">
            {/* ── Fascia oraria ── */}
            <div className="rounded-lg border dark:border-gray-700 p-3 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                Fascia oraria slot
              </p>
              <div className="flex gap-2 items-end flex-wrap">
                <div className="space-y-1">
                  <Label className="text-xs text-gray-500">Inizio</Label>
                  <TimePicker value={ws} onChange={(v) => { setWs(v); setWindowDirty(true); }} className="w-28" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-gray-500">Fine</Label>
                  <TimePicker value={we} onChange={(v) => { setWe(v); setWindowDirty(true); }} className="w-28" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-gray-500">Durata (ore)</Label>
                  <Input
                    type="number"
                    min={0.5}
                    max={24}
                    step={0.5}
                    value={wdh}
                    onChange={(e) => { setWdh(parseFloat(e.target.value) || ""); setWindowDirty(true); }}
                    className="w-24"
                    placeholder="es. 2"
                  />
                </div>
              </div>
              {hasWindow && (
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  → {slotsPerDay()} slot per giorno ({ws}–{we}, ogni {wdh}h)
                </p>
              )}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  disabled={!windowDirty || updateMut.isPending}
                  onClick={() =>
                    updateMut.mutate({
                      id: taskId,
                      windowStart: ws || null,
                      windowEnd: we || null,
                      slotDurationHours: typeof wdh === "number" ? wdh : null,
                    })
                  }
                >
                  Salva fascia
                </Button>
                {hasWindow && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-500"
                    onClick={() => {
                      setWs(""); setWe(""); setWdh(""); setWindowDirty(true);
                    }}
                  >
                    Rimuovi
                  </Button>
                )}
              </div>
            </div>

            {/* ── Add slot / day ── */}
            <div className="flex gap-2">
              <Input
                type={hasWindow ? "date" : "datetime-local"}
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="flex-1"
              />
              <Input
                type="number"
                min={1}
                value={maxOccupants}
                onChange={(e) => setMaxOccupants(parseInt(e.target.value))}
                className="w-16"
                placeholder="Max"
              />
              <Button
                onClick={() => {
                  if (!newDate) return;
                  const d = hasWindow ? new Date(newDate + "T12:00:00") : new Date(newDate);
                  addSlotMut.mutate({ taskId, date: d, maxOccupants });
                }}
                disabled={!newDate || addSlotMut.isPending}
              >
                +
              </Button>
            </div>
            <Separator />

            {/* ── Slot list ── */}
            {Object.entries(slotsByDate).map(([dateKey, slots]) => (
              <div key={dateKey}>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-2">
                  {format(new Date(dateKey), "EEEE d MMMM", { locale: it })}
                </p>
                <div className="space-y-1.5">
                  {slots.map((slot) => {
                    type Occ = { id: string; userId: string; user?: { id: string; name: string | null; username: string } };
                    const occs = (slot.occupations as Occ[]).filter((o) => (o as unknown as { isActive: boolean }).isActive !== false);
                    const occupiedIds = new Set(occs.map((o) => o.userId));
                    const canAssign = slot._count.occupations < slot.maxOccupants;
                    const unassignedStudents = students.filter((s) => !occupiedIds.has(s.id));

                    return (
                      <div key={slot.id} className="rounded-md border dark:border-gray-700 p-2 space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">{formatSlotLabel(slot)}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {slot._count.occupations}/{slot.maxOccupants} occupati
                            </p>
                          </div>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-red-600 hover:text-red-700 dark:text-red-400"
                            onClick={() => deleteSlotMut.mutate({ slotId: slot.id })}
                            aria-label="Elimina slot"
                          >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                          </Button>
                        </div>
                        {/* Assigned students */}
                        {occs.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {occs.map((o) => (
                              <span key={o.id} className="flex items-center gap-1 text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700 rounded-full px-2 py-0.5">
                                {o.user?.name ?? o.user?.username ?? o.userId}
                                <button
                                  onClick={() => assignMut.mutate({ slotId: slot.id, userId: o.userId, assign: false })}
                                  className="ml-0.5 hover:text-red-500"
                                >×</button>
                              </span>
                            ))}
                          </div>
                        )}
                        {/* Assign selector */}
                        {canAssign && unassignedStudents.length > 0 && (
                          <Select
                            value=""
                            onValueChange={(uid) => assignMut.mutate({ slotId: slot.id, userId: uid, assign: true })}
                          >
                            <SelectTrigger className="h-7 text-xs">
                              <SelectValue placeholder="+ Assegna studente" />
                            </SelectTrigger>
                            <SelectContent>
                              {unassignedStudents.map((s) => (
                                <SelectItem key={s.id} value={s.id} className="text-xs">
                                  {s.name ?? s.username}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            {task?.slots.length === 0 && (
              <p className="py-4 text-center text-sm text-gray-500 dark:text-gray-400">Nessuno slot</p>
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

TaskPage.getLayout = getDashboardLayout("Task");

export default TaskPage;
