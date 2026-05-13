import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { useEffect } from "react";
import Link from "next/link";
import { getDashboardLayout } from "~/layouts/DashboardLayout";
import type { NextPageWithLayout } from "../_app";
import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import { useTheme } from "~/lib/useTheme";
import { Sun, Moon } from "lucide-react";

const StudenteProfiloPage: NextPageWithLayout = function StudenteProfiloPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { isDark, toggle } = useTheme();

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

  const menuItems = [
    { href: "/studente/storico",  label: "Storico attività",  icon: "📋" },
    { href: "/studente/feedback", label: "I miei feedback",   icon: "⭐" },
    { href: "/studente/regole",   label: "Regole struttura",  icon: "📖" },
  ];

  return (
    <div className="space-y-6">
      {/* Avatar + info */}
      <div className="flex items-center gap-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-4">
        <Avatar className="h-16 w-16">
          <AvatarFallback className="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xl font-bold">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="font-semibold text-gray-900 dark:text-gray-100">
            {session.user.name ?? session.user.username}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">@{session.user.username}</p>
          <span className="mt-1 inline-block rounded-full bg-blue-50 dark:bg-indigo-900/30 px-2 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-300">
            Studente
          </span>
        </div>
      </div>

      {/* Menu items */}
      <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 overflow-hidden divide-y divide-gray-100 dark:divide-gray-700">
        {menuItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-3 px-4 py-3.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <span className="text-base">{item.icon}</span>
            <span className="flex-1">{item.label}</span>
            <span className="text-gray-300">›</span>
          </Link>
        ))}
      </div>

      {/* Dark mode toggle */}
      <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 overflow-hidden">
        <button
          onClick={toggle}
          className="flex w-full items-center gap-3 px-4 py-3.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          {isDark ? <Sun className="h-5 w-5 shrink-0" /> : <Moon className="h-5 w-5 shrink-0" />}
          <span className="flex-1">{isDark ? "Modalità chiara" : "Modalità scura"}</span>
          <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
            {isDark ? "ON" : "OFF"}
          </span>
        </button>
      </div>

      <Separator className="dark:bg-gray-700" />

      <Button
        variant="outline"
        className="w-full text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
        onClick={() => void signOut({ callbackUrl: "/auth/tipo" })}
      >
        Esci dall&apos;account
      </Button>
    </div>
  );
};

StudenteProfiloPage.getLayout = getDashboardLayout("Profilo");

export default StudenteProfiloPage;
