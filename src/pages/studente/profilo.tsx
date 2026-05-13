import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { useEffect } from "react";
import Link from "next/link";
import { getDashboardLayout } from "~/layouts/DashboardLayout";
import type { NextPageWithLayout } from "../_app";
import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import { ClipboardList, Star, BookOpen, ChevronRight, LogOut } from "lucide-react";

const menuItems = [
  { href: "/studente/storico",  label: "Storico attività",  Icon: ClipboardList },
  { href: "/studente/feedback", label: "I miei feedback",   Icon: Star },
  { href: "/studente/regole",   label: "Regole struttura",  Icon: BookOpen },
];

const StudenteProfiloPage: NextPageWithLayout = function StudenteProfiloPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") void router.replace("/auth/tipo");
    if (status === "authenticated" && session.user.mustChangePassword) {
      void router.replace("/auth/cambio-password");
    }
  }, [status, session, router]);

  if (status !== "authenticated") return null;

  const initials = (session.user.name ?? session.user.username ?? "U")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="space-y-6">
      {/* Avatar + info */}
      <div className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <Avatar className="h-16 w-16">
          <AvatarFallback className="bg-blue-100 text-xl font-bold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="font-semibold text-gray-900 dark:text-gray-100">
            {session.user.name ?? session.user.username}
          </p>
          <p className="font-mono text-sm text-gray-500 dark:text-gray-400">
            @{session.user.username}
          </p>
          <span className="mt-1 inline-block rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
            Studente
          </span>
        </div>
      </div>

      {/* Menu items */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white divide-y divide-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:divide-gray-700">
        {menuItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-3 px-4 py-3.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            <item.Icon className="h-5 w-5 shrink-0 text-gray-400 dark:text-gray-500" aria-hidden="true" />
            <span className="flex-1">{item.label}</span>
            <ChevronRight className="h-4 w-4 text-gray-400 dark:text-gray-500" aria-hidden="true" />
          </Link>
        ))}
      </div>

      <Separator className="dark:bg-gray-700" />

      <Button
        variant="outline"
        className="w-full gap-2 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20 dark:hover:text-red-300"
        onClick={() => void signOut({ callbackUrl: "/auth/tipo" })}
      >
        <LogOut className="h-4 w-4" aria-hidden="true" />
        Esci dall&apos;account
      </Button>
    </div>
  );
};

StudenteProfiloPage.getLayout = getDashboardLayout("Profilo");

export default StudenteProfiloPage;
