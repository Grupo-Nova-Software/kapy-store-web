import { Suspense } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import { LoginForm } from "@/components/admin/login-form";

export const metadata: Metadata = { title: "Ingresar" };

export default function LoginPage() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-5 py-10">
      <div className="mb-8 flex flex-col items-center text-center">
        <Image src="/branding/logo.png" alt="" width={88} height={88} priority />
        <h1 className="mt-4 text-2xl font-black tracking-tight uppercase">
          Kapy <span className="text-sky-600">Admin</span>
        </h1>
        <p className="mt-1 text-sm text-zinc-500">Gestioná productos y stock desde tu celular.</p>
      </div>
      {/* useSearchParams (error banner) needs a boundary under Cache Components. */}
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
