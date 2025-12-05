import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useEffect } from "react";

function SettingsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Redirect to home - settings are now in the navbar modal
  useEffect(() => {
    navigate({ to: "/" });
  }, [navigate]);

  return (
    <div className="flex h-full items-center justify-center">
      <p className="text-muted-foreground">{t("loading")}</p>
    </div>
  );
}

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});
