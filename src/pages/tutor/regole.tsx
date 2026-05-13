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

const ruleSchema = z.object({
  icon: z.string().min(1, "Obbligatorio"),
  text: z.string().min(1, "Obbligatorio"),
  order: z.number().int(),
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

  const form = useForm<RuleForm>({
    resolver: zodResolver(ruleSchema),
    defaultValues: { order: 0 },
  });

  function openEdit(rule: NonNullable<typeof structure>["rules"][0]) {
    setEditId(rule.id);
    form.reset({ icon: rule.icon, text: rule.text, order: rule.order });
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditId(null);
    form.reset({ order: 0 });
  }

  if (status !== "authenticated") return null;

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          Struttura: <span className="font-medium text-gray-800">{structure?.name}</span>
        </p>
        <Button onClick={() => { form.reset({ order: (structure?.rules.length ?? 0) * 10 }); setShowForm(true); }}>
          + Nuova regola
        </Button>
      </div>

      {isLoading && <p className="py-8 text-center text-sm text-gray-500">Caricamento...</p>}

      <div className="space-y-2">
        {structure?.rules.map((rule) => (
          <Card key={rule.id}>
            <CardContent className="flex items-center gap-4 py-3">
              <span className="text-2xl">{rule.icon}</span>
              <p className="flex-1 text-sm">{rule.text}</p>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => openEdit(rule)}>
                  ✏️
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-red-600"
                  onClick={() => deleteMut.mutate({ id: rule.id })}
                >
                  🗑️
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {structure?.rules.length === 0 && (
          <p className="py-8 text-center text-sm text-gray-500">Nessuna regola</p>
        )}
      </div>

      <Dialog open={showForm} onOpenChange={(o) => !o && closeForm()}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editId ? "Modifica regola" : "Nuova regola"}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={form.handleSubmit((d: RuleForm) =>
              upsertMut.mutate({ id: editId ?? undefined, ...d }),
            )}
            className="space-y-3"
          >
            <div className="space-y-1">
              <Label className="text-xs text-gray-600">Icona (emoji)*</Label>
              <Input placeholder="es. 🚫" {...form.register("icon")} />
              {form.formState.errors.icon && (
                <p className="text-xs text-red-600">{form.formState.errors.icon.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-gray-600">Testo regola*</Label>
              <Textarea rows={3} {...form.register("text")} />
              {form.formState.errors.text && (
                <p className="text-xs text-red-600">{form.formState.errors.text.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-gray-600">Ordinamento</Label>
              <Input
                type="number"
                {...form.register("order", { valueAsNumber: true })}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={closeForm}>
                Annulla
              </Button>
              <Button type="submit" disabled={upsertMut.isPending}>
                {editId ? "Salva" : "Crea"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

RegolePage.getLayout = getDashboardLayout("Regole struttura");

export default RegolePage;
