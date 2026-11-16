import type { Metadata } from "next";
import IntakeWorkspace from "./workspace";

export const metadata: Metadata = {
  title: "IP Intake & Technical Brief Copilot",
  description:
    "An evidence-first AI workflow that turns one fictional invention disclosure into an intake draft and a technical briefing.",
};

export default function IntakePage() {
  return <IntakeWorkspace />;
}
