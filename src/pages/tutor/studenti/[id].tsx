import { useState, type ReactNode } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { useEffect } from "react";
import { getDashboardLayout } from "~/layouts/DashboardLayout";
import type { NextPageWithLayout } from "../../_app";
import { api } from "~/utils/api";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { DatePicker } from "~/components/ui/date-time-picker";
import { Textarea } from "~/components/ui/textarea";
import { Skeleton } from "~/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { toast } from "sonner";
import { format } from "date-fns";
import { ChevronDown, Download, FileSpreadsheet, FileText } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";

function exportToCSV(
  entries: { date: Date | string; type: string; title: string; description: string }[],
  student: { name: string | null; username: string },
) {
  const TYPE_LABELS_EXPORT: Record<string, string> = {
    event: "Evento",
    slot: "Slot task",
    task_complete: "Completato",
    feedback: "Feedback",
    note: "Nota tutor",
  };

  const header = ["Data", "Ora", "Tipo", "Titolo", "Descrizione"];
  const rows = entries.map((e) => [
    format(new Date(e.date), "dd/MM/yyyy"),
    format(new Date(e.date), "HH:mm"),
    TYPE_LABELS_EXPORT[e.type] ?? e.type,
    e.title,
    e.description,
  ]);

  const csv =
    "﻿" + // BOM for Excel UTF-8
    [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\r\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `storico_${student.username}_${format(new Date(), "yyyy-MM-dd")}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function exportToPDF(
  entries: { date: Date | string; type: string; title: string; description: string }[],
  student: { name: string | null; username: string },
  filterLabel: string,
) {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const TYPE_LABELS_EXPORT: Record<string, string> = {
    event: "Evento",
    slot: "Slot task",
    task_complete: "Completato",
    feedback: "Feedback",
    note: "Nota tutor",
  };

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Storico Attivita", 14, 18);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80);
  doc.text(`Studente: ${student.name ?? student.username} (@${student.username})`, 14, 27);
  doc.text(`Generato il: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 14, 33);
  if (filterLabel) doc.text(`Filtri: ${filterLabel}`, 14, 39);
  doc.setTextColor(0);

  const startY = filterLabel ? 46 : 40;

  const rows = entries.map((e) => [
    format(new Date(e.date), "dd/MM/yyyy"),
    format(new Date(e.date), "HH:mm"),
    TYPE_LABELS_EXPORT[e.type] ?? e.type,
    e.title,
    e.description,
  ]);

  autoTable(doc, {
    head: [["Data", "Ora", "Tipo", "Titolo", "Descrizione"]],
    body: rows,
    startY,
    theme: "striped",
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: "bold" },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 12 },
      2: { cellWidth: 26 },
      3: { cellWidth: 45 },
      4: { cellWidth: "auto" },
    },
  });

  // Page numbers
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(150);
    doc.text(`Pagina ${i} di ${pageCount}`, pageWidth / 2, pageHeight - 8, { align: "center" });
    doc.setTextColor(0);
  }

  doc.save(`storico_${student.username}_${format(new Date(), "yyyy-MM-dd")}.pdf`);
}

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  event:         { label: "Evento",      color: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300" },
  slot:          { label: "Slot task",   color: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300" },
  task_complete: { label: "Completato",  color: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300" },
  feedback:      { label: "Feedback",    color: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300" },
  note:          { label: "Nota tutor",  color: "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300" },
};

const StudentStorico: NextPageWithLayout = function StudentStorico() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const studentId = router.query.id as string;

  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [noteText, setNoteText] = useState("");
  const [cursor, setCursor] = useState<Date | undefined>(undefined);
  const [allEntries, setAllEntries] = useState<{ id: string; date: Date; type: string; title: string; description: string; meta?: Record<string, unknown> }[]>([]);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") void router.replace("/auth/tipo");
    if (status === "authenticated" && session.user.role === "STUDENTE") {
      void router.replace("/studente");
    }
  }, [status, session, router]);

  const utils = api.useUtils();

  const TYPE_FILTER_LABELS: Record<string, string> = {
    event: "Evento", slot: "Slot task", task_complete: "Completato",
    feedback: "Feedback", note: "Nota tutor",
  };

  const buildFilterLabel = () => {
    const parts: string[] = [];
    if (typeFilter !== "all") parts.push(`Tipo: ${TYPE_FILTER_LABELS[typeFilter] ?? typeFilter}`);
    if (dateFrom) parts.push(`Da: ${dateFrom}`);
    if (dateTo) parts.push(`A: ${dateTo}`);
    return parts.join(" · ");
  };

  const fetchExportData = async () => {
    return utils.history.exportForStudent.fetch({
      studentId,
      type: typeFilter !== "all" ? (typeFilter as "event" | "slot" | "task_complete" | "feedback" | "note") : undefined,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
    });
  };

  const handleExportCSV = async () => {
    if (!studentId) return;
    setExporting(true);
    try {
      const result = await fetchExportData();
      if (result.entries.length === 0) { toast.info("Nessuna voce da esportare"); return; }
      exportToCSV(result.entries, result.student);
      toast.success(`Esportate ${result.entries.length} voci`);
    } catch {
      toast.error("Errore durante l'esportazione");
    } finally {
      setExporting(false);
    }
  };

  const handleExportPDF = async () => {
    if (!studentId) return;
    setExporting(true);
    try {
      const result = await fetchExportData();
      if (result.entries.length === 0) { toast.info("Nessuna voce da esportare"); return; }
      await exportToPDF(result.entries, result.student, buildFilterLabel());
      toast.success(`Esportate ${result.entries.length} voci`);
    } catch {
      toast.error("Errore durante l'esportazione");
    } finally {
      setExporting(false);
    }
  };

  const queryInput = {
    studentId: studentId ?? "",
    type: typeFilter !== "all" ? (typeFilter as "event" | "slot" | "task_complete" | "feedback" | "note") : undefined,
    dateFrom: dateFrom ? new Date(dateFrom) : undefined,
    dateTo: dateTo ? new Date(dateTo) : undefined,
    cursor,
    limit: 20,
  };

  const { data, isLoading, isFetching } = api.history.forStudent.useQuery(
    queryInput,
    { enabled: !!studentId && status === "authenticated" },
  );

  // Reset entries when filters change
  useEffect(() => {
    setCursor(undefined);
    setAllEntries([]);
  }, [typeFilter, dateFrom, dateTo]);

  // Append new page to allEntries
  useEffect(() => {
    if (data?.entries) {
      if (!cursor) {
        setAllEntries(data.entries as typeof allEntries);
      } else {
        setAllEntries((prev) => [...prev, ...data.entries as typeof allEntries]);
      }
    }
  }, [data]);

  const addNoteMut = api.history.addNote.useMutation({
    onSuccess: () => {
      toast.success("Nota aggiunta");
      setNoteText("");
      void utils.history.forStudent.invalidate({ studentId });
      setCursor(undefined);
      setAllEntries([]);
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteNoteMut = api.history.deleteNote.useMutation({
    onSuccess: () => {
      toast.success("Nota eliminata");
      void utils.history.forStudent.invalidate({ studentId });
      setCursor(undefined);
      setAllEntries([]);
    },
    onError: (e) => toast.error(e.message),
  });

  if (status !== "authenticated" || !studentId) return null;

  return (
    <div className="space-y-4">
      {/* Student info header */}
      {data?.student && (
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
          >
            ←
          </button>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 dark:text-gray-100">
              {data.student.name ?? data.student.username}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">@{data.student.username}</p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" disabled={exporting} className="gap-1.5 shrink-0">
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                {exporting ? "Esportazione..." : "Esporta"}
                <ChevronDown className="h-3 w-3" aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExportCSV} className="gap-2">
                <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
                CSV (Excel)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportPDF} className="gap-2">
                <FileText className="h-4 w-4" aria-hidden="true" />
                PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Add note */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
          Aggiungi nota
        </p>
        <Textarea
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          placeholder="Scrivi una nota sullo studente..."
          rows={2}
          className="dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
        />
        <Button
          size="sm"
          disabled={!noteText.trim() || addNoteMut.isPending}
          onClick={() => addNoteMut.mutate({ studentId, content: noteText.trim() })}
        >
          Aggiungi nota
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-40 dark:bg-gray-800 dark:border-gray-700">
            <SelectValue placeholder="Tipo..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti</SelectItem>
            <SelectItem value="event">Evento</SelectItem>
            <SelectItem value="slot">Slot task</SelectItem>
            <SelectItem value="task_complete">Completato</SelectItem>
            <SelectItem value="feedback">Feedback</SelectItem>
            <SelectItem value="note">Nota tutor</SelectItem>
          </SelectContent>
        </Select>
        <DatePicker value={dateFrom} onChange={setDateFrom} placeholder="Da" className="w-36" />
        <DatePicker value={dateTo} onChange={setDateTo} placeholder="A" className="w-36" />
        {(typeFilter !== "all" || dateFrom || dateTo) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setTypeFilter("all"); setDateFrom(""); setDateTo(""); }}
          >
            Reset
          </Button>
        )}
      </div>

      {/* Activity feed */}
      <div className="space-y-2">
        {isLoading && !allEntries.length && (
          <>
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </>
        )}

        {allEntries.map((entry) => {
          const t = TYPE_LABELS[entry.type] ?? { label: entry.type, color: "bg-gray-100 text-gray-700" };
          const isNote = entry.type === "note";
          const noteId = isNote ? (entry.meta?.noteId as string | undefined) : undefined;

          return (
            <div key={entry.id} className="flex gap-3 rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 p-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${t.color}`}>
                    {t.label}
                  </span>
                  <span className="text-xs text-gray-900 dark:text-gray-100 font-medium truncate">
                    {entry.title}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{entry.description}</p>
                {isNote && !!entry.meta?.tutorName && (
                  <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
                    da {String(entry.meta.tutorName)}
                  </p>
                )}
              </div>
              <div className="shrink-0 text-right">
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  {format(new Date(entry.date), "d MMM yy")}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  {format(new Date(entry.date), "HH:mm")}
                </p>
                {isNote && noteId && (
                  <button
                    onClick={() => deleteNoteMut.mutate({ noteId })}
                    className="mt-1 text-xs text-red-400 hover:text-red-600"
                  >
                    Elimina
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {!isLoading && allEntries.length === 0 && (
          <p className="py-12 text-center text-sm text-gray-500 dark:text-gray-400">
            Nessuna attività registrata
          </p>
        )}

        {/* Load more */}
        {data?.nextCursor && (
          <Button
            variant="outline"
            className="w-full dark:border-gray-700 dark:text-gray-300"
            disabled={isFetching}
            onClick={() => setCursor(data.nextCursor!)}
          >
            {isFetching ? "Caricamento..." : "Carica altro"}
          </Button>
        )}
      </div>
    </div>
  );
};

StudentStorico.getLayout = getDashboardLayout("Storico studente");

export default StudentStorico;
