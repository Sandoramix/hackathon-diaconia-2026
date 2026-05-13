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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Card, CardContent } from "~/components/ui/card";
import { toast } from "sonner";
import { ChevronUp, ChevronDown, Pencil, Trash2, Plus, Search, Smile } from "lucide-react";
import { cn } from "~/lib/utils";
import {
  ICON_LIST, ICON_MAP, ICON_COLORS,
  parseLucideIcon, buildLucideIcon,
} from "~/lib/lucideIcons";

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

/** Renders a rule icon — supports both emoji strings and "lucide:Name:color" format */
function RuleIconDisplay({ icon, size = "h-6 w-6" }: { icon: string; size?: string }) {
  const parsed = parseLucideIcon(icon);
  if (parsed.type === "lucide") {
    const IconComp = ICON_MAP[parsed.name];
    if (!IconComp) return <span className="text-2xl leading-none">?</span>;
    return (
      <IconComp
        className={cn(size, parsed.color || "text-gray-700 dark:text-gray-300")}
        aria-hidden="true"
      />
    );
  }
  return <span className="text-2xl leading-none" aria-hidden="true">{parsed.value}</span>;
}

/** Icon picker for Lucide icons with search + color selection */
function LucideIconPicker({
  selectedIcon,
  selectedColor,
  onSelect,
}: {
  selectedIcon: string;
  selectedColor: string;
  onSelect: (name: string, color: string) => void;
}) {
  const [iconSearch, setIconSearch] = useState("");
  const [color, setColor] = useState(selectedColor);

  const filtered = ICON_LIST.filter((e) => {
    const q = iconSearch.toLowerCase();
    return e.name.toLowerCase().includes(q) || e.keywords.some((k) => k.includes(q));
  });

  return (
    <div className="space-y-3">
      {/* Color picker */}
      <div>
        <p className="mb-1.5 text-xs font-medium text-gray-600 dark:text-gray-400">Colore icona</p>
        <div className="flex flex-wrap gap-2">
          {ICON_COLORS.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => {
                setColor(c.value);
                if (selectedIcon) onSelect(selectedIcon, c.value);
              }}
              aria-label={c.label}
              aria-pressed={color === c.value}
              className={cn(
                "flex h-8 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                color === c.value
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30"
                  : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700",
              )}
            >
              <span
                className={cn(
                  "h-3.5 w-3.5 rounded-full flex items-center justify-center",
                  c.value
                    ? c.preview.replace("text-", "bg-").replace("dark:text-", "")
                    : "bg-gray-600",
                )}
              />
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
        <Input
          placeholder="Cerca icona… (es. cuore, no, tempo)"
          value={iconSearch}
          onChange={(e) => setIconSearch(e.target.value)}
          className="pl-9 text-sm"
          aria-label="Cerca icona Lucide"
        />
      </div>

      {/* Icon grid */}
      <div
        className="grid grid-cols-6 gap-1.5 max-h-48 overflow-y-auto pr-1"
        role="listbox"
        aria-label="Icone disponibili"
      >
        {filtered.map((entry) => {
          const IconComp = entry.Icon;
          const isSelected = selectedIcon === entry.name;
          return (
            <button
              key={entry.name}
              type="button"
              role="option"
              aria-selected={isSelected}
              aria-label={entry.name}
              title={`${entry.name} — ${entry.keywords.join(", ")}`}
              onClick={() => onSelect(entry.name, color)}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 rounded-xl p-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                isSelected
                  ? "bg-blue-100 dark:bg-blue-900/40 ring-2 ring-blue-500"
                  : "bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700",
              )}
            >
              <IconComp
                className={cn("h-5 w-5", color || "text-gray-700 dark:text-gray-300")}
                aria-hidden="true"
              />
              <span className="text-[8px] text-gray-400 truncate w-full text-center leading-tight">
                {entry.name}
              </span>
            </button>
          );
        })}
        {filtered.length === 0 && (
          <p className="col-span-6 py-4 text-center text-xs text-gray-400">Nessuna icona trovata</p>
        )}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

const RegolePage: NextPageWithLayout = function RegolePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [lucideIconName, setLucideIconName] = useState("");
  const [lucideColor, setLucideColor] = useState("");
  const [iconTab, setIconTab] = useState<"emoji" | "lucide">("emoji");

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
    onSuccess: () => { toast.success("Regola eliminata"); void utils.structure.get.invalidate(); },
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
    // Detect icon type
    const parsed = parseLucideIcon(rule.icon);
    if (parsed.type === "lucide") {
      setIconTab("lucide");
      setLucideIconName(parsed.name);
      setLucideColor(parsed.color);
    } else {
      setIconTab("emoji");
      setLucideIconName("");
      setLucideColor("");
    }
    setShowForm(true);
  }

  function openNew() {
    setEditId(null);
    form.reset({ icon: "", text: "" });
    setIconTab("emoji");
    setLucideIconName("");
    setLucideColor("");
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditId(null);
    form.reset({ icon: "", text: "" });
    setLucideIconName("");
    setLucideColor("");
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
          Struttura: <span className="font-medium text-gray-800 dark:text-gray-200">{structure?.name ?? "—"}</span>
        </p>
        <Button onClick={openNew} className="gap-2">
          <Plus className="h-4 w-4" aria-hidden="true" />
          Nuova regola
        </Button>
      </div>

      {isLoading && (
        <div className="space-y-2" aria-busy="true">
          {[1, 2, 3].map((i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />)}
        </div>
      )}

      <ol className="space-y-2" aria-label="Lista regole">
        {rules.map((rule, i) => (
          <li key={rule.id}>
            <Card>
              <CardContent className="flex items-center gap-3 px-4 py-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center">
                  <RuleIconDisplay icon={rule.icon} />
                </div>
                <p className="flex-1 text-sm leading-snug text-gray-800 dark:text-gray-100">
                  {rule.text}
                </p>
                <div className="flex shrink-0 items-center gap-1" role="group" aria-label={`Azioni regola ${i + 1}`}>
                  <Button size="icon" variant="ghost" className="h-9 w-9" onClick={() => moveMut.mutate({ id: rule.id, direction: "up" })} disabled={i === 0 || moveMut.isPending} aria-label="Sposta su">
                    <ChevronUp className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-9 w-9" onClick={() => moveMut.mutate({ id: rule.id, direction: "down" })} disabled={i === rules.length - 1 || moveMut.isPending} aria-label="Sposta giù">
                    <ChevronDown className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-9 w-9" onClick={() => openEdit(rule)} aria-label={`Modifica regola ${i + 1}`}>
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-9 w-9 text-red-500 hover:text-red-700 dark:text-red-400" onClick={() => handleDelete(rule.id)} disabled={deleteMut.isPending} aria-label={`Elimina regola ${i + 1}`}>
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
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Modifica regola" : "Nuova regola"}</DialogTitle>
          </DialogHeader>

          {/* Live preview */}
          {(watchedIcon || watchedText) && (
            <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 dark:border-blue-800 dark:bg-blue-900/20" aria-live="polite" aria-label="Anteprima">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center">
                {watchedIcon ? <RuleIconDisplay icon={watchedIcon} /> : <span className="text-2xl leading-none text-gray-300">?</span>}
              </div>
              <p className="text-sm leading-snug text-gray-800 dark:text-gray-100">
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
            {/* Icon picker */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Icona</Label>
              {form.formState.errors.icon && (
                <p className="text-xs text-red-600" role="alert">{form.formState.errors.icon.message}</p>
              )}

              <Tabs value={iconTab} onValueChange={(v) => setIconTab(v as "emoji" | "lucide")}>
                <TabsList className="w-full">
                  <TabsTrigger value="emoji" className="flex-1 gap-1.5">
                    <Smile className="h-4 w-4" aria-hidden="true" />
                    Emoji
                  </TabsTrigger>
                  <TabsTrigger value="lucide" className="flex-1 gap-1.5">
                    <Search className="h-4 w-4" aria-hidden="true" />
                    Libreria icone
                  </TabsTrigger>
                </TabsList>

                {/* Emoji tab */}
                <TabsContent value="emoji" className="space-y-2 pt-2">
                  <Input
                    placeholder="Scrivi o incolla un'emoji…"
                    value={watchedIcon.startsWith("lucide:") ? "" : watchedIcon}
                    onChange={(e) => form.setValue("icon", e.target.value, { shouldValidate: true })}
                    className="font-mono"
                  />
                  <div className="grid grid-cols-8 gap-1" role="group" aria-label="Emoji predefinite">
                    {QUICK_EMOJIS.map((e) => (
                      <button
                        key={e}
                        type="button"
                        onClick={() => form.setValue("icon", e, { shouldValidate: true })}
                        aria-label={`Seleziona ${e}`}
                        aria-pressed={watchedIcon === e}
                        className={cn(
                          "flex h-10 w-full items-center justify-center rounded-lg text-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                          watchedIcon === e
                            ? "bg-blue-100 dark:bg-blue-800 ring-2 ring-blue-500"
                            : "bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700",
                        )}
                      >
                        <span aria-hidden="true">{e}</span>
                      </button>
                    ))}
                  </div>
                </TabsContent>

                {/* Lucide icon tab */}
                <TabsContent value="lucide" className="pt-2">
                  <LucideIconPicker
                    selectedIcon={lucideIconName}
                    selectedColor={lucideColor}
                    onSelect={(name, color) => {
                      setLucideIconName(name);
                      setLucideColor(color);
                      form.setValue("icon", buildLucideIcon(name, color), { shouldValidate: true });
                    }}
                  />
                </TabsContent>
              </Tabs>
            </div>

            {/* Text */}
            <div className="space-y-1">
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Testo regola</Label>
              <Textarea
                rows={3}
                placeholder="Descrivi la regola in modo chiaro e semplice…"
                {...form.register("text")}
                aria-describedby="text-counter"
              />
              <p id="text-counter" className={cn("text-right text-xs", (watchedText?.length ?? 0) > 270 ? "text-orange-500" : "text-gray-400")}>
                {watchedText?.length ?? 0}/300
              </p>
              {form.formState.errors.text && (
                <p className="text-xs text-red-600" role="alert">{form.formState.errors.text.message}</p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={closeForm}>Annulla</Button>
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
