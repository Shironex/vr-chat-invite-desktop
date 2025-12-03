import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RateLimitSettings } from "@/components/inviter";

function SettingsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="h-full overflow-y-auto p-4">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Back Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate({ to: "/" })}
          className="-ml-2"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t("backToDashboard")}
        </Button>

        {/* Settings */}
        <RateLimitSettings />
      </div>
    </div>
  );
}

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});
