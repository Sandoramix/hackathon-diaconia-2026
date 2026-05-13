import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { useRouter } from "next/router";
import { useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { getAuthHeaderLayout } from "~/layouts/AuthHeaderLayout";
import type { NextPageWithLayout } from "../_app";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import {UserIconBtn} from "~/components/icons/UserIconBtn";
import {TutorIconBtn} from "~/components/icons/TutorIconBtn";
import {Button} from "~/components/ui/button";

const schema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
  role: z.enum(["studente", "tutor"]),
});

type FormData = z.infer<typeof schema>;

const AccediPage: NextPageWithLayout = function AccediPage() {
  const router = useRouter();
  const tipo = (router.query.tipo as string) ?? "studente";
  const [error, setError] = useState<string | null>(null);
  const [showPw, setShowPw] = useState(false);

  const form = useForm<FormData>({ resolver: zodResolver(schema), defaultValues: { role: tipo?.toLowerCase()?.trim() === "studente" ? "studente" : "tutor" } });

  async function onSubmit(data: FormData) {
    setError(null);
    const result = await signIn("credentials", {
      username: data.username?.trim()?.toLowerCase(),
      password: data.password,
      redirect: false,
      role: data.role,
    });

    if (result?.error) {
      setError("Credenziali non valide");
      return;
    }

    // Re-fetch session to get role + mustChangePassword
    const res = await fetch("/api/auth/session");
    const session = (await res.json()) as {
      user?: { role?: string; mustChangePassword?: boolean };
    };

    if (session.user?.mustChangePassword) {
      await router.push("/auth/cambio-password");
    } else if (session.user?.role === "TUTOR") {
      await router.push("/tutor");
    } else {
      await router.push("/studente");
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1 grid grid-cols-5">
        <div></div>
        <div className={`flex flex-col items-center justify-center col-span-3`}>
          {
            tipo === "studente"
              ? <UserIconBtn hideLabel/>
              : <TutorIconBtn hideLabel/>
          }

          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100 text-center">
            Accedi all&apos;account
          </h1>
        </div>
      </div>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="username" className="text-sm font-medium text-gray-700 dark:text-gray-200">
            Username*
          </label>
          <input
            id="username"
            type="username"
            autoComplete="username"
            className="flex h-10 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm dark:text-gray-100 outline-none transition focus:border-[#1e3eb0] focus:ring-2 focus:ring-[#1e3eb0]/20 disabled:opacity-50"
            {...form.register("username")}
          />
          {form.formState.errors.username && (
            <p className="text-xs text-red-600">Campo obbligatorio</p>
          )}
        </div>
        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-medium text-gray-700 dark:text-gray-200">
            Password*
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPw ? "text" : "password"}
              autoComplete="current-password"
              className="flex h-10 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 pr-10 text-sm dark:text-gray-100 outline-none transition focus:border-[#1e3eb0] focus:ring-2 focus:ring-[#1e3eb0]/20 disabled:opacity-50"
              {...form.register("password")}
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPw((s) => !s)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {form.formState.errors.password && (
            <p className="text-xs text-red-600">Campo obbligatorio</p>
          )}
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={form.formState.isSubmitting}
          className="flex h-14 w-full items-center justify-center rounded-lg bg-azure text-sm font-semibold text-white transition hover:bg-azure-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure disabled:opacity-50"
        >
          {form.formState.isSubmitting ? "Caricamento..." : "Continua"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="flex h-14 w-full items-center justify-center rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-600 dark:text-gray-200 transition hover:bg-gray-50 dark:hover:bg-gray-700 focus-visible:outline-none"
        >
          Indietro
        </button>
      </form>
    </div>
  );
};

AccediPage.getLayout = (page: ReactNode) => getAuthHeaderLayout(page);

export default AccediPage;
