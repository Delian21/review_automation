import type { Metadata } from "next";
import { SignupForm } from "@/components/SignupForm";

export const metadata: Metadata = {
  title: "Create your account",
};

export default function SignupPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <SignupForm />
    </main>
  );
}
