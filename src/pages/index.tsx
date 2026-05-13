import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { useEffect } from "react";

import { getAuthLayout } from "~/layouts/AuthLayout";
import type { NextPageWithLayout } from "./_app";

const Home: NextPageWithLayout = function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status !== "authenticated") return;
    if (session.user.mustChangePassword) {
      void router.replace("/auth/cambio-password");
    } else if (session.user.role === "TUTOR") {
      void router.replace("/tutor");
    } else {
      void router.replace("/studente");
    }
  }, [status, session, router]);

  if (status === "authenticated") return null;

  return (
    <div className="flex flex-1 flex-col items-center justify-between w-full px-6 py-8">
      {/* Spacer — logo already at top from layout */}
      <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
        <h1 className="text-3xl font-bold text-white leading-tight">
          Benvenuto
        </h1>
        <p className="text-white/70 text-sm max-w-xs leading-relaxed">
          Accedi per gestire eventi, task e comunicazioni della tua struttura.
        </p>
      </div>

      {/* CTA */}
      <div className="w-full max-w-xs">
        <button
          onClick={() => void router.push("/auth/tipo")}
          className="w-full rounded-xl bg-white py-4 text-sm font-semibold text-[#0081C6] shadow-lg transition active:scale-95 hover:bg-white/95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
        >
          Accedi all&apos;account
        </button>
      </div>
    </div>
  );
};

Home.getLayout = (page) => getAuthLayout(page);

export default Home;
