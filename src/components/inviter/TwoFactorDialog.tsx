/**
 * Two-Factor Authentication Dialog
 * Handles TOTP and Email OTP verification
 */

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, Mail, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface TwoFactorDialogProps {
  open: boolean;
  methods: string[];
  onVerify: (method: "totp" | "emailotp" | "otp", code: string) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  error?: string | null;
}

export function TwoFactorDialog({
  open,
  methods,
  onVerify,
  onCancel,
  isLoading = false,
  error,
}: TwoFactorDialogProps) {
  const { t } = useTranslation();
  const [code, setCode] = useState("");
  // Auto-select 2FA method: TOTP (authenticator) has priority over email
  const selectedMethod = (() => {
    const methodsLower = methods.map((m) => m.toLowerCase());
    if (methodsLower.includes("totp")) return "totp" as const;
    if (methodsLower.includes("emailotp")) return "emailotp" as const;
    return "otp" as const;
  })();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || code.length < 6) return;
    await onVerify(selectedMethod, code.trim());
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {selectedMethod === "totp" ? (
              <Smartphone className="h-5 w-5" />
            ) : (
              <Mail className="h-5 w-5" />
            )}
            {t("twoFactorTitle")}
          </DialogTitle>
          <DialogDescription>
            {t("twoFactorDescription")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Method Info */}
          <div className="bg-muted/50 rounded-md p-3 text-sm">
            {selectedMethod === "totp" ? (
              <p>{t("twoFactorAppHint")}</p>
            ) : (
              <p>{t("twoFactorEmailHint")}</p>
            )}
          </div>

          {/* Code Input */}
          <div className="space-y-2">
            <Label htmlFor="code">{t("twoFactorCode")}</Label>
            <Input
              id="code"
              type="text"
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              disabled={isLoading}
              className="text-center text-2xl tracking-[0.5em]"
              maxLength={6}
              autoComplete="one-time-code"
              autoFocus
            />
          </div>

          {error && (
            <div className="bg-destructive/10 text-destructive rounded-md p-3 text-sm">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onCancel} disabled={isLoading}>
              {t("cancel")}
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={isLoading || code.length < 6}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("twoFactorVerifying")}
                </>
              ) : (
                t("twoFactorVerify")
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
