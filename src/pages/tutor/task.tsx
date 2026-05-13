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
import { Label } from "~/components/ui/label";
import { Badge } from "~/components/ui/badge";
import { Textarea } from "~/components/ui/textarea";
import { Switch } from "~/components/ui/switch";
import { Card, CardContent, CardHeader } from "~/components/ui/card";
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
    form.reset({ type: "OCCASIONAL", hasFeedback: true, isCompletable: false });
  }

  function openEdit(task: (typeof tasks)[0]) {
    setEditId(task.id);
    setImage(task.image ?? undefined);
    setRecurrenceDays(task.recurrenceDays ?? []);
    form.reset({
      title: task.title,
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
    if (editId) {
      updateMut.mutate({ id: editId, ...data, image: image ?? null });
    } else {
      createMut.mutate({
        ...data,
        image,
        recurrenceDays,
        recurrenceWeeks,
        defaultMaxOccupants,
        slots: [],
      });
    }
  }

  if (status !== "authenticated") return null;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => { form.reset({ type: "OCCASIONAL", hasFeedback: false }); setShowForm(true); }}>
          + Nuovo task
        </Button>
      </div>

      {isLoading && <p className="py-8 text-center text-sm text-gray-500">Caricamento...</p>}

      <div className="space-y-3">
        {tasks.map((task) => (
          <Card key={task.id}>
            <CardContent className="flex items-start gap-3 py-3">
              {task.image && (
                <img src={task.image} alt={task.title} className="h-14 w-14 rounded-lg object-cover shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-sm">{task.title}</p>
                  <div className="flex shrink-0 gap-1">
                    <Badge variant="outline" className="text-xs">
                      {task.type === "RECURRENT" ? "Ricorrente" : "Occasionale"}
                    </Badge>
                  </div>
                </div>
                {task.type === "RECURRENT" && task.recurrenceDays.length > 0 && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    {task.recurrenceDays.map((d) => DAY_LABELS[d]).join(" · ")}
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-1">{task.slots.length} slot</p>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button size="sm" variant="outline" onClick={() => setManagingId(task.id)}>Slot</Button>
                <Button size="sm" variant="ghost" onClick={() => openEdit(task)}>✏️</Button>
                <Button size="sm" variant="ghost" className="text-red-600" onClick={() => deleteMut.mutate({ id: task.id })}>🗑️</Button>
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
              <Button type="submit" disabled={createMut.isPending || updateMut.isPending}>
                {editId ? "Salva" : "Crea"}
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

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Slot — {task?.title}</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <p className="py-4 text-center text-sm">Caricamento...</p>
        ) : (
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                type="datetime-local"
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
                  if (newDate) addSlotMut.mutate({ taskId, date: new Date(newDate), maxOccupants });
                }}
                disabled={!newDate || addSlotMut.isPending}
              >
                +
              </Button>
            </div>
            <Separator />
            {Object.entries(slotsByDate).map(([dateKey, slots]) => (
              <div key={dateKey}>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
                  {format(new Date(dateKey), "EEEE d MMMM")}
                </p>
                <div className="space-y-1.5">
                  {slots.map((slot) => (
                    <div key={slot.id} className="flex items-center justify-between rounded-md border p-2">
                      <div>
                        <p className="text-sm font-medium">{format(new Date(slot.date), "HH:mm")}</p>
                        <p className="text-xs text-gray-500">
                          {slot._count.occupations}/{slot.maxOccupants} occupati
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600"
                        onClick={() => deleteSlotMut.mutate({ slotId: slot.id })}
                      >
                        🗑️
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {task?.slots.length === 0 && (
              <p className="py-4 text-center text-sm text-gray-500">Nessuno slot</p>
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
