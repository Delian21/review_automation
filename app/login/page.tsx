import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/LoginForm";

export const metadata: Metadata = {
  title: "Log in",
};

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      {/* useSearchParams requires a Suspense boundary during static build. */}
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
