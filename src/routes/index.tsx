import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { InviterDashboard } from "@/components/inviter";

function HomePage() {
  const navigate = useNavigate();

  return (
    <InviterDashboard
      onOpenSettings={() => navigate({ to: "/settings" })}
      className="h-full"
    />
  );
}

export const Route = createFileRoute("/")({
  component: HomePage,
});
