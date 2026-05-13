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
import { toast } from "sonner";

const eventSchema = z.object({
  title: z.string().min(1, "Obbligatorio"),
  description: z.string().optional(),
  place: z.string().optional(),
  startDate: z.string().min(1, "Obbligatorio"),
  endDate: z.string().min(1, "Obbligatorio"),
  userLimit: z.string().optional(),
  hasFeedback: z.boolean(),
  tagInput: z.string().optional(),
});

type EventForm = z.infer<typeof eventSchema>;

const EventiPage: NextPageWithLayout = function EventiPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [managingId, setManagingId] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [image, setImage] = useState<string | undefined>(undefined);

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
  const { data: events = [], isLoading } = api.event.list.useQuery(
    { upcoming: false },
    { enabled: status === "authenticated" },
  );

  const createMut = api.event.create.useMutation({
    onSuccess: () => {
      toast.success("Evento creato");
      void utils.event.list.invalidate();
      closeForm();
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMut = api.event.update.useMutation({
    onSuccess: () => {
      toast.success("Evento aggiornato");
      void utils.event.list.invalidate();
      closeForm();
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMut = api.event.delete.useMutation({
    onSuccess: () => {
      toast.success("Evento eliminato");
      void utils.event.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const form = useForm<EventForm>({
    resolver: zodResolver(eventSchema),
    defaultValues: { hasFeedback: true },
  });

  function openCreate() {
    setEditId(null);
    setTags([]);
    form.reset({ hasFeedback: true });
    setShowForm(true);
  }

  function openEdit(event: (typeof events)[0]) {
    setEditId(event.id);
    const t = event.tags.map((t) => t.name);
    setTags(t);
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

  function closeForm() {
    setShowForm(false);
    setEditId(null);
    setTags([]);
    setImage(undefined);
    form.reset();
  }

  function addTag() {
    const val = form.getValues("tagInput")?.trim();
    if (val && !tags.includes(val)) {
      setTags((prev) => [...prev, val]);
    }
    form.setValue("tagInput", "");
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

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openCreate}>+ Nuovo evento</Button>
      </div>

      {isLoading && <p className="py-8 text-center text-sm text-gray-500">Caricamento...</p>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {events.map((event) => (
          <Card key={event.id} className="flex flex-col min-w-0">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold leading-tight">{event.title}</h3>
                  {event.place && (
                    <p className="text-xs text-gray-500">📍 {event.place}</p>
                  )}
                </div>
                {event.hasFeedback && (
                  <Badge variant="outline" className="shrink-0 text-xs">
                    Feedback
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-3 pt-0">
              {event.description && (
                <p className="text-sm text-gray-600 line-clamp-2">{event.description}</p>
              )}
              <div className="text-xs text-gray-500">
                <span>
                  {new Date(event.startDate).toLocaleDateString("it-IT", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
                {event.userLimit && (
                  <span className="ml-2">
                    👥 {event._count.participants}/{event.userLimit}
                  </span>
                )}
                {!event.userLimit && (
                  <span className="ml-2">👥 {event._count.participants}</span>
                )}
              </div>
              {event.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {event.tags.map((t) => (
                    <Badge key={t.id} variant="secondary" className="text-xs">
                      {t.name}
                    </Badge>
                  ))}
                </div>
              )}
              <div className="mt-auto flex gap-1 pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setManagingId(event.id)}
                >
                  Partecipanti
                </Button>
                <Button size="sm" variant="ghost" onClick={() => openEdit(event)}>
                  ✏️
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-red-600"
                  onClick={() => deleteMut.mutate({ id: event.id })}
                >
                  🗑️
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

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
            <div className="grid grid-cols-2 gap-3">
              <Field label="Data inizio*">
                <Input type="datetime-local" {...form.register("startDate")} />
              </Field>
              <Field label="Data fine*">
                <Input type="datetime-local" {...form.register("endDate")} />
              </Field>
            </div>
            <Field label="Limite studenti (opzionale)">
              <Input type="number" min={1} {...form.register("userLimit")} />
            </Field>

            <div>
              <Label className="text-xs text-gray-600">Tag</Label>
              <div className="mt-1 flex gap-2">
                <Input
                  placeholder="Aggiungi tag..."
                  {...form.register("tagInput")}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                />
                <Button type="button" variant="outline" size="sm" onClick={addTag}>
                  +
                </Button>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {tags.map((t) => (
                  <Badge
                    key={t}
                    variant="secondary"
                    className="cursor-pointer text-xs"
                    onClick={() => setTags((prev) => prev.filter((x) => x !== t))}
                  >
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

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={closeForm}>
                Annulla
              </Button>
              <Button
                type="submit"
                disabled={createMut.isPending || updateMut.isPending}
              >
                {editId ? "Salva" : "Crea"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Participant management */}
      {managingId && (
        <ParticipantDialog eventId={managingId} onClose={() => setManagingId(null)} />
      )}
    </div>
  );
};

function ParticipantDialog({ eventId, onClose }: { eventId: string; onClose: () => void }) {
  const utils = api.useUtils();
  const { data: event, isLoading } = api.event.getById.useQuery({ id: eventId });
  const { data: rawAllUsers = [] } = api.user.list.useQuery({ role: "STUDENTE" });
  const allUsers = rawAllUsers as Array<{ id: string; name: string | null; username: string }>;

  const assignMut = api.event.assignParticipant.useMutation({
    onSuccess: () => void utils.event.getById.invalidate({ id: eventId }),
    onError: (e) => toast.error(e.message),
  });

  const participantIds = new Set(event?.participants.map((p) => p.userId) ?? []);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Partecipanti — {event?.title}</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <p className="py-4 text-center text-sm">Caricamento...</p>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-gray-500">
              {participantIds.size}
              {event?.userLimit ? `/${event.userLimit}` : ""} iscritti
            </p>
            {allUsers.map((u) => (
              <div key={u.id} className="flex items-center justify-between">
                <span className="text-sm">{u.name ?? u.username}</span>
                <Switch
                  checked={participantIds.has(u.id)}
                  onCheckedChange={(v) =>
                    assignMut.mutate({ eventId, userId: u.id, assign: v })
                  }
                />
              </div>
            ))}
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

EventiPage.getLayout = getDashboardLayout("Eventi");

export default EventiPage;
