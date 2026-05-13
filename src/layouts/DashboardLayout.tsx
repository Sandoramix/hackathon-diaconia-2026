import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/router";
import type { ReactNode } from "react";
import { cn } from "~/lib/utils";
import {
  MessageCircle,
  CalendarDays,
  ListChecks,
  School,
  UserCircle,
  LayoutDashboard,
  Users,
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

export default function DashboardLayout({ children, title }: DashboardLayoutProps) {
  const { data: session, status } = useSession();
  const router = useRouter();

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-700 border-t-transparent" />
      </div>
    );
  }

  const isStudente = session?.user.role === "STUDENTE";
  const nav = isStudente ? studenteNav : tutorNav;

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-gray-950">
      {/* Top header — just title */}
      {title && (
        <header className="sticky top-0 z-20 flex h-14 items-center border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 px-4">
          <h1 className="text-base font-semibold text-gray-900 dark:text-gray-100 truncate">{title}</h1>
        </header>
      )}

      {/* Content */}
      <main className="flex-1 overflow-y-auto pb-20">
        <div className="mx-auto max-w-2xl px-4 py-4">
          {children}
        </div>
      </main>

      {/* Bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="mx-auto flex max-w-2xl">
          {nav.map((item) => {
            const active = router.pathname === item.href ||
              (item.href !== "/tutor" && item.href !== "/studente" && router.pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-medium transition-colors",
                  active ? "text-blue-600" : "text-gray-400 dark:text-gray-500",
                )}
              >
                <Icon
                  className={cn(
                    "h-6 w-6 transition-colors",
                    active ? "text-blue-600" : "text-gray-400 dark:text-gray-500",
                  )}
                  strokeWidth={active ? 2 : 1.5}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export function getDashboardLayout(title?: string) {
  return function getLayout(page: ReactNode) {
    return <DashboardLayout title={title}>{page}</DashboardLayout>;
  };
}
