import { type Session } from "next-auth";
import { SessionProvider } from "next-auth/react";
import { type AppType } from "next/app";
import { type NextPage } from "next/types";
import localFont from "next/font/local";
import type { ReactNode } from "react";

import { api } from "~/utils/api";

import "~/styles/globals.css";

export type NextPageWithLayout<P = Record<string, unknown>, IP = P> = NextPage<P, IP> & {
  getLayout?: (page: ReactNode, pageProps: P) => ReactNode;
};

const roboto = localFont({
  src: "../../public/fonts/Roboto-VariableFont_wdth,wght.ttf",
  variable: "--roboto",
  display: "swap",
});

const MyApp: AppType<{ session: Session | null }> = ({
  Component,
  pageProps: { session, ...pageProps },
}) => {
  const getLayout = (Component as NextPageWithLayout).getLayout ?? ((page: ReactNode) => page);

  return (
    <SessionProvider session={session}>
      <div className={roboto.variable}>
        {getLayout(<Component {...pageProps} />, pageProps as Record<string, unknown>)}
      </div>
    </SessionProvider>
  );
};

export default api.withTRPC(MyApp);
