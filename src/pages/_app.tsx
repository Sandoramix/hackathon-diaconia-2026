import { type Session } from "next-auth";
import { SessionProvider } from "next-auth/react";
import { type AppType } from "next/app";
import { type NextPage } from "next/types";
import { Geist } from "next/font/google";
import type { ReactNode } from "react";

import { api } from "~/utils/api";

import "~/styles/globals.css";

export type NextPageWithLayout<P = Record<string, unknown>, IP = P> = NextPage<P, IP> & {
  getLayout?: (page: ReactNode, pageProps: P) => ReactNode;
};

const geist = Geist({
  subsets: ["latin"],
});

const MyApp: AppType<{ session: Session | null }> = ({
  Component,
  pageProps: { session, ...pageProps },
}) => {
  const getLayout = (Component as NextPageWithLayout).getLayout ?? ((page: ReactNode) => page);

  return (
    <SessionProvider session={session}>
      <div className={geist.className}>
        {getLayout(<Component {...pageProps} />, pageProps as Record<string, unknown>)}
      </div>
    </SessionProvider>
  );
};

export default api.withTRPC(MyApp);
