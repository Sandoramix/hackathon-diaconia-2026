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
  DialogDescription,
} from "~/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Switch } from "~/components/ui/switch";
import { Separator } from "~/components/ui/separator";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import { toast } from "sonner";
import {
  Eye, EyeOff, UserPlus, Users, History, Pencil, UserX, UserCheck,
  Download, Printer, FileSpreadsheet, Search, GraduationCap, User,
  Mail, StickyNote, Phone, Key, Info, Plus, Loader2,
} from "lucide-react";
import { cn } from "~/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

type UserRow = {
  id: string;
  name: string | null;
  username: string;
  email: string | null;
  role: string;
  deletedAt: Date | null;
  mustChangePassword: boolean;
  password: string | null;
  notes: string | null;
  familyContacts: string | null;
  createdAt?: Date;
};

type BulkResult = { name: string; username: string; password: string };

// ─── Schemas ─────────────────────────────────────────────────────────────────

const createSchema = z.object({
  username: z.string().min(3, "Min 3 caratteri"),
  password: z.string().min(1, "Obbligatorio"),
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
  passwordTemplate: z.string().min(1, "Obbligatorio"),
  mustChangePassword: z.boolean(),
});

type CreateForm = z.infer<typeof createSchema>;
type BulkForm = z.infer<typeof bulkSchema>;

// ─── Sub-components ──────────────────────────────────────────────────────────

function PasswordInput(props: React.ComponentProps<typeof Input>) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input {...props} type={show ? "text" : "password"} className="pr-10" />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "Nascondi password" : "Mostra password"}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

function StatusBadge({ user }: { user: Pick<UserRow, "deletedAt" | "mustChangePassword"> }) {
  if (user.deletedAt) return <Badge variant="destructive" className="text-xs shrink-0">Disattivo</Badge>;
  if (user.mustChangePassword) return <Badge variant="outline" className="text-xs shrink-0 border-amber-300 text-amber-700 dark:text-amber-400">Cambio pw</Badge>;
  return <Badge className="text-xs shrink-0 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-0">Attivo</Badge>;
}

function InfoRow({ icon: Icon, label, value, mono }: { icon: React.ElementType; label: string; value: ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-start gap-3 text-sm">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-gray-400 dark:text-gray-500" aria-hidden="true" />
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">{label}</p>
        <p className={cn("mt-0.5 text-gray-800 dark:text-gray-200 break-words", mono && "font-mono text-xs")}>{value}</p>
      </div>
    </div>
  );
}

// ─── User details modal ───────────────────────────────────────────────────────

function UserDetailsModal({
  user,
  onClose,
  onEdit,
  onDelete,
  onRestore,
  onStorico,
}: {
  user: UserRow | null;
  onClose: () => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onRestore: (id: string) => void;
  onStorico: (id: string) => void;
}) {
  if (!user) return null;
  const initials = (user.name ?? user.username).slice(0, 2).toUpperCase();
  const isDeleted = !!user.deletedAt;
  const hasInitialPw = user.mustChangePassword && user.password && !user.password.startsWith("$2");

  return (
    <Dialog open={!!user} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className={cn("text-sm font-bold", isDeleted ? "bg-gray-100 text-gray-500" : "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300")}>
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <p>{user.name ?? user.username}</p>
              <p className="font-normal text-sm text-gray-500 font-mono">@{user.username}</p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-1">
          <div className="flex items-center gap-2">
            <StatusBadge user={user} />
            <Badge variant="outline" className="text-xs">
              {user.role === "STUDENTE" ? "Studente" : "Tutor"}
            </Badge>
          </div>

          {user.email && <InfoRow icon={Mail} label="Email" value={user.email} />}
          {hasInitialPw && <InfoRow icon={Key} label="Password iniziale" value={user.password!} mono />}
          {user.notes && <InfoRow icon={StickyNote} label="Note" value={user.notes} />}
          {user.familyContacts && <InfoRow icon={Phone} label="Contatti familiari" value={user.familyContacts} />}
        </div>

        <Separator />

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => { onStorico(user.id); onClose(); }}
          >
            <History className="h-3.5 w-3.5" aria-hidden="true" />
            Storico
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => { onEdit(user.id); onClose(); }}
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
            Modifica
          </Button>
          {isDeleted ? (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-green-700 border-green-300 hover:bg-green-50 dark:text-green-400 dark:border-green-700"
              onClick={() => { onRestore(user.id); onClose(); }}
            >
              <UserCheck className="h-3.5 w-3.5" aria-hidden="true" />
              Ripristina
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800"
              onClick={() => { onDelete(user.id); onClose(); }}
            >
              <UserX className="h-3.5 w-3.5" aria-hidden="true" />
              Disattiva
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Bulk export modal ────────────────────────────────────────────────────────

function BulkExportModal({ results, onClose }: { results: BulkResult[]; onClose: () => void }) {
  function downloadCSV() {
    const rows = [
      ["Nome", "Username", "Password"],
      ...results.map((r) => [r.name, r.username, r.password]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "utenti_creati.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function printTable() {
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><title>Utenti creati</title>
<style>
body{font-family:system-ui,sans-serif;padding:20px}
h2{margin-bottom:16px}
table{width:100%;border-collapse:collapse;font-size:13px}
th{background:#f0f0f0;font-weight:600;text-align:left}
th,td{border:1px solid #ccc;padding:6px 10px}
tr:nth-child(even){background:#f9f9f9}
</style></head><body>
<h2>Utenti creati (${results.length})</h2>
<table><tr><th>Nome</th><th>Username</th><th>Password</th></tr>
${results.map((r) => `<tr><td>${r.name || "—"}</td><td>${r.username}</td><td>${r.password}</td></tr>`).join("")}
</table></body></html>`);
    win.document.close();
    win.print();
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-green-600" aria-hidden="true" />
            {results.length} utenti creati
          </DialogTitle>
          <DialogDescription>
            Salva o stampa le credenziali prima di chiudere.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2 flex-wrap py-1">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={downloadCSV}>
            <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
            Scarica CSV / Excel
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={printTable}>
            <Printer className="h-4 w-4" aria-hidden="true" />
            Stampa / PDF
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
              <tr>
                <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Nome</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Username</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Password</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {results.map((r, i) => (
                <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-3 py-2 text-gray-500 dark:text-gray-400">{r.name || <span className="italic text-gray-300">—</span>}</td>
                  <td className="px-3 py-2 font-mono">{r.username}</td>
                  <td className="px-3 py-2 font-mono text-blue-700 dark:text-blue-300">{r.password}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Button onClick={onClose} className="mt-2">
          Chiudi
        </Button>
      </DialogContent>
    </Dialog>
  );
}

// ─── User card ────────────────────────────────────────────────────────────────

function UserCard({
  user,
  onDetails,
  onEdit,
  onDelete,
  onRestore,
  onStorico,
}: {
  user: UserRow;
  onDetails: (u: UserRow) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onRestore: (id: string) => void;
  onStorico: (id: string) => void;
}) {
  const isDeleted = !!user.deletedAt;
  const initials = (user.name ?? user.username).slice(0, 2).toUpperCase();

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border bg-white p-3 transition-colors dark:bg-gray-800",
        isDeleted
          ? "border-gray-200 opacity-60 dark:border-gray-700"
          : "border-gray-200 dark:border-gray-700",
      )}
    >
      <button
        onClick={() => onDetails(user)}
        className="flex flex-1 items-center gap-3 min-w-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-lg"
        aria-label={`Dettagli di ${user.name ?? user.username}`}
      >
        <Avatar className="h-10 w-10 shrink-0">
          <AvatarFallback
            className={cn(
              "text-sm font-bold",
              isDeleted
                ? "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                : user.role === "TUTOR"
                ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300"
                : "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
            )}
          >
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
            {user.name ?? user.username}
          </p>
          <p className="truncate font-mono text-xs text-gray-500 dark:text-gray-400">
            @{user.username}
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <StatusBadge user={user} />
          <Info className="h-4 w-4 text-gray-300 dark:text-gray-600" aria-hidden="true" />
        </div>
      </button>

      <div className="flex shrink-0 items-center gap-1 border-l border-gray-100 pl-2 dark:border-gray-700">
        <Button
          size="icon"
          variant="ghost"
          className="h-9 w-9 text-gray-500 hover:text-gray-700 dark:text-gray-400"
          onClick={() => onStorico(user.id)}
          aria-label="Storico"
          title="Storico attività"
        >
          <History className="h-4 w-4" aria-hidden="true" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-9 w-9 text-gray-500 hover:text-gray-700 dark:text-gray-400"
          onClick={() => onEdit(user.id)}
          aria-label="Modifica"
          title="Modifica utente"
        >
          <Pencil className="h-4 w-4" aria-hidden="true" />
        </Button>
        {isDeleted ? (
          <Button
            size="icon"
            variant="ghost"
            className="h-9 w-9 text-green-600 hover:text-green-700 dark:text-green-400"
            onClick={() => onRestore(user.id)}
            aria-label="Ripristina utente"
            title="Ripristina utente"
          >
            <UserCheck className="h-4 w-4" aria-hidden="true" />
          </Button>
        ) : (
          <Button
            size="icon"
            variant="ghost"
            className="h-9 w-9 text-red-500 hover:text-red-700 dark:text-red-400"
            onClick={() => onDelete(user.id)}
            aria-label="Disattiva utente"
            title="Disattiva utente"
          >
            <UserX className="h-4 w-4" aria-hidden="true" />
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

const UtentiPage: NextPageWithLayout = function UtentiPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [editUser, setEditUser] = useState<string | null>(null);
  const [detailsUser, setDetailsUser] = useState<UserRow | null>(null);
  const [showDeleted, setShowDeleted] = useState(false);
  const [bulkResults, setBulkResults] = useState<BulkResult[] | null>(null);
  const [lastBulkForm, setLastBulkForm] = useState<BulkForm | null>(null);
  const [search, setSearch] = useState("");

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
      if (lastBulkForm) {
        const results: BulkResult[] = Array.from({ length: d.created }, (_, i) => ({
          name: "",
          username: `${lastBulkForm.prefix}${String(i + 1).padStart(3, "0")}`,
          password: lastBulkForm.passwordTemplate,
        }));
        setBulkResults(results);
      }
    },
    onError: (e) => toast.error(e.message),
  });

  const softDeleteMut = api.user.softDelete.useMutation({
    onSuccess: () => { toast.success("Utente disattivato"); void utils.user.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const restoreMut = api.user.restore.useMutation({
    onSuccess: () => { toast.success("Utente ripristinato"); void utils.user.list.invalidate(); },
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

  const typedUsers = users as UserRow[];
  const lower = search.toLowerCase();
  const filtered = typedUsers.filter(
    (u) =>
      (u.name ?? "").toLowerCase().includes(lower) ||
      u.username.toLowerCase().includes(lower),
  );

  const sorted = [...filtered].sort((a, b) => {
    if (!!a.deletedAt === !!b.deletedAt) return 0;
    return a.deletedAt ? 1 : -1;
  });

  const studenti = sorted.filter((u) => u.role === "STUDENTE");
  const tutor = sorted.filter((u) => u.role === "TUTOR");

  function handleDelete(id: string) {
    softDeleteMut.mutate({ id });
    setDetailsUser(null);
  }

  function handleRestore(id: string) {
    restoreMut.mutate({ id });
    setDetailsUser(null);
  }

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
          <Input
            placeholder="Cerca utente…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 text-sm"
            aria-label="Cerca utente"
          />
        </div>
        <Label className="flex cursor-pointer items-center gap-2 text-sm whitespace-nowrap" htmlFor="toggle-deleted">
          <Switch id="toggle-deleted" checked={showDeleted} onCheckedChange={setShowDeleted} />
          Disattivati
        </Label>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowBulk(true)}>
          <Users className="h-4 w-4" aria-hidden="true" />
          In blocco
        </Button>
        <Button size="sm" className="gap-1.5" onClick={() => { createForm.reset({ role: "STUDENTE", mustChangePassword: true }); setShowCreate(true); }}>
          <UserPlus className="h-4 w-4" aria-hidden="true" />
          Nuovo
        </Button>
      </div>

      <Tabs defaultValue="studenti">
        <TabsList className="w-full">
          <TabsTrigger value="studenti" className="flex-1 gap-1.5">
            <User className="h-4 w-4" aria-hidden="true" />
            Studenti ({studenti.length})
          </TabsTrigger>
          <TabsTrigger value="tutor" className="flex-1 gap-1.5">
            <GraduationCap className="h-4 w-4" aria-hidden="true" />
            Tutor ({tutor.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="studenti" className="mt-3 space-y-2">
          {isLoading && <p className="py-8 text-center text-sm text-gray-500">Caricamento...</p>}
          {!isLoading && studenti.length === 0 && (
            <p className="py-8 text-center text-sm text-gray-500">Nessuno studente</p>
          )}
          {studenti.map((u) => (
            <UserCard
              key={u.id}
              user={u}
              onDetails={setDetailsUser}
              onEdit={setEditUser}
              onDelete={handleDelete}
              onRestore={handleRestore}
              onStorico={(id) => void router.push(`/tutor/studenti/${id}`)}
            />
          ))}
        </TabsContent>

        <TabsContent value="tutor" className="mt-3 space-y-2">
          {isLoading && <p className="py-8 text-center text-sm text-gray-500">Caricamento...</p>}
          {!isLoading && tutor.length === 0 && (
            <p className="py-8 text-center text-sm text-gray-500">Nessun tutor</p>
          )}
          {tutor.map((u) => (
            <UserCard
              key={u.id}
              user={u}
              onDetails={setDetailsUser}
              onEdit={setEditUser}
              onDelete={handleDelete}
              onRestore={handleRestore}
              onStorico={(id) => void router.push(`/tutor/studenti/${id}`)}
            />
          ))}
        </TabsContent>
      </Tabs>

      {/* Details modal */}
      <UserDetailsModal
        user={detailsUser}
        onClose={() => setDetailsUser(null)}
        onEdit={(id) => { setEditUser(id); setDetailsUser(null); }}
        onDelete={handleDelete}
        onRestore={handleRestore}
        onStorico={(id) => { void router.push(`/tutor/studenti/${id}`); setDetailsUser(null); }}
      />

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" aria-hidden="true" />
              Nuovo utente
            </DialogTitle>
          </DialogHeader>
          <form
            onSubmit={createForm.handleSubmit((d: CreateForm) =>
              createMut.mutate({ ...d, email: d.email || undefined }),
            )}
            className="space-y-3"
          >
            <FormRow label="Username *" icon={User}>
              <Input {...createForm.register("username")} />
              {createForm.formState.errors.username && (
                <p className="text-xs text-red-600">{createForm.formState.errors.username.message}</p>
              )}
            </FormRow>
            <FormRow label="Password *" icon={Key}>
              <PasswordInput {...createForm.register("password")} />
            </FormRow>
            <FormRow label="Tipo" icon={GraduationCap}>
              <Select
                defaultValue="STUDENTE"
                onValueChange={(v) => createForm.setValue("role", v as "STUDENTE" | "TUTOR")}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="STUDENTE">Studente</SelectItem>
                  <SelectItem value="TUTOR">Tutor</SelectItem>
                </SelectContent>
              </Select>
            </FormRow>
            <FormRow label="Nome" icon={User}>
              <Input {...createForm.register("name")} />
            </FormRow>
            <FormRow label="Email" icon={Mail}>
              <Input type="email" {...createForm.register("email")} />
            </FormRow>
            <FormRow label="Note" icon={StickyNote}>
              <Textarea rows={2} {...createForm.register("notes")} />
            </FormRow>
            <FormRow label="Contatti familiari" icon={Phone}>
              <Textarea rows={2} {...createForm.register("familyContacts")} />
            </FormRow>
            <div className="flex items-center gap-2">
              <Switch
                checked={createForm.watch("mustChangePassword")}
                onCheckedChange={(v) => createForm.setValue("mustChangePassword", v)}
              />
              <Label className="text-sm">Cambio password al primo accesso</Label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>
                Annulla
              </Button>
              <Button type="submit" disabled={createMut.isPending} className="gap-1.5">
                {createMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />}
                {createMut.isPending ? "Creando…" : "Crea"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Bulk create dialog */}
      <Dialog open={showBulk} onOpenChange={setShowBulk}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" aria-hidden="true" />
              Crea studenti in blocco
            </DialogTitle>
          </DialogHeader>
          <form
            onSubmit={bulkForm.handleSubmit((d: BulkForm) => {
              setLastBulkForm(d);
              bulkMut.mutate(d);
            })}
            className="space-y-3"
          >
            <FormRow label="Prefisso username *" icon={User}>
              <Input placeholder="es. studente" {...bulkForm.register("prefix")} />
            </FormRow>
            <FormRow label="Quantità *" icon={Users}>
              <Input
                type="number"
                min={1}
                max={100}
                {...bulkForm.register("count", { valueAsNumber: true })}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Crea: {bulkForm.watch("prefix") || "prefix"}001 … {bulkForm.watch("prefix") || "prefix"}
                {String(bulkForm.watch("count") || 1).padStart(3, "0")}
              </p>
            </FormRow>
            <FormRow label="Password template *" icon={Key}>
              <PasswordInput {...bulkForm.register("passwordTemplate")} />
            </FormRow>
            <div className="flex items-center gap-2">
              <Switch
                checked={bulkForm.watch("mustChangePassword")}
                onCheckedChange={(v) => bulkForm.setValue("mustChangePassword", v)}
              />
              <Label className="text-sm">Cambio password al primo accesso</Label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowBulk(false)}>
                Annulla
              </Button>
              <Button type="submit" disabled={bulkMut.isPending} className="gap-1.5">
                {bulkMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <UserPlus className="h-4 w-4" aria-hidden="true" />}
                {bulkMut.isPending ? "Creando…" : "Crea"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      {editUser && (
        <EditUserDialog userId={editUser} onClose={() => setEditUser(null)} />
      )}

      {/* Bulk export results */}
      {bulkResults && (
        <BulkExportModal results={bulkResults} onClose={() => setBulkResults(null)} />
      )}
    </div>
  );
};

// ─── Edit dialog ──────────────────────────────────────────────────────────────

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
    newPassword: z.string().optional().or(z.literal("")),
  });

  const form = useForm<z.infer<typeof editSchema>>({
    resolver: zodResolver(editSchema),
    values: user ? {
      name: user.name ?? "",
      email: user.email ?? "",
      notes: user.notes ?? "",
      familyContacts: user.familyContacts ?? "",
      mustChangePassword: user.mustChangePassword,
      newPassword: "",
    } : undefined,
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
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5" aria-hidden="true" />
            Modifica {user?.username}
          </DialogTitle>
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
            <FormRow label="Nome" icon={User}><Input {...form.register("name")} /></FormRow>
            <FormRow label="Email" icon={Mail}><Input type="email" {...form.register("email")} /></FormRow>
            <FormRow label="Note" icon={StickyNote}><Textarea rows={2} {...form.register("notes")} /></FormRow>
            <FormRow label="Contatti familiari" icon={Phone}><Textarea rows={2} {...form.register("familyContacts")} /></FormRow>
            <FormRow label="Nuova password (opzionale)" icon={Key}><PasswordInput {...form.register("newPassword")} /></FormRow>
            <div className="flex items-center gap-2">
              <Switch
                checked={form.watch("mustChangePassword")}
                onCheckedChange={(v) => form.setValue("mustChangePassword", v)}
              />
              <Label className="text-sm">Cambio password al prossimo accesso</Label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onClose}>Annulla</Button>
              <Button type="submit" disabled={updateMut.isPending} className="gap-1.5">
                <Download className="h-4 w-4" aria-hidden="true" />
                Salva
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function FormRow({ label, icon: Icon, children }: { label: string; icon: React.ElementType; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-400">
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        {label}
      </Label>
      {children}
    </div>
  );
}

UtentiPage.getLayout = getDashboardLayout("Utenti");

export default UtentiPage;
