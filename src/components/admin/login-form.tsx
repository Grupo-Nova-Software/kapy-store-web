"use client";

import { useActionState, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Eye, EyeOff, LoaderCircle, Lock, Mail } from "lucide-react";
import { login, type LoginState } from "@/app/admin/actions";

const field =
  "h-14 w-full rounded-2xl bg-white pr-4 pl-12 text-base ring-1 ring-zinc-200 outline-none transition focus:ring-2 focus:ring-sky-600 dark:bg-zinc-900 dark:ring-zinc-800";

export function LoginForm() {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(login, {
    error: null,
    email: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const forbidden = useSearchParams().get("error") === "sin-permiso";
  const error = state.error ?? (forbidden ? "Tu cuenta no tiene permisos de administrador." : null);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <label className="relative block">
        <span className="sr-only">Email</span>
        <Mail className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-zinc-400" aria-hidden />
        <input
          name="email"
          type="email"
          inputMode="email"
          autoComplete="username"
          required
          placeholder="Email"
          defaultValue={state.email}
          className={field}
        />
      </label>
      <label className="relative block">
        <span className="sr-only">Contraseña</span>
        <Lock className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-zinc-400" aria-hidden />
        <input
          name="password"
          type={showPassword ? "text" : "password"}
          autoComplete="current-password"
          required
          placeholder="Contraseña"
          className={`${field} pr-14`}
        />
        <button
          type="button"
          onClick={() => setShowPassword((v) => !v)}
          aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
          className="absolute top-1/2 right-2 grid size-10 -translate-y-1/2 place-items-center rounded-full text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
        </button>
      </label>

      {error && (
        <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:bg-red-950/50 dark:text-red-300">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 flex h-14 items-center justify-center gap-2 rounded-2xl bg-sky-600 text-base font-bold text-white shadow-lg shadow-sky-600/25 transition hover:bg-sky-700 active:scale-[0.98] disabled:opacity-70"
      >
        {pending && <LoaderCircle className="size-5 animate-spin" aria-hidden />}
        {pending ? "Ingresando…" : "Ingresar"}
      </button>
    </form>
  );
}
