import type { Metadata } from "next";
import { Onboarding } from "@/components/dashboard/Onboarding";

export const metadata: Metadata = { title: "مرحبًا بك", robots: { index: false } };

export default function WelcomePage() {
  return <Onboarding />;
}
