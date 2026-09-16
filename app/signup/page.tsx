import { Suspense } from "react";
import { EmailOtpForm } from "@/components/auth/EmailOtpForm";
export default function Page() {
  return <Suspense fallback={null}><EmailOtpForm /></Suspense>;
}
