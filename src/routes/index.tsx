import { createFileRoute } from "@tanstack/react-router";
import { InviterDashboard } from "@/components/inviter";

function HomePage() {
  return <InviterDashboard className="h-full" />;
}

export const Route = createFileRoute("/")({
  component: HomePage,
});
