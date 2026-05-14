import Image from "next/image";
import Head from "next/head";
import type { ReactNode } from "react";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "~/lib/useTheme";
import { authGradientLight } from "~/styles/gradients";

interface AuthHeaderLayoutProps {
  children: ReactNode;
  title?: string;
}

function DarkToggle() {
  const { isDark, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      aria-label="Toggle dark mode"
      className="absolute right-4 top-1/2 -translate-y-1/2 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full p-2 text-white/70 hover:text-white hover:bg-white/10 transition-colors"
    >
      {isDark ? <Sun className="h-7 w-7" /> : <Moon className="h-7 w-7" />}
    </button>
  );
}

export default function AuthHeaderLayout({ children, title }: AuthHeaderLayoutProps) {
  return (
    <>
      <Head>
        <title>{title ?? "Diaconia"}</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="flex min-h-screen flex-col dark:bg-gray-950">
        <header
          className="relative flex items-center justify-center py-10"
          style={{ background: authGradientLight }}
        >
          <Image
            src="/diaconia.png"
            alt="Diaconia"
            width={180}
            height={60}
            className="object-contain"
            priority
          />
          <DarkToggle />
        </header>
        <main className="flex flex-1 items-center justify-center bg-white dark:bg-gray-900 p-4 sm:p-8">
          <div className="w-full max-w-sm">
            {children}
          </div>
        </main>
      </div>
    </>
  );
}

export function getAuthHeaderLayout(page: ReactNode, props?: { title?: string }) {
  return <AuthHeaderLayout title={props?.title}>{page}</AuthHeaderLayout>;
}
