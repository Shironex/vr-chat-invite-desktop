import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2 } from "lucide-react";

function WelcomePage() {
  const { t } = useTranslation();

  const features = [
    {
      key: "react",
      icon: <CheckCircle2 className="h-5 w-5 text-green-500" />,
      title: t("featureReact"),
    },
    {
      key: "typescript",
      icon: <CheckCircle2 className="h-5 w-5 text-green-500" />,
      title: t("featureTypeScript"),
    },
    {
      key: "shadcn",
      icon: <CheckCircle2 className="h-5 w-5 text-green-500" />,
      title: t("featureShadcn"),
    },
    {
      key: "i18n",
      icon: <CheckCircle2 className="h-5 w-5 text-green-500" />,
      title: t("featureI18n"),
    },
    {
      key: "router",
      icon: <CheckCircle2 className="h-5 w-5 text-green-500" />,
      title: t("featureRouter"),
    },
    {
      key: "theme",
      icon: <CheckCircle2 className="h-5 w-5 text-green-500" />,
      title: t("featureTheme"),
    },
    {
      key: "debug",
      icon: <CheckCircle2 className="h-5 w-5 text-green-500" />,
      title: t("featureDebug"),
    },
    {
      key: "autoupdate",
      icon: <CheckCircle2 className="h-5 w-5 text-green-500" />,
      title: t("featureAutoUpdate"),
    },
    {
      key: "tests",
      icon: <CheckCircle2 className="h-5 w-5 text-green-500" />,
      title: t("featureTests"),
    },
  ];

  return (
    <div className="h-full overflow-y-auto">
      <div className="container mx-auto p-8 max-w-5xl pb-16">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4">{t("welcomeTitle")}</h1>
          <p className="text-xl text-muted-foreground mb-6">{t("welcomeSubtitle")}</p>
          <Badge variant="outline" className="text-sm">
            v{import.meta.env.VITE_APP_VERSION || "0.1.0"}
          </Badge>
        </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>{t("welcomeFeatures")}</CardTitle>
          <CardDescription>
            {t("featuresDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((feature) => (
              <div
                key={feature.key}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors"
              >
                {feature.icon}
                <span className="text-sm font-medium">{feature.title}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("welcomeGetStarted")}</CardTitle>
          <CardDescription>{t("getStartedDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">{t("step1Title")}</h3>
            <p className="text-sm text-muted-foreground">
              {t("step1Description")}
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-2">{t("step2Title")}</h3>
            <p className="text-sm text-muted-foreground">
              {t("step2Description")}
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-2">{t("step3Title")}</h3>
            <p className="text-sm text-muted-foreground">
              {t("step3Description")}
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-2">{t("step4Title")}</h3>
            <p className="text-sm text-muted-foreground">
              {t("step4Description")}
            </p>
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/")({
  component: WelcomePage,
});
