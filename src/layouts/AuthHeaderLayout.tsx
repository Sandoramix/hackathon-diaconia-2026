import Image from "next/image";
import Head from "next/head";
import type { ReactNode } from "react";

import {authGradient, authGradientLight} from "~/styles/gradients";

interface AuthHeaderLayoutProps {
  children: ReactNode;
  title?: string;
}

export default function AuthHeaderLayout({ children, title }: AuthHeaderLayoutProps) {
  return (
    <>
      <Head>
        <title>{title ?? "Accedi"}</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="flex min-h-screen flex-col">
        <header
          className="flex items-center justify-center py-10"
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
        </header>
        <main className="flex flex-1 items-center justify-center bg-white p-8">
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
