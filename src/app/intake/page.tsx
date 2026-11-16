import type { Metadata } from "next";
import IntakeWorkspace from "./workspace";

export const metadata: Metadata = {
  title: "Invention Intake Copilot | Catch-Up Tutor",
  description:
    "A synthetic, evidence-first demonstration of an AI-assisted invention intake workflow.",
};

export default function IntakePage() {
  return <IntakeWorkspace />;
}
