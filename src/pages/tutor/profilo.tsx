import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { useEffect } from "react";
import Link from "next/link";
import { getDashboardLayout } from "~/layouts/DashboardLayout";
import type { NextPageWithLayout } from "../_app";
import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import { api } from "~/utils/api";

const TutorProfiloPage: NextPageWithLayout = function TutorProfiloPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") void router.replace("/auth/tipo");
    if (status === "authenticated" && session.user.role === "STUDENTE") {
      void router.replace("/studente");
    }
  }, [status, session, router]);

  const { data: structure } = api.structure.get.useQuery(undefined, {
    enabled: status === "authenticated",
  });

  if (status !== "authenticated") return null;

  const initials = (session.user.name ?? session.user.username ?? "T")
    .slice(0, 2)
    .toUpperCase();

  const menuItems = [
    { href: "/tutor/feedback", label: "Feedback studenti", icon: "⭐" },
    { href: "/tutor/regole",   label: "Regole struttura",  icon: "📋" },
    { href: "/tutor/chat",     label: "Chat",              icon: "💬" },
  ];

  return (
    <div className="space-y-6">
      {/* Avatar + info */}
      <div className="flex items-center gap-4 rounded-2xl bg-white border border-gray-100 p-4">
        <Avatar className="h-16 w-16">
          <AvatarFallback className="bg-blue-100 text-blue-700 text-xl font-bold">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="font-semibold text-gray-900">
            {session.user.name ?? session.user.username}
          </p>
          <p className="text-sm text-gray-500 font-mono">@{session.user.username}</p>
          <span className="mt-1 inline-block rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
            Tutor
          </span>
          {structure && (
            <p className="mt-1 text-xs text-gray-400">📍 {structure.name}</p>
          )}
        </div>
      </div>

      {/* Menu items */}
      <div className="rounded-2xl bg-white border border-gray-100 overflow-hidden divide-y divide-gray-100">
        {menuItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-3 px-4 py-3.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <span className="text-base">{item.icon}</span>
            <span className="flex-1">{item.label}</span>
            <span className="text-gray-300">›</span>
          </Link>
        ))}
      </div>

      <Separator />

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

TutorProfiloPage.getLayout = getDashboardLayout("Profilo");

export default TutorProfiloPage;
