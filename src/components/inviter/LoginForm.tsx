/**
 * VRChat Login Form
 * Handles username/password login
 */

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, LogIn, Gamepad2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/utils/tailwind";

interface LoginFormProps {
  onLogin: (username: string, password: string) => Promise<void>;
  isLoading?: boolean;
  error?: string | null;
  className?: string;
}

export function LoginForm({ onLogin, isLoading = false, error, className }: LoginFormProps) {
  const { t } = useTranslation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;
    await onLogin(username.trim(), password);
  };

  return (
    <div className={cn("flex min-h-[60vh] items-center justify-center", className)}>
      <div className="w-full max-w-sm space-y-6">
        {/* Header */}
        <div className="flex flex-col items-center space-y-2">
          <div className="bg-primary/10 rounded-full p-3">
            <Gamepad2 className="text-primary h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold">{t("loginTitle")}</h1>
          <p className="text-muted-foreground text-center text-sm">
            {t("loginSubtitle")}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">{t("loginUsername")}</Label>
            <Input
              id="username"
              type="text"
              placeholder={t("loginUsernamePlaceholder")}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isLoading}
              autoComplete="username"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">{t("loginPassword")}</Label>
            <Input
              id="password"
              type="password"
              placeholder={t("loginPasswordPlaceholder")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="bg-destructive/10 text-destructive rounded-md p-3 text-sm">
              {error}
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading || !username.trim() || !password.trim()}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("loginSigningIn")}
              </>
            ) : (
              <>
                <LogIn className="mr-2 h-4 w-4" />
                {t("loginSignIn")}
              </>
            )}
          </Button>
        </form>

        {/* Footer */}
        <p className="text-muted-foreground text-center text-xs">
          {t("loginSecurityNote")}
        </p>
      </div>
    </div>
  );
}
