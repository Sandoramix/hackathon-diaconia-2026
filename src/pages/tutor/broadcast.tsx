import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { getDashboardLayout } from "~/layouts/DashboardLayout";
import type { NextPageWithLayout } from "../_app";
import { api } from "~/utils/api";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Badge } from "~/components/ui/badge";
import { Skeleton } from "~/components/ui/skeleton";
import { ChevronDown, ChevronUp, Radio, Trash2, Users } from "lucide-react";
import { toast } from "sonner";

const schema = z.object({
  title: z.string().min(1, "Obbligatorio").max(200),
  body: z.string().min(1, "Obbligatorio").max(5000),
});
type FormData = z.infer<typeof schema>;

const BroadcastPage: NextPageWithLayout = function BroadcastPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") void router.replace("/auth/tipo");
    if (status === "authenticated" && session.user.role === "STUDENTE") {
      void router.replace("/studente");
    }
  }, [status, session, router]);

  const { data: broadcasts, isLoading, refetch } = api.broadcast.list.useQuery(undefined, {
    enabled: status === "authenticated",
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const create = api.broadcast.create.useMutation({
    onSuccess: () => {
      void refetch();
      reset();
      toast.success("Comunicazione inviata a tutti gli studenti");
    },
    onError: () => toast.error("Errore durante l'invio"),
  });

  const deleteBroadcast = api.broadcast.delete.useMutation({
    onSuccess: () => {
      void refetch();
      toast.success("Comunicazione eliminata");
    },
    onError: () => toast.error("Errore"),
  });

  if (status !== "authenticated") return null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Radio className="h-4 w-4" aria-hidden="true" />
            Nuova comunicazione
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit((data) => create.mutate(data))} className="space-y-3">
            <div>
              <Input placeholder="Titolo" {...register("title")} />
              {errors.title && (
                <p className="text-xs text-red-500 mt-1">{errors.title.message}</p>
              )}
            </div>
            <div>
              <Textarea placeholder="Messaggio..." rows={4} {...register("body")} />
              {errors.body && (
                <p className="text-xs text-red-500 mt-1">{errors.body.message}</p>
              )}
            </div>
            <Button type="submit" disabled={create.isPending} className="w-full">
              {create.isPending ? "Invio..." : "Invia a tutti gli studenti"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
          Comunicazioni inviate
        </p>

        {isLoading && [1, 2].map((i) => <Skeleton key={i} className="h-20 w-full" />)}

        {!isLoading && broadcasts?.length === 0 && (
          <p className="text-center text-sm text-gray-500 py-8">
            Nessuna comunicazione inviata
          </p>
        )}

        {broadcasts?.map((b) => (
          <Card key={b.id}>
            <CardContent className="pt-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{b.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {new Date(b.createdAt).toLocaleString("it-IT")}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline" className="text-xs gap-1">
                      <Users className="h-3 w-3" aria-hidden="true" />
                      {b.readCount}/{b.totalStudents} letto
                    </Badge>
                    {b.unreadCount > 0 && (
                      <Badge variant="destructive" className="text-xs">
                        {b.unreadCount} non {b.unreadCount === 1 ? "letto" : "letti"}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setExpandedId(expandedId === b.id ? null : b.id)}
                    aria-label={expandedId === b.id ? "Comprimi" : "Espandi"}
                  >
                    {expandedId === b.id ? (
                      <ChevronUp className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <ChevronDown className="h-4 w-4" aria-hidden="true" />
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteBroadcast.mutate({ broadcastId: b.id })}
                    disabled={deleteBroadcast.isPending}
                    className="text-red-500 hover:text-red-600"
                    aria-label="Elimina comunicazione"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>

              {expandedId === b.id && (
                <div className="mt-3 border-t pt-3 space-y-3">
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {b.body}
                  </p>
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">
                      Letto da ({b.reads.length}):
                    </p>
                    {b.reads.length === 0 ? (
                      <p className="text-xs text-gray-400">Nessuno ha letto ancora</p>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {b.reads.map((r) => (
                          <Badge key={r.studentId} variant="outline" className="text-xs">
                            {r.student.name ?? r.student.username}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

BroadcastPage.getLayout = getDashboardLayout("Broadcast");

export default BroadcastPage;
