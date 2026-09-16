import { AuthShell } from "@/components/marketing/AuthShell";
import { Btn } from "@/components/ui";
import { signOut } from "@/lib/actions/tenant";

// Deliberately ungated so denied or signed-out users can recover.
export default async function AuthErrorPage({ searchParams }: { searchParams: Promise<{ reason?: string }> }) {
  const { reason } = await searchParams;
  const message = reason?.startsWith("membership-")
    ? "Your account does not currently have access to Shaoor-AI Pets."
    : "We could not finish signing you in. Please try again shortly.";
  return <AuthShell title="Unable to continue" subtitle="We ran into a problem finishing sign-in.">
    <div className="flex flex-col gap-5">
      <p role="alert" className="text-sm text-coral">{message}</p>
      <Btn href="/login" className="w-full justify-center">Back to sign-in</Btn>
      <form action={signOut}><button className="text-sm text-(--color-primary-text)" type="submit">Sign out</button></form>
    </div>
  </AuthShell>;
}
