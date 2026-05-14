import { useSession } from "next-auth/react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { cn } from "~/lib/utils";
import { useTheme } from "~/lib/useTheme";
import { api } from "~/utils/api";

// ── Header actions context — pages inject buttons into the header ─────────────
export const HeaderActionsContext = createContext<{
  setHeaderActions: (node: ReactNode) => void;
}>({ setHeaderActions: () => {} });

export function useHeaderActions() {
  return useContext(HeaderActionsContext);
}
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
  AlertTriangle,
  Radio,
  Bell,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  badge?: React.ComponentType;
}

function ChatUnreadDot() {
  const { data: hasUnread } = api.chat.hasUnread.useQuery(undefined, {
    refetchInterval: 10000,
  });
  if (!hasUnread) return null;
  return (
    <span
      className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-red-500 border-2 border-white dark:border-gray-900"
      aria-label="Messaggi non letti"
    />
  );
}

function AlarmBadge() {
  const { data: count } = api.alarm.count.useQuery(undefined, {
    refetchInterval: 30000,
  });
  if (!count) return null;
  return (
    <span
      className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-0.5 text-[10px] font-bold text-white border-2 border-white dark:border-gray-900"
      aria-label={`${count} allarmi attivi`}
    >
      {count > 9 ? "9+" : count}
    </span>
  );
}

function BroadcastUnreadDot() {
  const { data: hasUnread } = api.broadcast.hasUnread.useQuery(undefined, {
    refetchInterval: 30000,
  });
  if (!hasUnread) return null;
  return (
    <span
      className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-blue-500 border-2 border-white dark:border-gray-900"
      aria-label="Comunicazioni non lette"
    />
  );
}

const tutorNav: NavItem[] = [
  { href: "/tutor",         label: "Home",    icon: LayoutDashboard },
  { href: "/tutor/utenti",  label: "Utenti",  icon: Users },
  { href: "/tutor/chat",    label: "Chat",    icon: MessageCircle, badge: ChatUnreadDot },
  { href: "/tutor/eventi",  label: "Eventi",  icon: CalendarDays },
  { href: "/tutor/task",    label: "Task",    icon: ListChecks },
  { href: "/tutor/profilo", label: "Profilo", icon: UserCircle },
];

const studenteNav: NavItem[] = [
  { href: "/studente",         label: "Home",    icon: LayoutDashboard },
  { href: "/studente/chat",    label: "Chat",    icon: MessageCircle },
  { href: "/studente/task",    label: "Task",    icon: ListChecks },
  { href: "/studente/eventi",  label: "Eventi",  icon: CalendarDays },
  { href: "/studente/regole",  label: "Regole",  icon: School },
  { href: "/studente/profilo", label: "Profilo", icon: UserCircle },
];

function HeaderNavLink({
  href,
  label,
  icon: Icon,
  badge: Badge,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  badge?: React.ComponentType;
}) {
  const router = useRouter();
  const active = router.pathname.startsWith(href);
  return (
    <Link
      href={href}
      aria-label={label}
      className={cn(
        "relative flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full p-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
        active
          ? "text-blue-600 dark:text-blue-400"
          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100",
      )}
    >
      <span className="relative">
        <Icon className="h-5 w-5" aria-hidden="true" />
        {Badge && <Badge />}
      </span>
    </Link>
  );
}

interface DashboardLayoutProps {
  children: ReactNode;
  title?: string;
  noPadding?: boolean;
  wide?: boolean;
}

function DarkToggle() {
  const { isDark, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      aria-label={isDark ? "Passa alla modalità chiara" : "Passa alla modalità scura"}
      className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full p-2 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
    >
      {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );
}

export default function DashboardLayout({ children, title, noPadding, wide }: DashboardLayoutProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [headerActions, setHeaderActionsState] = useState<ReactNode>(null);
  const headerCtx = useMemo(() => ({ setHeaderActions: setHeaderActionsState }), []);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"
          aria-label="Caricamento in corso"
          role="status"
        />
      </div>
    );
  }

  const isStudente = session?.user.role === "STUDENTE";
  const nav = isStudente ? studenteNav : tutorNav;

  return (
    <HeaderActionsContext.Provider value={headerCtx}>
    <>
      <Head>
        <title>{title ? `${title} — Diaconia` : "Diaconia"}</title>
      </Head>
      <div className={cn("flex flex-col bg-gray-100 dark:bg-gray-950", noPadding ? "h-[100svh]" : "min-h-screen")}>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:rounded focus:bg-blue-600 focus:p-3 focus:text-white"
        >
          Vai al contenuto principale
        </a>

        {/* Top header */}
        <header className="sticky top-0 z-20 flex h-14 items-center gap-1 border-b border-gray-200 bg-white px-3 dark:border-gray-800 dark:bg-gray-900">
          {title ? (
            <h1 className="flex-1 truncate text-base font-semibold text-gray-900 dark:text-gray-100 px-1">
              {title}
            </h1>
          ) : (
            <div className="flex-1" />
          )}
          {headerActions}
          {!isStudente && session && (
            <>
              <HeaderNavLink href="/tutor/allarmi" label="Allarmi" icon={AlertTriangle} badge={AlarmBadge} />
              <HeaderNavLink href="/tutor/broadcast" label="Broadcast" icon={Radio} />
            </>
          )}
          {isStudente && session && (
            <HeaderNavLink href="/studente/comunicazioni" label="Comunicazioni" icon={Bell} badge={BroadcastUnreadDot} />
          )}
          <DarkToggle />
        </header>

        {/* Content */}
        {noPadding ? (
          <main
            id="main-content"
            className="flex flex-1 min-h-0 flex-col overflow-hidden"
            style={{ paddingBottom: "3.5rem" }}
          >
            {children}
          </main>
        ) : (
          <main id="main-content" className="flex-1 overflow-y-auto pb-20">
            <div className={cn("mx-auto px-4 py-4", wide ? "max-w-6xl" : "max-w-2xl")}>{children}</div>
          </main>
        )}

        {/* Bottom tab bar */}
        <nav
          className="fixed bottom-0 left-0 right-0 z-30 border-t border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
          aria-label="Navigazione principale"
        >
          <div className="mx-auto flex max-w-2xl">
            {nav.map((item) => {
              const active =
                router.pathname === item.href ||
                (item.href !== "/tutor" &&
                  item.href !== "/studente" &&
                  router.pathname.startsWith(item.href));
              const Icon = item.icon;
              const Badge = item.badge;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-label={item.label}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 py-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500",
                    active
                      ? "text-blue-600 dark:text-blue-400"
                      : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200",
                  )}
                >
                  <span className="relative">
                    <Icon
                      className={cn(
                        "h-6 w-6 transition-colors",
                        active
                          ? "text-blue-600 dark:text-blue-400"
                          : "text-gray-500 dark:text-gray-400",
                      )}
                      strokeWidth={active ? 2 : 1.5}
                      aria-hidden="true"
                    />
                    {Badge && <Badge />}
                  </span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </>
    </HeaderActionsContext.Provider>
  );
}

export function getDashboardLayout(title?: string, opts?: { noPadding?: boolean; wide?: boolean }) {
  return function getLayout(page: ReactNode) {
    return <DashboardLayout title={title} noPadding={opts?.noPadding} wide={opts?.wide}>{page}</DashboardLayout>;
  };
}
