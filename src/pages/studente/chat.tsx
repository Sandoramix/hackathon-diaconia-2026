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

const StudenteChatPage: NextPageWithLayout = function StudenteChatPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (status === "unauthenticated") void router.replace("/auth/tipo");
    if (status === "authenticated" && session.user.mustChangePassword) {
      void router.replace("/auth/cambio-password");
    }
  }, [status, session, router]);

  const utils = api.useUtils();

  const { data: convos = [], isLoading: convosLoading } = api.chat.myConversations.useQuery(
    undefined,
    { enabled: status === "authenticated", refetchInterval: 5000 },
  );

  const { data: tutors = [] } = api.user.listTutors.useQuery(undefined, {
    enabled: status === "authenticated",
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

  const getOrCreateMut = api.chat.getOrCreate.useMutation({
    onSuccess: (c) => {
      setActiveId(c.id);
      void utils.chat.myConversations.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  useEffect(() => {
    if (!activeId && convos.length > 0 && convos[0]) {
      setActiveId(convos[0].id);
    }
  }, [convos, activeId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    if (activeId) markReadMut.mutate({ conversationId: activeId });
  }, [msgs, activeId]);

  if (status !== "authenticated") return null;

  const me = session.user;
  const existingTutorIds = new Set(convos.map((c) => c.tutorId));
  const newTutors = tutors.filter((t) => !existingTutorIds.has(t.id));

  return (
    <div className="flex h-[calc(100vh-8rem)] rounded-xl border border-gray-200 bg-white overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 border-r border-gray-200 flex flex-col overflow-hidden">
        <div className="p-3 text-xs font-semibold uppercase tracking-wide text-gray-400 border-b shrink-0">
          Conversazioni
        </div>
        <div className="flex-1 overflow-y-auto">
          {convosLoading && <p className="p-3 text-sm text-gray-500">Caricamento...</p>}
          {convos.map((c) => {
            const other = c.tutor;
            const lastMsg = c.messages[0];
            return (
              <button
                key={c.id}
                onClick={() => setActiveId(c.id)}
                className={cn(
                  "flex w-full items-center gap-2 p-3 text-left hover:bg-gray-50 transition-colors",
                  activeId === c.id && "bg-blue-50",
                )}
              >
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className="bg-blue-100 text-blue-700 text-xs">
                    {(other.name ?? other.username).slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{other.name ?? other.username}</p>
                  {lastMsg && (
                    <p className="text-xs text-gray-500 truncate">{lastMsg.text}</p>
                  )}
                </div>
              </button>
            );
          })}
          {!convosLoading && convos.length === 0 && (
            <p className="p-3 text-xs text-gray-400">Nessuna conversazione</p>
          )}
        </div>

        {/* Start new conversation */}
        {newTutors.length > 0 && (
          <div className="border-t p-2 shrink-0">
            <p className="mb-1.5 text-xs text-gray-400 uppercase font-semibold px-1">Nuovo</p>
            {newTutors.map((t) => (
              <button
                key={t.id}
                onClick={() => getOrCreateMut.mutate({ withUserId: t.id })}
                disabled={getOrCreateMut.isPending}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <span className="text-gray-400">+</span>
                <span className="truncate">{t.name ?? t.username}</span>
              </button>
            ))}
          </div>
        )}
      </aside>

      {/* Message area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {activeId ? (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {msgs?.messages.map((msg) => {
                const isMe = msg.senderId === me.id;
                return (
                  <div key={msg.id} className={cn("flex", isMe ? "justify-end" : "justify-start")}>
                    <div
                      className={cn(
                        "max-w-[75%] rounded-2xl px-3 py-2 text-sm",
                        isMe
                          ? "bg-blue-600 text-white rounded-br-sm"
                          : "bg-gray-100 text-gray-900 rounded-bl-sm",
                      )}
                    >
                      <p>{msg.text}</p>
                      <p className={cn("mt-0.5 text-right text-[10px]", isMe ? "text-blue-200" : "text-gray-400")}>
                        {new Date(msg.createdAt).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>
            <div className="border-t border-gray-200 p-3 flex gap-2 shrink-0">
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
          <div className="flex flex-1 items-center justify-center text-sm text-gray-400">
            {tutors.length === 0
              ? "Nessun tutor disponibile"
              : "Seleziona o avvia una conversazione"}
          </div>
        )}
      </div>
    </div>
  );
};

StudenteChatPage.getLayout = getDashboardLayout("Chat");

export default StudenteChatPage;
