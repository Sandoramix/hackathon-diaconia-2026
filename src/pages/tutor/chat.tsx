import { useState, useRef, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { getDashboardLayout } from "~/layouts/DashboardLayout";
import type { NextPageWithLayout } from "../_app";
import { api } from "~/utils/api";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import { cn } from "~/lib/utils";
import { toast } from "sonner";
import { ArrowLeft, Search, Send, Plus, CheckCheck, Loader2 } from "lucide-react";
import { format, isToday, isYesterday, isSameDay, startOfDay } from "date-fns";
import { it } from "date-fns/locale";

type MobileView = "list" | "chat";
type Msg = {
  id: string;
  text: string;
  senderId: string;
  createdAt: Date | string;
  readAt?: Date | string | null;
};

function DateSeparator({ date }: { date: Date }) {
  const label = isToday(date)
    ? "Oggi"
    : isYesterday(date)
    ? "Ieri"
    : format(date, "EEEE d MMMM", { locale: it });
  return (
    <div className="flex items-center gap-3 py-1.5" aria-label={`Messaggi del ${label}`}>
      <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
      <span className="text-xs font-semibold uppercase tracking-wide text-gray-400 capitalize dark:text-gray-500">
        {label}
      </span>
      <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
    </div>
  );
}

const ChatPage: NextPageWithLayout = function ChatPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [search, setSearch] = useState("");
  const [mobileView, setMobileView] = useState<MobileView>("list");

  // Message state
  const [messages, setMessages] = useState<Msg[]>([]);
  const [oldestCursor, setOldestCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const prevActiveIdRef = useRef<string | null>(null);

  const msgsContainerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isAtBottomRef = useRef(true);

  useEffect(() => {
    if (status === "unauthenticated") void router.replace("/auth/tipo");
    if (status === "authenticated" && session.user.role === "STUDENTE") {
      void router.replace("/studente");
    }
  }, [status, session, router]);

  const utils = api.useUtils();

  const { data: convos = [], isLoading: convosLoading } = api.chat.myConversations.useQuery(
    undefined,
    { enabled: status === "authenticated", refetchInterval: 5000 },
  );

  const { data: allStudents = [] } = api.user.list.useQuery(
    { role: "STUDENTE" },
    { enabled: status === "authenticated" },
  );

  const getOrCreateMut = api.chat.getOrCreate.useMutation({
    onSuccess: (c) => {
      setActiveId(c.id);
      void utils.chat.myConversations.invalidate();
      setMobileView("chat");
      setSearch("");
    },
    onError: (e) => toast.error(e.message),
  });

  // Auto-open chat when ?username= is in the URL
  const handledUsernameRef = useRef<string | null>(null);
  useEffect(() => {
    const username = typeof router.query.username === "string" ? router.query.username : null;
    if (!username || allStudents.length === 0) return;
    if (handledUsernameRef.current === username) return;
    handledUsernameRef.current = username;
    const student = allStudents.find((s) => s.username === username);
    if (student) {
      getOrCreateMut.mutate({ withUserId: student.id });
    } else {
      toast.error("Studente non trovato");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.query.username, allStudents]);

  // Latest messages polling
  const { data: latestData } = api.chat.messages.useQuery(
    { conversationId: activeId!, limit: 25 },
    { enabled: !!activeId, refetchInterval: 3000 },
  );

  // When conversation changes, reset message state
  useEffect(() => {
    if (activeId !== prevActiveIdRef.current) {
      prevActiveIdRef.current = activeId;
      setMessages([]);
      setOldestCursor(null);
      setHasMore(false);
    }
  }, [activeId]);

  // Merge latest polled messages into state
  useEffect(() => {
    if (!latestData || !activeId) return;
    setMessages((prev) => {
      if (prev.length === 0) {
        setOldestCursor(latestData.nextCursor);
        setHasMore(latestData.nextCursor !== null);
        return latestData.messages;
      }
      // Append any new messages not yet in state
      const existingIds = new Set(prev.map((m) => m.id));
      const newMsgs = latestData.messages.filter((m) => !existingIds.has(m.id));
      if (newMsgs.length === 0) return prev;
      return [...prev, ...newMsgs];
    });
  }, [latestData]);

  // Auto-scroll to bottom when new messages arrive and user was at bottom
  useEffect(() => {
    if (isAtBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length]);

  // Mark read
  const markReadMut = api.chat.markRead.useMutation({
    onSuccess: () => void utils.chat.hasUnread.invalidate(),
  });
  useEffect(() => {
    if (activeId) markReadMut.mutate({ conversationId: activeId });
  }, [activeId, messages.length]);

  const loadOlderMessages = useCallback(async () => {
    if (!activeId || !oldestCursor || loadingOlder) return;
    const container = msgsContainerRef.current;
    const prevScrollHeight = container?.scrollHeight ?? 0;
    setLoadingOlder(true);
    try {
      const data = await utils.chat.messages.fetch({
        conversationId: activeId,
        cursor: oldestCursor,
        limit: 25,
      });
      setMessages((prev) => [...data.messages, ...prev]);
      setOldestCursor(data.nextCursor);
      setHasMore(data.nextCursor !== null);
      requestAnimationFrame(() => {
        if (container) container.scrollTop = container.scrollHeight - prevScrollHeight;
      });
    } catch {
      // ignore
    } finally {
      setLoadingOlder(false);
    }
  }, [activeId, oldestCursor, loadingOlder, utils]);

  function handleMsgsScroll() {
    const el = msgsContainerRef.current;
    if (!el) return;
    isAtBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 50;
    if (el.scrollTop < 80 && hasMore && !loadingOlder) void loadOlderMessages();
  }

  const sendMut = api.chat.send.useMutation({
    onSuccess: () => {
      setText("");
      void utils.chat.myConversations.invalidate();
      void utils.chat.hasUnread.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  if (status !== "authenticated") return null;

  const me = session.user;
  const existingStudentIds = new Set(convos.map((c) => c.studentId));
  const lowerSearch = search.toLowerCase();

  const filteredConvos = convos.filter((c) =>
    (c.student.name ?? c.student.username).toLowerCase().includes(lowerSearch),
  );
  const filteredNewStudents = allStudents
    .filter((s) => !existingStudentIds.has(s.id))
    .filter((s) => (s.name ?? s.username).toLowerCase().includes(lowerSearch));

  const activeConvo = convos.find((c) => c.id === activeId);
  const activeOther = activeConvo?.student;

  function selectConvo(id: string) {
    setActiveId(id);
    setMobileView("chat");
    setTimeout(() => inputRef.current?.focus(), 100);
  }

  function sendMessage() {
    if (!activeId || !text.trim()) return;
    sendMut.mutate({ conversationId: activeId, text: text.trim() });
  }

  // Group messages by date for separators
  const groupedMessages: { date: Date; msgs: Msg[] }[] = [];
  for (const msg of messages) {
    const d = startOfDay(new Date(msg.createdAt));
    const last = groupedMessages[groupedMessages.length - 1];
    if (last && isSameDay(d, last.date)) {
      last.msgs.push(msg);
    } else {
      groupedMessages.push({ date: d, msgs: [msg] });
    }
  }

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden mx-auto w-full max-w-2xl border-x border-gray-200 dark:border-gray-700">
      {/* ── Sidebar ── */}
      <aside
        className={cn(
          "flex w-full flex-col border-r border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900 md:flex md:w-72",
          mobileView === "list" ? "flex" : "hidden",
        )}
      >
        <div className="border-b border-gray-200 p-3 dark:border-gray-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
            <Input placeholder="Cerca studente…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 text-sm" aria-label="Cerca studente" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {convosLoading && <p className="p-3 text-sm text-gray-500 dark:text-gray-400">Caricamento...</p>}

          {filteredConvos.length > 0 && (
            <div>
              <p className="px-3 pb-1 pt-2.5 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">Conversazioni</p>
              {filteredConvos.map((c) => {
                const lastMsg = c.messages[0];
                const unread = c._count.messages;
                return (
                  <button key={c.id} onClick={() => selectConvo(c.id)} aria-current={activeId === c.id ? "true" : undefined}
                    className={cn("flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-gray-100 dark:hover:bg-gray-700",
                      activeId === c.id && "bg-blue-50 dark:bg-blue-900/30")}>
                    <div className="relative shrink-0">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-blue-100 text-xs font-semibold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                          {(c.student.name ?? c.student.username).slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {unread > 0 && (
                        <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                          {unread > 9 ? "9+" : unread}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={cn("truncate text-sm", unread > 0 ? "font-semibold text-gray-900 dark:text-gray-100" : "font-medium text-gray-700 dark:text-gray-300")}>
                        {c.student.name ?? c.student.username}
                      </p>
                      {lastMsg && <p className={cn("truncate text-xs", unread > 0 ? "text-gray-600 dark:text-gray-300" : "text-gray-400 dark:text-gray-500")}>{lastMsg.text}</p>}
                    </div>
                    {unread > 0 && <span className="h-2 w-2 shrink-0 rounded-full bg-red-500" aria-hidden="true" />}
                  </button>
                );
              })}
            </div>
          )}

          {filteredNewStudents.length > 0 && (
            <div className="mt-1 border-t border-gray-100 dark:border-gray-700/60">
              <p className="px-3 pb-1 pt-2.5 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">Nuova chat</p>
              {filteredNewStudents.map((s) => (
                <button key={s.id} onClick={() => getOrCreateMut.mutate({ withUserId: s.id })} disabled={getOrCreateMut.isPending}
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-gray-100 dark:hover:bg-gray-700">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700">
                    <Plus className="h-4 w-4 text-gray-500 dark:text-gray-400" aria-hidden="true" />
                  </div>
                  <p className="truncate text-sm font-medium text-gray-700 dark:text-gray-300">{s.name ?? s.username}</p>
                </button>
              ))}
            </div>
          )}

          {!convosLoading && filteredConvos.length === 0 && filteredNewStudents.length === 0 && (
            <p className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">{search ? "Nessun risultato" : "Nessuna conversazione"}</p>
          )}
        </div>
      </aside>

      {/* ── Message area ── */}
      <div className={cn("flex flex-1 flex-col overflow-hidden bg-white dark:bg-gray-900",
        mobileView === "chat" ? "flex" : "hidden md:flex")}>
        {activeId && activeOther ? (
          <>
            {/* Header */}
            <div className="flex shrink-0 items-center gap-3 border-b border-gray-200 px-3 py-2.5 dark:border-gray-700">
              <button onClick={() => setMobileView("list")} aria-label="Torna alla lista"
                className="flex h-9 w-9 items-center justify-center rounded-full text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 md:hidden">
                <ArrowLeft className="h-5 w-5" aria-hidden="true" />
              </button>
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="bg-blue-100 text-xs font-semibold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                  {(activeOther.name ?? activeOther.username).slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <p className="font-semibold text-gray-900 dark:text-gray-100">{activeOther.name ?? activeOther.username}</p>
            </div>

            {/* Messages */}
            <div ref={msgsContainerRef} onScroll={handleMsgsScroll} className="flex-1 overflow-y-auto px-4 py-3">
              {/* Load older indicator */}
              {loadingOlder && (
                <div className="flex justify-center py-2">
                  <Loader2 className="h-4 w-4 animate-spin text-gray-400" aria-label="Caricamento messaggi precedenti" />
                </div>
              )}
              {hasMore && !loadingOlder && (
                <button onClick={() => void loadOlderMessages()} className="flex w-full justify-center py-2 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400">
                  Carica messaggi precedenti
                </button>
              )}

              {groupedMessages.map(({ date, msgs }) => (
                <div key={date.toISOString()}>
                  <DateSeparator date={date} />
                  <div className="space-y-2">
                    {msgs.map((msg) => {
                      const isMe = msg.senderId === me.id;
                      const isRead = isMe && !!msg.readAt;
                      return (
                        <div key={msg.id} className={cn("flex", isMe ? "justify-end" : "justify-start")}>
                          <div className={cn("max-w-[78%] rounded-2xl px-3.5 py-2 text-sm",
                            isMe ? "bg-blue-600 text-white rounded-br-sm"
                              : "bg-gray-100 text-gray-900 rounded-bl-sm dark:bg-gray-700 dark:text-gray-100")}>
                            <p className="leading-snug">{msg.text}</p>
                            <div className={cn("mt-0.5 flex items-center gap-1 text-xs",
                              isMe ? "justify-end text-blue-200" : "text-gray-400 dark:text-gray-500")}>
                              <span>{format(new Date(msg.createdAt), "HH:mm")}</span>
                              {isMe && <CheckCheck className={cn("h-3 w-3", isRead ? "text-blue-200" : "text-blue-300/60")} aria-label={isRead ? "Letto" : "Inviato"} />}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              {messages.length === 0 && !loadingOlder && (
                <p className="py-8 text-center text-sm text-gray-400 dark:text-gray-500">Nessun messaggio ancora</p>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="flex shrink-0 gap-2 border-t border-gray-200 p-3 dark:border-gray-700">
              <Input ref={inputRef} value={text} onChange={(e) => setText(e.target.value)} placeholder="Scrivi un messaggio…" className="flex-1"
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && text.trim()) { e.preventDefault(); sendMessage(); } }}
                aria-label="Messaggio" />
              <Button size="icon" disabled={!text.trim() || sendMut.isPending} onClick={sendMessage} aria-label="Invia">
                {sendMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}
              </Button>
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-gray-400 dark:text-gray-500">
            <Search className="h-8 w-8 opacity-40" aria-hidden="true" />
            <p className="text-sm">Seleziona una conversazione</p>
          </div>
        )}
      </div>
    </div>
  );
};

ChatPage.getLayout = getDashboardLayout("Chat", { noPadding: true });

export default ChatPage;
