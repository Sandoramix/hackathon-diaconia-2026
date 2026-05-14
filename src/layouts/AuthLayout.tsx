import Image from "next/image";
import Head from "next/head";
import type { ReactNode } from "react";

import { authGradient } from "~/styles/gradients";

interface AuthLayoutProps {
  children: ReactNode;
  title?: string;
}

export default function AuthLayout({ children, title }: AuthLayoutProps) {
  return (
    <>
      <Head>
        <title>{title ?? "Diaconia"}</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div
        className="flex min-h-screen flex-col items-center p-6"
        style={{ background: authGradient }}
      >
        <div className="pt-8 pb-4 sm:pt-12">
          <Image
            src="/diaconia.png"
            alt="Diaconia"
            width={200}
            height={70}
            className="object-contain"
            priority
          />
        </div>
        <div className="flex flex-1 flex-col items-center w-full max-w-sm">
          {children}
        </div>
      </div>
    </>
  );
}

export function getAuthLayout(page: ReactNode, props?: { title?: string }) {
  return <AuthLayout title={props?.title}>{page}</AuthLayout>;
}
