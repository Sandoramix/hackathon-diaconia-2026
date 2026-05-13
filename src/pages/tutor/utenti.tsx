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
import { Badge } from "~/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Textarea } from "~/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Switch } from "~/components/ui/switch";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";

function PasswordInput(props: React.ComponentProps<typeof Input>) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input {...props} type={show ? "text" : "password"} className="pr-10" />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setShow((s) => !s)}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

const createSchema = z.object({
  username: z.string().min(3, "Min 3 caratteri"),
  password: z.string().min(6, "Min 6 caratteri"),
  role: z.enum(["STUDENTE", "TUTOR"]),
  name: z.string().optional(),
  email: z.string().email("Email non valida").optional().or(z.literal("")),
  notes: z.string().optional(),
  familyContacts: z.string().optional(),
  mustChangePassword: z.boolean(),
});

const bulkSchema = z.object({
  prefix: z.string().min(1).max(20, "Max 20 caratteri"),
  count: z.number().int().min(1).max(100),
  passwordTemplate: z.string().min(6),
  mustChangePassword: z.boolean(),
});

type CreateForm = z.infer<typeof createSchema>;
type BulkForm = z.infer<typeof bulkSchema>;

const UtentiPage: NextPageWithLayout = function UtentiPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [editUser, setEditUser] = useState<string | null>(null);
  const [showDeleted, setShowDeleted] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") void router.replace("/auth/tipo");
    if (status === "authenticated" && session.user.role === "STUDENTE") {
      void router.replace("/studente");
    }
  }, [status, session, router]);

  const utils = api.useUtils();
  const { data: users = [], isLoading } = api.user.list.useQuery(
    { includeDeleted: showDeleted },
    { enabled: status === "authenticated" },
  );

  const createMut = api.user.create.useMutation({
    onSuccess: () => {
      toast.success("Utente creato");
      void utils.user.list.invalidate();
      setShowCreate(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const bulkMut = api.user.bulkCreate.useMutation({
    onSuccess: (d) => {
      toast.success(`${d.created} utenti creati`);
      void utils.user.list.invalidate();
      setShowBulk(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const softDeleteMut = api.user.softDelete.useMutation({
    onSuccess: () => {
      toast.success("Utente disattivato");
      void utils.user.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const restoreMut = api.user.restore.useMutation({
    onSuccess: () => {
      toast.success("Utente ripristinato");
      void utils.user.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const createForm = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { role: "STUDENTE", mustChangePassword: true },
  });

  const bulkForm = useForm<BulkForm>({
    resolver: zodResolver(bulkSchema),
    defaultValues: { count: 10, mustChangePassword: true },
  });

  if (status !== "authenticated") return null;

  type UserRow = { id: string; name: string | null; username: string; email: string | null; role: string; deletedAt: Date | null; mustChangePassword: boolean; password: string | null; notes: string | null; familyContacts: string | null };
  const typedUsers = users as UserRow[];
  const studenti = typedUsers.filter((u) => u.role === "STUDENTE");
  const tutor = typedUsers.filter((u) => u.role === "TUTOR");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Label className="flex items-center gap-2 text-sm">
            <Switch checked={showDeleted} onCheckedChange={setShowDeleted} />
            Mostra eliminati
          </Label>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowBulk(true)}>
            Crea in blocco
          </Button>
          <Button onClick={() => setShowCreate(true)}>+ Nuovo utente</Button>
        </div>
      </div>

      <Tabs defaultValue="studenti">
        <TabsList>
          <TabsTrigger value="studenti">Studenti ({studenti.length})</TabsTrigger>
          <TabsTrigger value="tutor">Tutor ({tutor.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="studenti">
          <UserTable
            users={studenti}
            loading={isLoading}
            onEdit={setEditUser}
            onDelete={(id) => softDeleteMut.mutate({ id })}
            onRestore={(id) => restoreMut.mutate({ id })}
            onStorico={(id) => void router.push(`/tutor/studenti/${id}`)}
          />
        </TabsContent>

        <TabsContent value="tutor">
          <UserTable
            users={tutor}
            loading={isLoading}
            onEdit={setEditUser}
            onDelete={(id) => softDeleteMut.mutate({ id })}
            onRestore={(id) => restoreMut.mutate({ id })}
            onStorico={(id) => void router.push(`/tutor/studenti/${id}`)}
          />
        </TabsContent>
      </Tabs>

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nuovo utente</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={createForm.handleSubmit((d: CreateForm) =>
              createMut.mutate({ ...d, email: d.email || undefined }),
            )}
            className="space-y-3"
          >
            <FormRow label="Username*">
              <Input {...createForm.register("username")} />
              {createForm.formState.errors.username && (
                <p className="text-xs text-red-600">{createForm.formState.errors.username.message}</p>
              )}
            </FormRow>
            <FormRow label="Password*">
              <PasswordInput {...createForm.register("password")} />
            </FormRow>
            <FormRow label="Tipo">
              <Select
                defaultValue="STUDENTE"
                onValueChange={(v) => createForm.setValue("role", v as "STUDENTE" | "TUTOR")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="STUDENTE">Studente</SelectItem>
                  <SelectItem value="TUTOR">Tutor</SelectItem>
                </SelectContent>
              </Select>
            </FormRow>
            <FormRow label="Nome">
              <Input {...createForm.register("name")} />
            </FormRow>
            <FormRow label="Email">
              <Input type="email" {...createForm.register("email")} />
            </FormRow>
            <FormRow label="Note">
              <Textarea rows={2} {...createForm.register("notes")} />
            </FormRow>
            <FormRow label="Contatti familiari">
              <Textarea rows={2} {...createForm.register("familyContacts")} />
            </FormRow>
            <div className="flex items-center gap-2">
              <Switch
                checked={createForm.watch("mustChangePassword")}
                onCheckedChange={(v) => createForm.setValue("mustChangePassword", v)}
              />
              <Label>Cambio password al primo accesso</Label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>
                Annulla
              </Button>
              <Button type="submit" disabled={createMut.isPending}>
                Crea
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Bulk create dialog */}
      <Dialog open={showBulk} onOpenChange={setShowBulk}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Crea studenti in blocco</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={bulkForm.handleSubmit((d: BulkForm) => bulkMut.mutate(d))}
            className="space-y-3"
          >
            <FormRow label="Prefisso username*">
              <Input placeholder="es. student" {...bulkForm.register("prefix")} />
            </FormRow>
            <FormRow label="Quantità*">
              <Input
                type="number"
                min={1}
                max={100}
                {...bulkForm.register("count", { valueAsNumber: true })}
              />
              <p className="text-xs text-gray-500">
                Crea: {bulkForm.watch("prefix") || "prefix"}001 … {bulkForm.watch("prefix") || "prefix"}
                {String(bulkForm.watch("count") || 1).padStart(3, "0")}
              </p>
            </FormRow>
            <FormRow label="Password template*">
              <PasswordInput {...bulkForm.register("passwordTemplate")} />
            </FormRow>
            <div className="flex items-center gap-2">
              <Switch
                checked={bulkForm.watch("mustChangePassword")}
                onCheckedChange={(v) => bulkForm.setValue("mustChangePassword", v)}
              />
              <Label>Cambio password al primo accesso</Label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowBulk(false)}>
                Annulla
              </Button>
              <Button type="submit" disabled={bulkMut.isPending}>
                Crea
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      {editUser && (
        <EditUserDialog
          userId={editUser}
          onClose={() => setEditUser(null)}
        />
      )}
    </div>
  );
};

function UserTable({
  users,
  loading,
  onEdit,
  onDelete,
  onRestore,
  onStorico,
}: {
  users: {
    id: string;
    name: string | null;
    username: string;
    email: string | null | undefined;
    role: string;
    deletedAt: Date | null;
    mustChangePassword: boolean;
    password: string | null;
  }[];
  loading: boolean;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onRestore: (id: string) => void;
  onStorico: (id: string) => void;
}) {
  if (loading) return <p className="py-8 text-center text-sm text-gray-500">Caricamento...</p>;
  if (!users.length) return <p className="py-8 text-center text-sm text-gray-500">Nessun utente</p>;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Username</TableHead>
          <TableHead>Nome</TableHead>
          <TableHead>Password iniziale</TableHead>
          <TableHead>Stato</TableHead>
          <TableHead className="text-right">Azioni</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((u) => (
          <TableRow key={u.id} className={u.deletedAt ? "opacity-50" : ""}>
            <TableCell className="font-mono text-sm">{u.username}</TableCell>
            <TableCell>{u.name ?? "—"}</TableCell>
            <TableCell className="font-mono text-sm text-gray-600">
              {u.mustChangePassword && u.password && !u.password.startsWith("$2")
                ? u.password
                : "—"}
            </TableCell>
            <TableCell>
              {u.deletedAt ? (
                <Badge variant="destructive">Eliminato</Badge>
              ) : u.mustChangePassword ? (
                <Badge variant="outline">Cambio pw</Badge>
              ) : (
                <Badge variant="default">Attivo</Badge>
              )}
            </TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-1">
                <Button size="sm" variant="ghost" onClick={() => onStorico(u.id)}>
                  Storico
                </Button>
                <Button size="sm" variant="ghost" onClick={() => onEdit(u.id)}>
                  Modifica
                </Button>
                {u.deletedAt ? (
                  <Button size="sm" variant="ghost" onClick={() => onRestore(u.id)}>
                    Ripristina
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-600 hover:text-red-700"
                    onClick={() => onDelete(u.id)}
                  >
                    Disattiva
                  </Button>
                )}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function EditUserDialog({ userId, onClose }: { userId: string; onClose: () => void }) {
  const utils = api.useUtils();
  type FullUser = { id: string; username: string; name: string | null; email: string | null; role: string; mustChangePassword: boolean; notes: string | null; familyContacts: string | null; deletedAt: Date | null };
  const { data: rawUser, isLoading } = api.user.getById.useQuery({ id: userId });
  const user = rawUser as FullUser | undefined;

  const editSchema = z.object({
    name: z.string().optional(),
    email: z.string().email().optional().or(z.literal("")),
    notes: z.string().optional(),
    familyContacts: z.string().optional(),
    mustChangePassword: z.boolean().optional(),
    newPassword: z.string().min(6).optional().or(z.literal("")),
  });

  const form = useForm<z.infer<typeof editSchema>>({
    resolver: zodResolver(editSchema),
    values: user
      ? {
          name: user.name ?? "",
          email: user.email ?? "",
          notes: user.notes ?? "",
          familyContacts: user.familyContacts ?? "",
          mustChangePassword: user.mustChangePassword,
          newPassword: "",
        }
      : undefined,
  });

  const updateMut = api.user.update.useMutation({
    onSuccess: () => {
      toast.success("Utente aggiornato");
      void utils.user.list.invalidate();
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Modifica {user?.username}</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <p className="py-4 text-center text-sm">Caricamento...</p>
        ) : (
          <form
            onSubmit={form.handleSubmit((d) =>
              updateMut.mutate({
                id: userId,
                name: d.name || undefined,
                email: d.email || null,
                notes: d.notes || null,
                familyContacts: d.familyContacts || null,
                mustChangePassword: d.mustChangePassword,
                newPassword: d.newPassword || undefined,
              }),
            )}
            className="space-y-3"
          >
            <FormRow label="Nome">
              <Input {...form.register("name")} />
            </FormRow>
            <FormRow label="Email">
              <Input type="email" {...form.register("email")} />
            </FormRow>
            <FormRow label="Note">
              <Textarea rows={2} {...form.register("notes")} />
            </FormRow>
            <FormRow label="Contatti familiari">
              <Textarea rows={2} {...form.register("familyContacts")} />
            </FormRow>
            <FormRow label="Nuova password (opzionale)">
              <PasswordInput {...form.register("newPassword")} />
            </FormRow>
            <div className="flex items-center gap-2">
              <Switch
                checked={form.watch("mustChangePassword")}
                onCheckedChange={(v) => form.setValue("mustChangePassword", v)}
              />
              <Label>Cambio password al prossimo accesso</Label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Annulla
              </Button>
              <Button type="submit" disabled={updateMut.isPending}>
                Salva
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function FormRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-gray-600">{label}</Label>
      {children}
    </div>
  );
}

UtentiPage.getLayout = getDashboardLayout("Utenti");

export default UtentiPage;
