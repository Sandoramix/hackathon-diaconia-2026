import { useState, useRef, useEffect } from "react";
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

const ChatPage: NextPageWithLayout = function ChatPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (status === "unauthenticated") void router.replace("/auth/tipo");
    if (status === "authenticated" && session.user.role === "STUDENTE") {
      void router.replace("/studente");
    }
  }, [status, session, router]);

  const { data: convos = [], isLoading: convosLoading } = api.chat.myConversations.useQuery(
    undefined,
    { enabled: status === "authenticated", refetchInterval: 5000 },
  );

  const { data: students = [] } = api.user.list.useQuery(
    { role: "STUDENTE" },
    { enabled: status === "authenticated" },
  );

  const getOrCreateMut = api.chat.getOrCreate.useMutation({
    onSuccess: (c) => {
      setActiveId(c.id);
      void refetchMsgs();
    },
    onError: (e) => toast.error(e.message),
  });

  const { data: msgs, refetch: refetchMsgs } = api.chat.messages.useQuery(
    { conversationId: activeId! },
    { enabled: !!activeId, refetchInterval: 3000 },
  );

  const sendMut = api.chat.send.useMutation({
    onSuccess: () => {
      setText("");
      void refetchMsgs();
    },
    onError: (e) => toast.error(e.message),
  });

  const markReadMut = api.chat.markRead.useMutation();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    if (activeId) markReadMut.mutate({ conversationId: activeId });
  }, [msgs, activeId]);

  if (status !== "authenticated") return null;

  const me = session.user;

  return (
    <div className="flex h-[calc(100vh-8rem)] rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 border-r border-gray-200 dark:border-gray-700 overflow-y-auto dark:bg-gray-900">
        <div className="p-3 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 border-b dark:border-gray-700">
          Conversazioni
        </div>
        {convosLoading && (
          <p className="p-3 text-sm text-gray-500 dark:text-gray-400">Caricamento...</p>
        )}
        {convos.map((c) => {
          const other = c.student;
          const lastMsg = c.messages[0];
          return (
            <button
              key={c.id}
              onClick={() => setActiveId(c.id)}
              className={cn(
                "flex w-full items-center gap-3 p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors",
                activeId === c.id && "bg-blue-50 dark:bg-blue-900/30",
              )}
            >
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs">
                  {(other.name ?? other.username).slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{other.name ?? other.username}</p>
                {lastMsg && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{lastMsg.text}</p>
                )}
              </div>
            </button>
          );
        })}
        {!convosLoading && convos.length === 0 && (
          <p className="p-3 text-sm text-gray-500 dark:text-gray-400">Nessuna conversazione</p>
        )}
        {students.length > 0 && (
          <div className="border-t p-3">
            <p className="mb-2 text-xs text-gray-400 dark:text-gray-500 uppercase font-semibold">Nuova chat</p>
            {students
              .filter((s) => !convos.some((c) => c.studentId === s.id))
              .map((s) => (
                <button
                  key={s.id}
                  onClick={() => getOrCreateMut.mutate({ withUserId: s.id })}
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <span>+</span>
                  <span className="truncate">{s.name ?? s.username}</span>
                </button>
              ))}
          </div>
        )}
      </aside>

      {/* Message area */}
      <div className="flex flex-1 flex-col">
        {activeId ? (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {msgs?.messages.map((msg) => {
                const isMe = msg.senderId === me.id;
                return (
                  <div
                    key={msg.id}
                    className={cn("flex", isMe ? "justify-end" : "justify-start")}
                  >
                    <div
                      className={cn(
                        "max-w-xs rounded-2xl px-3 py-2 text-sm",
                        isMe
                          ? "bg-blue-600 text-white rounded-br-sm"
                          : "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-bl-sm",
                      )}
                    >
                      <p>{msg.text}</p>
                      <p
                        className={cn(
                          "mt-0.5 text-right text-xs",
                          isMe ? "text-blue-200" : "text-gray-400 dark:text-gray-500",
                        )}
                      >
                        {new Date(msg.createdAt).toLocaleTimeString("it-IT", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>
            <div className="border-t border-gray-200 dark:border-gray-700 p-3 flex gap-2">
              <Input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Scrivi un messaggio..."
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && text.trim()) {
                    e.preventDefault();
                    sendMut.mutate({ conversationId: activeId, text: text.trim() });
                  }
                }}
              />
              <Button
                disabled={!text.trim() || sendMut.isPending}
                onClick={() => sendMut.mutate({ conversationId: activeId, text: text.trim() })}
              >
                Invia
              </Button>
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-gray-400 dark:text-gray-500">
            Seleziona una conversazione
          </div>
        )}
      </div>
    </div>
  );
};

ChatPage.getLayout = getDashboardLayout("Chat");

export default ChatPage;
