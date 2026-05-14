import { zodResolver } from "@hookform/resolvers/zod";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/router";
import { useEffect, useState, type ReactNode } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { getAuthHeaderLayout } from "~/layouts/AuthHeaderLayout";
import { api } from "~/utils/api";
import type { NextPageWithLayout } from "../_app";
import { cn } from "~/lib/utils";

const passwordSchema = z
  .string()
  .min(8, "Minimo 8 caratteri")
  .regex(/[0-9]/, "Almeno un numero")
  .regex(/[^A-Za-z0-9]/, "Almeno un carattere speciale");

const schema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Le password non coincidono",
    path: ["confirmPassword"],
  });

type FormData = z.infer<typeof schema>;

const RULES: { label: string; test: (v: string) => boolean }[] = [
  { label: "Almeno 8 caratteri", test: (v) => v.length >= 8 },
  { label: "Almeno un numero",   test: (v) => /[0-9]/.test(v) },
  { label: "Almeno un carattere speciale (!@#$…)", test: (v) => /[^A-Za-z0-9]/.test(v) },
];

function PasswordStrengthIndicator({ password }: { password: string }) {
  const met = RULES.filter((r) => r.test(password)).length;
  const colors = ["bg-red-400", "bg-orange-400", "bg-yellow-400", "bg-green-500"];
  const barColor = password.length === 0 ? "bg-gray-200 dark:bg-gray-700" : colors[met] ?? "bg-green-500";

  return (
    <div className="space-y-2">
      {/* Strength bar */}
      <div className="flex gap-1">
        {RULES.map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full transition-all duration-300",
              password.length === 0
                ? "bg-gray-200 dark:bg-gray-700"
                : i < met
                ? barColor
                : "bg-gray-200 dark:bg-gray-700",
            )}
          />
        ))}
      </div>

      {/* Rule checklist */}
      <ul className="space-y-1">
        {RULES.map((rule) => {
          const ok = password.length > 0 && rule.test(password);
          const touched = password.length > 0;
          return (
            <li
              key={rule.label}
              className={cn(
                "flex items-center gap-2 text-xs transition-colors duration-200",
                ok
                  ? "text-green-600 dark:text-green-400"
                  : touched
                  ? "text-red-500 dark:text-red-400"
                  : "text-gray-400 dark:text-gray-500",
              )}
            >
              <span
                className={cn(
                  "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold transition-all duration-200",
                  ok
                    ? "border-green-500 bg-green-500 text-white scale-110"
                    : touched
                    ? "border-red-400 text-red-400"
                    : "border-gray-300 dark:border-gray-600",
                )}
              >
                {ok ? "✓" : "·"}
              </span>
              {rule.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

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
  const password = useWatch({ control: form.control, name: "password", defaultValue: "" });
  const confirmPassword = useWatch({ control: form.control, name: "confirmPassword", defaultValue: "" });
  const allRulesMet = RULES.every((r) => r.test(password ?? ""));
  const confirmMatches = confirmPassword.length > 0 && password === confirmPassword;

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
            className={cn(
              "flex h-10 w-full rounded-lg border bg-white dark:bg-gray-800 px-3 py-2 text-sm dark:text-gray-100 outline-none transition focus:ring-2 disabled:opacity-50",
              allRulesMet
                ? "border-green-500 focus:border-green-500 focus:ring-green-500/20"
                : "border-gray-300 dark:border-gray-600 focus:border-[#1e3eb0] focus:ring-[#1e3eb0]/20",
            )}
            {...form.register("password")}
          />
          <PasswordStrengthIndicator password={password ?? ""} />
        </div>

        <div className="space-y-2">
          <label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700 dark:text-gray-200">
            Conferma password
          </label>
          <input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            className={cn(
              "flex h-10 w-full rounded-lg border bg-white dark:bg-gray-800 px-3 py-2 text-sm dark:text-gray-100 outline-none transition focus:ring-2 disabled:opacity-50",
              confirmPassword.length === 0
                ? "border-gray-300 dark:border-gray-600 focus:border-[#1e3eb0] focus:ring-[#1e3eb0]/20"
                : confirmMatches
                ? "border-green-500 focus:border-green-500 focus:ring-green-500/20"
                : "border-red-400 focus:border-red-400 focus:ring-red-400/20",
            )}
            {...form.register("confirmPassword")}
          />
          {confirmPassword.length > 0 && (
            <p className={cn("text-xs transition-colors duration-200",
              confirmMatches ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400")}>
              {confirmMatches ? "✓ Le password coincidono" : "Le password non coincidono"}
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
      <button
        type="button"
        onClick={() => void signOut({ callbackUrl: "/auth/tipo" })}
        className="mt-2 w-full text-center text-sm text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
      >
        Esci dall'account
      </button>
    </div>
  );
};

CambioPasswordPage.getLayout = (page: ReactNode) => getAuthHeaderLayout(page);

export default CambioPasswordPage;
