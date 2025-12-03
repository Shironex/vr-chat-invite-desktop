import { createFileRoute } from "@tanstack/react-router";
import { InviteHistoryPage } from "@/components/inviter";

function HistoryPage() {
  return <InviteHistoryPage className="h-full" />;
}

export const Route = createFileRoute("/history")({
  component: HistoryPage,
});
