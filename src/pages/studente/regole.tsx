import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { useEffect } from "react";
import { getDashboardLayout } from "~/layouts/DashboardLayout";
import type { NextPageWithLayout } from "../_app";
import { api } from "~/utils/api";
import { Skeleton } from "~/components/ui/skeleton";
import { ICON_MAP, parseLucideIcon } from "~/lib/lucideIcons";
import { RenderIcon } from "~/components/RenderIcon";
import { cn } from "~/lib/utils";

function RuleIcon({ icon }: { icon: string }) {
  const parsed = parseLucideIcon(icon);
  if (parsed.type === "lucide") {
    const IconComp = ICON_MAP[parsed.name];
    if (!IconComp) return null;
    return (
      <IconComp
        className={cn("h-7 w-7 shrink-0", parsed.color || "text-gray-700 dark:text-gray-300")}
        aria-hidden="true"
      />
    );
  }
  if (parsed.type === "emoji") {
    return <span className="text-2xl leading-none shrink-0" aria-hidden="true">{parsed.value}</span>;
  }
  // composite: fall back to RenderIcon
  return <RenderIcon icon={icon} className="h-7 w-7 shrink-0 text-gray-700 dark:text-gray-300" />;
}

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
    <div className="space-y-3">
      {isLoading && (
        <div className="space-y-3" aria-busy="true">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      )}

      {!isLoading && structure?.rules.length === 0 && (
        <p className="py-12 text-center text-sm text-gray-500 dark:text-gray-400">
          Nessuna regola definita
        </p>
      )}

      <ol aria-label="Regole della struttura" className="space-y-2">
        {structure?.rules.map((rule, i) => (
          <li
            key={rule.id}
            className="flex items-start gap-4 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-50 dark:bg-gray-700">
              <RuleIcon icon={rule.icon} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                Regola {i + 1}
              </p>
              <p className="mt-0.5 text-sm leading-relaxed text-gray-800 dark:text-gray-100">
                {rule.text}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
};

StudenteRegolePage.getLayout = getDashboardLayout("Regole");

export default StudenteRegolePage;
