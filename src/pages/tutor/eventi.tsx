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
import { Plus, Pencil, Trash2, MapPin, Users, Search, UserPlus, X, Loader2, Copy, Tag } from "lucide-react";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import { cn } from "~/lib/utils";

const eventSchema = z.object({
  title: z.string().min(1, "Obbligatorio"),
  description: z.string().optional(),
  place: z.string().optional(),
  startDate: z.string().min(1, "Obbligatorio"),
  endDate: z.string().min(1, "Obbligatorio"),
  userLimit: z.string().optional(),
  hasFeedback: z.boolean(),
});

type EventForm = z.infer<typeof eventSchema>;

const EventiPage: NextPageWithLayout = function EventiPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [managingId, setManagingId] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
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
  const { data: existingTags = [] } = api.event.listTags.useQuery(undefined, {
    enabled: status === "authenticated",
  });
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
    setTagInput("");
    form.reset({ hasFeedback: true });
    setShowForm(true);
  }

  function openEdit(event: (typeof events)[0]) {
    setEditId(event.id);
    const t = event.tags.map((t) => t.name);
    setTags(t);
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
    setShowForm(false);
    setEditId(null);
    setTags([]);
    setTagInput("");
    setImage(undefined);
    form.reset();
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
        <Button onClick={openCreate} className="gap-1.5">
          <Plus className="h-4 w-4" aria-hidden="true" />
          Nuovo evento
        </Button>
      </div>

      {isLoading && <p className="py-8 text-center text-sm text-gray-500">Caricamento...</p>}

      <div className="grid gap-4 justify-center [grid-template-columns:repeat(auto-fill,minmax(280px,1fr))]">
        {events.map((event) => (
          <Card key={event.id} className="flex flex-col min-w-0">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold leading-tight">{event.title}</h3>
                  {event.place && (
                    <div className="flex items-center gap-1.5">
                      <p className="flex items-center gap-1 text-xs text-gray-500">
                        <MapPin className="h-3 w-3" aria-hidden="true" />{event.place}
                      </p>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.place)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline dark:text-blue-400"
                        aria-label={`Apri su Maps`}
                        onClick={(e) => e.stopPropagation()}
                      >Maps →</a>
                    </div>
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
                <span className="flex items-center gap-1 ml-2">
                  <Users className="h-3 w-3" aria-hidden="true" />
                  {event._count.participants}{event.userLimit ? `/${event.userLimit}` : ""}
                </span>
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
              <div className="mt-auto flex items-center gap-2 border-t border-gray-100 pt-3 dark:border-gray-700">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 gap-1.5"
                  onClick={() => setManagingId(event.id)}
                >
                  <Users className="h-4 w-4" aria-hidden="true" />
                  Partecipanti
                </Button>
                <Button size="icon" variant="ghost" className="h-10 w-10" onClick={() => openDuplicate(event)} aria-label="Duplica evento">
                  <Copy className="h-4 w-4" aria-hidden="true" />
                </Button>
                <Button size="icon" variant="ghost" className="h-10 w-10" onClick={() => openEdit(event)} aria-label="Modifica evento">
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-10 w-10 text-red-600 hover:text-red-700 dark:text-red-400"
                  onClick={() => deleteMut.mutate({ id: event.id })}
                  disabled={deleteMut.isPending}
                  aria-label="Elimina evento"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
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
              {/* Tag suggestions */}
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
                className="gap-1.5"
              >
                {(createMut.isPending || updateMut.isPending) && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                {(createMut.isPending || updateMut.isPending) ? "Salvataggio…" : editId ? "Salva" : "Crea"}
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
  const [search, setSearch] = useState("");
  const { data: event, isLoading } = api.event.getById.useQuery({ id: eventId });
  const { data: rawAllUsers = [] } = api.user.list.useQuery({ role: "STUDENTE" });
  const allUsers = rawAllUsers as Array<{ id: string; name: string | null; username: string; deletedAt: Date | null }>;

  const assignMut = api.event.assignParticipant.useMutation({
    onSuccess: () => void utils.event.getById.invalidate({ id: eventId }),
    onError: (e) => toast.error(e.message),
  });

  const participantIds = new Set(event?.participants.map((p) => p.userId) ?? []);
  const enrolled = allUsers.filter((u) => participantIds.has(u.id));
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
            {/* Count + capacity bar */}
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                  {count}{limit ? `/${limit}` : ""} iscritti
                </p>
                {isFull && (
                  <Badge variant="destructive" className="text-xs">Completo</Badge>
                )}
              </div>
              {limit && (
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      count / limit >= 1 ? "bg-red-500" : count / limit >= 0.8 ? "bg-orange-400" : "bg-blue-500",
                    )}
                    style={{ width: `${Math.min(100, (count / limit) * 100)}%` }}
                    role="progressbar"
                    aria-valuenow={count}
                    aria-valuemax={limit}
                  />
                </div>
              )}
            </div>

            {/* Enrolled participants */}
            {enrolled.length > 0 && (
              <div>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                  Iscritti ({enrolled.length})
                </p>
                <div className="space-y-1">
                  {enrolled.map((u) => {
                    const initials = (u.name ?? u.username).slice(0, 2).toUpperCase();
                    return (
                      <div
                        key={u.id}
                        className="flex items-center gap-3 rounded-lg border border-green-100 bg-green-50 px-3 py-2 dark:border-green-800 dark:bg-green-900/20"
                      >
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarFallback className="bg-green-100 text-xs font-semibold text-green-700 dark:bg-green-900/40 dark:text-green-300">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-gray-800 dark:text-gray-100">
                            {u.name ?? u.username}
                          </p>
                          {u.name && (
                            <p className="truncate font-mono text-xs text-gray-500">@{u.username}</p>
                          )}
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-red-500 hover:text-red-700 dark:text-red-400"
                          onClick={() => assignMut.mutate({ eventId, userId: u.id, assign: false })}
                          disabled={assignMut.isPending}
                          aria-label={`Rimuovi ${u.name ?? u.username}`}
                        >
                          <X className="h-3.5 w-3.5" aria-hidden="true" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Add participants */}
            {!isFull && (
              <div className="flex flex-1 flex-col gap-2 overflow-hidden">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
                  <Input
                    placeholder="Aggiungi studente…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 text-sm"
                    aria-label="Cerca studente da aggiungere"
                  />
                </div>
                <div className="flex-1 overflow-y-auto space-y-1 pr-0.5">
                  {notEnrolled.map((u) => {
                    const initials = (u.name ?? u.username).slice(0, 2).toUpperCase();
                    return (
                      <button
                        key={u.id}
                        onClick={() => assignMut.mutate({ eventId, userId: u.id, assign: true })}
                        disabled={assignMut.isPending}
                        className="flex w-full items-center gap-3 rounded-lg border border-gray-200 px-3 py-2 text-left transition-colors hover:border-blue-200 hover:bg-blue-50 dark:border-gray-700 dark:hover:border-blue-700 dark:hover:bg-blue-900/20"
                      >
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarFallback className="bg-blue-100 text-xs font-semibold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-gray-700 dark:text-gray-300">
                            {u.name ?? u.username}
                          </p>
                          {u.name && (
                            <p className="truncate font-mono text-xs text-gray-500">@{u.username}</p>
                          )}
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
