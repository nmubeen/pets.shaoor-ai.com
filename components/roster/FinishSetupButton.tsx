"use client";

import { useRouter } from "next/navigation";
import { Btn } from "@/components/ui";

export function FinishSetupButton() {
  const router = useRouter();
  return (
    <Btn onClick={() => router.push("/app")} className="w-full justify-center mt-6">
      Finish setup →
    </Btn>
  );
}
