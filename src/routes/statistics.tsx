import { createFileRoute } from "@tanstack/react-router";
import { SessionStatsPage } from "@/components/inviter";

function StatisticsPage() {
  return <SessionStatsPage className="h-full" />;
}

export const Route = createFileRoute("/statistics")({
  component: StatisticsPage,
});
