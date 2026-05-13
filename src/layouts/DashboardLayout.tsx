import { useSession } from "next-auth/react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import type { ReactNode } from "react";
import { cn } from "~/lib/utils";
import { useTheme } from "~/lib/useTheme";
import {
  MessageCircle,
  CalendarDays,
  ListChecks,
  School,
  UserCircle,
  LayoutDashboard,
  Users,
  Sun,
  Moon,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}

const tutorNav: NavItem[] = [
  { href: "/tutor",         label: "Home",   icon: LayoutDashboard },
  { href: "/tutor/utenti",  label: "Utenti", icon: Users },
  { href: "/tutor/eventi",  label: "Eventi", icon: CalendarDays },
  { href: "/tutor/task",    label: "Task",   icon: ListChecks },
  { href: "/tutor/profilo", label: "Profilo",icon: UserCircle },
];

const studenteNav: NavItem[] = [
  { href: "/studente/chat",   label: "Chat",   icon: MessageCircle },
  { href: "/studente/task",   label: "Task",   icon: ListChecks },
  { href: "/studente/eventi", label: "Eventi", icon: CalendarDays },
  { href: "/studente/regole", label: "Regole", icon: School },
  { href: "/studente/profilo",label: "Profilo",icon: UserCircle },
];

interface DashboardLayoutProps {
  children: ReactNode;
  title?: string;
}

function DarkToggle() {
  const { isDark, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      aria-label={isDark ? "Passa alla modalità chiara" : "Passa alla modalità scura"}
      className="rounded-full p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 min-h-[44px] min-w-[44px] flex items-center justify-center"
    >
      {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );
}

export default function DashboardLayout({ children, title }: DashboardLayoutProps) {
  const { data: session, status } = useSession();
  const router = useRouter();

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" aria-label="Caricamento in corso" role="status" />
      </div>
    );
  }

  const isStudente = session?.user.role === "STUDENTE";
  const nav = isStudente ? studenteNav : tutorNav;

  return (
    <>
      <Head>
        <title>{title ? `${title} — Diaconia` : "Diaconia"}</title>
      </Head>
    <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-gray-950">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-blue-600 focus:text-white focus:p-3 focus:rounded"
      >
        Vai al contenuto principale
      </a>

      {/* Top header */}
      <header className="sticky top-0 z-20 flex h-14 items-center border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 gap-2">
        {title ? (
          <h1 className="flex-1 text-base font-semibold text-gray-900 dark:text-gray-100 truncate">
            {title}
          </h1>
        ) : (
          <div className="flex-1" />
        )}
        <DarkToggle />
      </header>

      {/* Content */}
      <main id="main-content" className="flex-1 overflow-y-auto pb-20">
        <div className="mx-auto max-w-2xl px-4 py-4">
          {children}
        </div>
      </main>

      {/* Bottom tab bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-30 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900"
        aria-label="Navigazione principale"
      >
        <div className="mx-auto flex max-w-2xl">
          {nav.map((item) => {
            const active = router.pathname === item.href ||
              (item.href !== "/tutor" && item.href !== "/studente" && router.pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.label}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-1 flex-col items-center justify-center gap-0.5 py-2 min-h-[56px] text-[10px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500",
                  active ? "text-blue-600" : "text-gray-400 dark:text-gray-500",
                )}
              >
                <Icon
                  className={cn(
                    "h-6 w-6 transition-colors",
                    active ? "text-blue-600" : "text-gray-400 dark:text-gray-500",
                  )}
                  strokeWidth={active ? 2 : 1.5}
                  aria-hidden="true"
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
    </>
  );
}

export function getDashboardLayout(title?: string) {
  return function getLayout(page: ReactNode) {
    return <DashboardLayout title={title}>{page}</DashboardLayout>;
  };
}
