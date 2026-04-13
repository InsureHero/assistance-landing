"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { sendOtp, verifyOtp } from "@/services/otp.service";

/** Acepta formatos estándar y corporativos: @gmail.com, @trade.ec, @mail.co, @sub.dominio.ec, @interno */
function isValidEmail(value: string): boolean {
  const t = String(value ?? "").trim();
  if (t.length < 5) return false;
  const at = t.indexOf("@");
  if (at <= 0 || at === t.length - 1) return false;
  const afterAt = t.slice(at + 1);
  if (afterAt.length < 2) return false;
  if (!afterAt.includes(".")) return afterAt.length >= 2; // ej. @host o @interno
  const lastDot = afterAt.lastIndexOf(".");
  const tld = afterAt.slice(lastDot + 1);
  return tld.length >= 2; // .ec, .co, .uk, .com, etc.
}

interface OtpVerificationProps {
  email: string;
  setEmail: (email: string) => void;
  onNext: () => void;
}

export const OtpVerification = ({ email, setEmail, onNext }: OtpVerificationProps) => {
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [otpAttempts, setOtpAttempts] = useState(0);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const { t } = useLanguage();

  const OTP_MAX_ATTEMPTS = 3;
  const maxAttemptsReached = otpAttempts >= OTP_MAX_ATTEMPTS;

  const emailTrimmed = String(email ?? "").trim();
  const emailValid = isValidEmail(emailTrimmed);
  const sendButtonDisabled = !emailValid || sendingOtp;
  const verifyButtonDisabled = verifying || isRateLimited || otp.replace(/\D/g, "").length !== 6;

  const handleOtpSendError = (error: unknown) => {
    if (error instanceof Error && error.message === "OTP_INVALID_EMAIL") {
      // Mostrar mensaje de correo incorrecto según idioma (ES/EN).
      toast.error(t.otp.invalidEmail);
    } else {
      toast.error(t.otp.errorSendingCode);
    }
  };

  const performSendOtp = async (isResend: boolean) => {
    if (!emailValid) {
      toast.error(t.otp.invalidEmail);
      return;
    }
    setSendingOtp(true);
    try {
      await sendOtp(email.trim().toLowerCase());
      if (!isResend) {
        setOtpSent(true);
      }
      toast.success(t.otp.codeSent);
    } catch (error) {
      handleOtpSendError(error);
    } finally {
      setSendingOtp(false);
    }
  };

  const handleSendOtp = () => performSendOtp(false);

  const handleResendOtp = async () => {
    await performSendOtp(true);
    setOtpAttempts(0);
    setIsRateLimited(false);
    setOtp("");
  };

  const handleVerifyOtp = async () => {
    const digits = otp.replace(/\D/g, "").slice(0, 6);
    if (digits.length !== 6) {
      toast.error(t.otp.invalidCode);
      return;
    }
    setVerifying(true);
    try {
      const result = await verifyOtp(email.trim().toLowerCase(), digits);
      if (result.success) {
        toast.success(t.otp.verified);
        onNext();
      } else {
        const errorMessage = "errorMessage" in result ? result.errorMessage : "";
        if (errorMessage === "OTP_RATE_LIMITED") {
          setIsRateLimited(true);
          toast.error(t.otp.rateLimited);
        } else {
          const newAttempts = otpAttempts + 1;
          setOtpAttempts(newAttempts);
          if (newAttempts < OTP_MAX_ATTEMPTS) {
            toast.error(t.otp.errorVerifyingCode);
          }
        }
      }
    } catch {
      toast.error(t.otp.errorVerifyingCode);
    } finally {
      setVerifying(false);
    }
  };

  return (
    <Card className="shadow-elegant border-0">
      <CardHeader className="text-center pb-4">
        <div className="w-16 h-16 rounded-full gradient-ocean flex items-center justify-center mx-auto mb-4">
          <Mail className="w-8 h-8 text-primary-foreground" />
        </div>
        <CardTitle className="text-2xl font-serif">{t.otp.title}</CardTitle>
        <CardDescription className="text-base">{t.otp.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="email">{t.otp.emailLabel}</Label>
          <Input
            id="email"
            type="email"
            placeholder={t.otp.emailPlaceholder}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={otpSent}
            className="h-12"
            autoComplete="email"
          />
        </div>

        {!otpSent ? (
          <Button
            onClick={handleSendOtp}
            disabled={sendButtonDisabled}
            className="w-full h-12 text-base font-medium gradient-ocean hover:opacity-90 disabled:opacity-50"
          >
            {sendingOtp ? (
              <>
                {t.otp.sendingCode}
                <Loader2 className="ml-2 w-5 h-5 animate-spin" />
              </>
            ) : (
              <>
                {t.otp.sendCode}
                <ArrowRight className="ml-2 w-5 h-5" />
              </>
            )}
          </Button>
        ) : (
          <>
            {maxAttemptsReached ? (
              <div className="space-y-3">
                <p className="text-sm text-destructive text-center font-medium">{t.otp.maxAttemptsReached}</p>
                <Button
                  onClick={handleResendOtp}
                  disabled={sendingOtp || isRateLimited}
                  className="w-full h-12 text-base font-medium gradient-ocean hover:opacity-90 disabled:opacity-50 disabled:pointer-events-none"
                >
                  {sendingOtp ? (
                    <>
                      {t.otp.sendingCode}
                      <Loader2 className="ml-2 w-5 h-5 animate-spin" />
                    </>
                  ) : (
                    t.otp.requestNewCode
                  )}
                </Button>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="otp">{t.otp.verificationCode}</Label>
                  <Input
                    id="otp"
                    type="text"
                    placeholder={t.otp.codePlaceholder}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    maxLength={6}
                    disabled={isRateLimited}
                    className="h-12 text-center text-xl tracking-widest font-semibold"
                  />
                  <p className="text-sm text-muted-foreground text-center">{t.otp.checkEmail}</p>
                </div>
                <div className="space-y-3">
                  <Button
                    onClick={handleVerifyOtp}
                    disabled={verifyButtonDisabled}
                    className="w-full h-12 text-base font-medium gradient-ocean hover:opacity-90 disabled:opacity-50 disabled:pointer-events-none"
                  >
                    {verifying ? (
                      <>
                        {t.otp.sendingCode}
                        <Loader2 className="ml-2 w-5 h-5 animate-spin" />
                      </>
                    ) : (
                      <>
                        {t.otp.verifyAndContinue}
                        <ArrowRight className="ml-2 w-5 h-5" />
                      </>
                    )}
                  </Button>
                  <Button variant="ghost" onClick={handleResendOtp} disabled={sendingOtp || isRateLimited} className="w-full">
                    {sendingOtp ? (
                      <>
                        <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                        {t.otp.sendingCode}
                      </>
                    ) : (
                      t.otp.resendCode
                    )}
                  </Button>
                </div>
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};
