import { AuthShell } from "@/components/marketing/AuthShell";
import { Btn } from "@/components/ui";
import { signOut } from "@/lib/actions/tenant";

export default function AccessErrorPage() {
  return <AuthShell title="Your household isn’t ready yet" subtitle="We couldn’t finish opening your household. Please try again.">
    <div className="flex flex-col gap-5">
      <Btn href="/app" className="w-full justify-center">Try again</Btn>
      <form action={signOut}><button className="text-sm text-(--color-primary-text)" type="submit">Sign out</button></form>
    </div>
  </AuthShell>;
}
