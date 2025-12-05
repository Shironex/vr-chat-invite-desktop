import { createFileRoute } from "@tanstack/react-router";
import { InstanceMonitorDashboard } from "@/components/instance-monitor";

function InstanceMonitorPage() {
  return <InstanceMonitorDashboard className="h-full" />;
}

export const Route = createFileRoute("/instance-monitor")({
  component: InstanceMonitorPage,
});
