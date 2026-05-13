import { zodResolver } from "@hookform/resolvers/zod";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { useEffect, useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { getAuthHeaderLayout } from "~/layouts/AuthHeaderLayout";
import { api } from "~/utils/api";
import type { NextPageWithLayout } from "../_app";

const schema = z
  .object({
    password: z.string().min(1, "Obbligatorio"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Le password non coincidono",
    path: ["confirmPassword"],
  });

type FormData = z.infer<typeof schema>;

const CambioPasswordPage: NextPageWithLayout = function CambioPasswordPage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      void router.replace("/auth/tipo");
    }
    if (status === "authenticated" && !session.user.mustChangePassword) {
      const dest = session.user.role === "TUTOR" ? "/tutor" : "/studente";
      void router.replace(dest);
    }
  }, [status, session, router]);

  const changePassword = api.user.changePassword.useMutation({
    onSuccess: async () => {
      await update({ mustChangePassword: false });
      const dest = session?.user.role === "TUTOR" ? "/tutor" : "/studente";
      await router.push(dest);
    },
    onError: (err) => setSubmitError(err.message),
  });

  const form = useForm<FormData>({ resolver: zodResolver(schema) });

  function onSubmit(data: FormData) {
    setSubmitError(null);
    changePassword.mutate(data);
  }

  if (status === "loading" || status === "unauthenticated") return null;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Imposta la tua password</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          È il tuo primo accesso. Scegli una nuova password.
        </p>
      </div>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-medium text-gray-700 dark:text-gray-200">
            Nuova password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            className="flex h-10 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm dark:text-gray-100 outline-none transition focus:border-[#1e3eb0] focus:ring-2 focus:ring-[#1e3eb0]/20 disabled:opacity-50"
            {...form.register("password")}
          />
          {form.formState.errors.password && (
            <p className="text-xs text-red-600">{form.formState.errors.password.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700 dark:text-gray-200">
            Conferma password
          </label>
          <input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            className="flex h-10 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm dark:text-gray-100 outline-none transition focus:border-[#1e3eb0] focus:ring-2 focus:ring-[#1e3eb0]/20 disabled:opacity-50"
            {...form.register("confirmPassword")}
          />
          {form.formState.errors.confirmPassword && (
            <p className="text-xs text-red-600">
              {form.formState.errors.confirmPassword.message}
            </p>
          )}
        </div>
        {submitError && <p className="text-sm text-red-600">{submitError}</p>}
        <button
          type="submit"
          disabled={changePassword.isPending}
          className="flex h-10 w-full items-center justify-center rounded-lg bg-[#1e3eb0] text-sm font-semibold text-white transition hover:bg-[#162e8a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e3eb0] disabled:opacity-50"
        >
          {changePassword.isPending ? "Salvataggio..." : "Salva password"}
        </button>
      </form>
    </div>
  );
};

CambioPasswordPage.getLayout = (page: ReactNode) => getAuthHeaderLayout(page);

export default CambioPasswordPage;
