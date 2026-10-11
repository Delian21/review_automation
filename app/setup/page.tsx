import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Nav } from "@/components/Nav";
import { SetupForm } from "@/components/SetupForm";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Set up your business",
};

export default async function SetupPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Middleware already guards this; this is a defence-in-depth re-check.
  if (!user) {
    redirect("/login");
  }

  const { data: business } = await supabase
    .from("businesses")
    .select("name, google_review_link, message_template")
    .eq("owner_id", user.id)
    .maybeSingle();

  return (
    <>
      <Nav />
      <main className="flex min-h-screen items-start justify-center px-4 py-12">
        <SetupForm
          ownerId={user.id}
          initial={
            business
              ? {
                  name: business.name,
                  googleReviewLink: business.google_review_link,
                  messageTemplate: business.message_template,
                }
              : null
          }
        />
      </main>
    </>
  );
}
