import { useState, type ReactNode } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { getDashboardLayout } from "~/layouts/DashboardLayout";
import type { NextPageWithLayout } from "../_app";
import { api } from "~/utils/api";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Card, CardContent } from "~/components/ui/card";
import { toast } from "sonner";
import { ChevronUp, ChevronDown, Pencil, Trash2, Plus } from "lucide-react";

const QUICK_EMOJIS = [
  "🚫", "⚠️", "✅", "🤝", "📱", "🎮", "🎵", "🍽️",
  "🛏️", "⏰", "🔑", "💬", "❤️", "🌟", "📚", "🎯",
  "🤲", "🙏", "🧹", "🔇", "🏃", "🎨", "🏠", "👥",
];

const ruleSchema = z.object({
  icon: z.string().min(1, "Scegli un'icona"),
  text: z.string().min(1, "Il testo è obbligatorio").max(300, "Max 300 caratteri"),
});

type RuleForm = z.infer<typeof ruleSchema>;

const RegolePage: NextPageWithLayout = function RegolePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") void router.replace("/auth/tipo");
    if (status === "authenticated" && session.user.role === "STUDENTE") {
      void router.replace("/studente");
    }
  }, [status, session, router]);

  const utils = api.useUtils();
  const { data: structure, isLoading } = api.structure.get.useQuery(undefined, {
    enabled: status === "authenticated",
  });

  const upsertMut = api.structure.upsertRule.useMutation({
    onSuccess: () => {
      toast.success(editId ? "Regola aggiornata" : "Regola creata");
      void utils.structure.get.invalidate();
      closeForm();
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMut = api.structure.deleteRule.useMutation({
    onSuccess: () => {
      toast.success("Regola eliminata");
      void utils.structure.get.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const moveMut = api.structure.moveRule.useMutation({
    onSuccess: () => void utils.structure.get.invalidate(),
    onError: (e) => toast.error(e.message),
  });

  const form = useForm<RuleForm>({
    resolver: zodResolver(ruleSchema),
    defaultValues: { icon: "", text: "" },
  });

  const watchedIcon = form.watch("icon");
  const watchedText = form.watch("text");

  function openEdit(rule: NonNullable<typeof structure>["rules"][0]) {
    setEditId(rule.id);
    form.reset({ icon: rule.icon, text: rule.text });
    setShowForm(true);
  }

  function openNew() {
    setEditId(null);
    form.reset({ icon: "", text: "" });
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditId(null);
    form.reset({ icon: "", text: "" });
  }

  function handleDelete(id: string) {
    if (!confirm("Eliminare questa regola?")) return;
    deleteMut.mutate({ id });
  }

  const rules = structure?.rules ?? [];

  if (status !== "authenticated") return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Struttura:{" "}
          <span className="font-medium text-gray-800 dark:text-gray-200">{structure?.name ?? "—"}</span>
        </p>
        <Button onClick={openNew} className="gap-2">
          <Plus className="h-4 w-4" aria-hidden="true" />
          Nuova regola
        </Button>
      </div>

      {isLoading && (
        <div className="space-y-2" aria-busy="true" aria-label="Caricamento regole">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
          ))}
        </div>
      )}

      <ol className="space-y-2" aria-label="Lista regole">
        {rules.map((rule, i) => (
          <li key={rule.id}>
            <Card>
              <CardContent className="flex items-center gap-3 py-3 px-4">
                <span
                  className="text-2xl leading-none shrink-0 w-9 text-center"
                  aria-hidden="true"
                >
                  {rule.icon}
                </span>
                <p className="flex-1 text-sm text-gray-800 dark:text-gray-100 leading-snug">
                  {rule.text}
                </p>
                <div className="flex items-center gap-1 shrink-0" role="group" aria-label={`Azioni per regola ${i + 1}`}>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-9 w-9"
                    onClick={() => moveMut.mutate({ id: rule.id, direction: "up" })}
                    disabled={i === 0 || moveMut.isPending}
                    aria-label="Sposta su"
                  >
                    <ChevronUp className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-9 w-9"
                    onClick={() => moveMut.mutate({ id: rule.id, direction: "down" })}
                    disabled={i === rules.length - 1 || moveMut.isPending}
                    aria-label="Sposta giù"
                  >
                    <ChevronDown className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-9 w-9"
                    onClick={() => openEdit(rule)}
                    aria-label={`Modifica regola ${i + 1}`}
                  >
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-9 w-9 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                    onClick={() => handleDelete(rule.id)}
                    disabled={deleteMut.isPending}
                    aria-label={`Elimina regola ${i + 1}`}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </li>
        ))}
      </ol>

      {!isLoading && rules.length === 0 && (
        <div className="py-12 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">Nessuna regola definita</p>
          <Button variant="outline" className="mt-3" onClick={openNew}>
            Aggiungi la prima regola
          </Button>
        </div>
      )}

      <Dialog open={showForm} onOpenChange={(o) => !o && closeForm()}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editId ? "Modifica regola" : "Nuova regola"}</DialogTitle>
          </DialogHeader>

          {/* Live preview */}
          {(watchedIcon || watchedText) && (
            <div
              className="flex items-start gap-3 rounded-xl border border-blue-100 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 px-4 py-3"
              aria-live="polite"
              aria-label="Anteprima regola"
            >
              <span className="text-2xl leading-none shrink-0 w-8 text-center" aria-hidden="true">
                {watchedIcon || "❓"}
              </span>
              <p className="text-sm text-gray-800 dark:text-gray-100 leading-snug">
                {watchedText || <span className="italic text-gray-400">Testo regola…</span>}
              </p>
            </div>
          )}

          <form
            onSubmit={form.handleSubmit((d: RuleForm) =>
              upsertMut.mutate({
                id: editId ?? undefined,
                ...d,
                order: editId
                  ? (rules.find((r) => r.id === editId)?.order ?? 0)
                  : (rules.length > 0 ? Math.max(...rules.map((r) => r.order)) + 10 : 0),
              }),
            )}
            className="space-y-4"
          >
            <FormRow label="Icona">
              <Input
                placeholder="Inserisci o scegli sotto"
                {...form.register("icon")}
                aria-describedby="icon-error icon-hint"
                className="mb-2"
              />
              <p id="icon-hint" className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                Tocca un'emoji per selezionarla
              </p>
              <div
                className="grid grid-cols-8 gap-1"
                role="group"
                aria-label="Emoji predefinite"
              >
                {QUICK_EMOJIS.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => form.setValue("icon", e, { shouldValidate: true })}
                    aria-label={`Seleziona ${e}`}
                    aria-pressed={watchedIcon === e}
                    className={`flex h-10 w-10 items-center justify-center rounded-lg text-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                      watchedIcon === e
                        ? "bg-blue-100 dark:bg-blue-800 ring-2 ring-blue-500"
                        : "bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700"
                    }`}
                  >
                    <span aria-hidden="true">{e}</span>
                  </button>
                ))}
              </div>
              {form.formState.errors.icon && (
                <p id="icon-error" className="text-xs text-red-600" role="alert">
                  {form.formState.errors.icon.message}
                </p>
              )}
            </FormRow>

            <FormRow label="Testo regola">
              <Textarea
                rows={3}
                placeholder="Descrivi la regola in modo chiaro e semplice…"
                {...form.register("text")}
                aria-describedby="text-error text-counter"
              />
              <p
                id="text-counter"
                className={`text-xs text-right mt-1 ${
                  (watchedText?.length ?? 0) > 270 ? "text-orange-500" : "text-gray-400"
                }`}
              >
                {watchedText?.length ?? 0}/300
              </p>
              {form.formState.errors.text && (
                <p id="text-error" className="text-xs text-red-600" role="alert">
                  {form.formState.errors.text.message}
                </p>
              )}
            </FormRow>

            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={closeForm}>
                Annulla
              </Button>
              <Button type="submit" disabled={upsertMut.isPending}>
                {upsertMut.isPending ? "Salvataggio…" : editId ? "Salva" : "Crea regola"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

function FormRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</Label>
      {children}
    </div>
  );
}

RegolePage.getLayout = getDashboardLayout("Regole struttura");

export default RegolePage;
