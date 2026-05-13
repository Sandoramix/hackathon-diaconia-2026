import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { useEffect } from "react";
import { getDashboardLayout } from "~/layouts/DashboardLayout";
import type { NextPageWithLayout } from "../_app";
import { api } from "~/utils/api";
import { Skeleton } from "~/components/ui/skeleton";

const StudenteRegolePage: NextPageWithLayout = function StudenteRegolePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") void router.replace("/auth/tipo");
    if (status === "authenticated" && session.user.mustChangePassword) {
      void router.replace("/auth/cambio-password");
    }
  }, [status, session, router]);

  const { data: structure, isLoading } = api.structure.get.useQuery(undefined, {
    enabled: status === "authenticated",
  });

  if (status !== "authenticated") return null;

  return (
    <div className="space-y-4">
      {isLoading && (
        <div className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      )}
      {structure?.rules.length === 0 && (
        <p className="py-12 text-center text-sm text-gray-500 dark:text-gray-400">Nessuna regola definita</p>
      )}
      <div className="space-y-3">
        {structure?.rules.map((rule, i) => (
          <div
            key={rule.id}
            className="flex items-start gap-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4"
          >
            <span className="text-2xl leading-none">{rule.icon}</span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                Regola {i + 1}
              </p>
              <p className="mt-0.5 text-sm text-gray-800 dark:text-gray-100">{rule.text}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

StudenteRegolePage.getLayout = getDashboardLayout("Regole");

export default StudenteRegolePage;
