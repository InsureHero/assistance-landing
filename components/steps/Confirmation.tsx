"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardList, ArrowLeft, CheckCircle, Phone, Mail, Shield, PartyPopper } from "lucide-react";
import { toast } from "sonner";
import type { Traveler } from "../BookingFlow";
import { useLanguage } from "@/contexts/LanguageContext";

interface ConfirmationProps {
  travelers: Traveler[];
  onBack: () => void;
  onSubmit: () => void;
}

export const Confirmation = ({ travelers, onBack, onSubmit }: ConfirmationProps) => {
  const [submitted, setSubmitted] = useState(false);
  const { t } = useLanguage();

  const handleSubmit = () => {
    onSubmit();
    toast.success(t.confirmation.submitted);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <Card className="shadow-elegant border-0">
        <CardHeader className="text-center pb-4">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center mx-auto mb-4 animate-fade-in">
            <CheckCircle className="w-14 h-14 text-white" />
          </div>
          <CardTitle className="text-3xl font-serif text-foreground">{t.confirmation.successTitle}</CardTitle>
          <p className="text-muted-foreground text-xl mt-2 flex items-center justify-center gap-2">
            <PartyPopper className="w-5 h-5" />
            {t.confirmation.enjoyTrip}
            <PartyPopper className="w-5 h-5" />
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="p-6 rounded-lg gradient-sky text-center">
            <h3 className="text-lg font-semibold mb-2">{t.confirmation.allSet}</h3>
            <p className="text-sm text-muted-foreground">{t.confirmation.allSetDescription}</p>
          </div>

          <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
            <h4 className="font-semibold mb-3 text-center">{t.confirmation.questionsTitle}</h4>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Phone className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">{t.confirmation.vidanta}</p>
                  <p className="text-sm text-muted-foreground">+1 (800) 555-VIDA</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Phone className="w-5 h-5 text-primary" />
                </div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold">{t.confirmation.mawdyHotline}</p>
                </div>
                  <p className="text-sm text-muted-foreground">+1 (800) 555-HELP</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-elegant border-0">
      <CardHeader className="text-center pb-4">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto mb-4">
          <ClipboardList className="w-10 h-10 text-white" />
        </div>
        <CardTitle className="text-3xl font-serif text-foreground">{t.confirmation.reviewTitle}</CardTitle>
        <p className="text-muted-foreground text-lg mt-2">{t.confirmation.reviewSubtitle}</p>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="p-6 rounded-lg gradient-sky text-center">
          <h3 className="text-xl font-semibold mb-2">{t.confirmation.planTitle}</h3>
          <p className="text-sm text-muted-foreground">{t.confirmation.coverage}</p>
        </div>

        <div>
          <h3 className="font-semibold text-lg mb-3">{t.confirmation.registeredTravelers}</h3>
          <div className="space-y-2">
            {travelers.map((traveler, index) => (
              <div key={index} className="flex items-center justify-between p-4 rounded-lg bg-secondary">
                <div>
                  <p className="font-semibold">{[traveler.name, traveler.lastname].filter(Boolean).join(" ") || "—"}</p>
                  <p className="text-sm text-muted-foreground">
                    {(traveler.documentCountry || traveler.nationality) || "—"} • {t.confirmation.dob}: {traveler.dateOfBirth || "—"}
                  </p>
                </div>
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-primary" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
          <h4 className="font-semibold mb-2">
            {t.confirmation.importantInfo}
          </h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <Shield className="w-4 h-4 mt-0.5 shrink-0 text-primary/70" />
              {t.confirmation.infoAssistance}
            </li>
            <li className="flex items-start gap-2">
              <Mail className="w-4 h-4 mt-0.5 shrink-0 text-primary/70" />
              {t.confirmation.infoDocs}
            </li>
            <li className="flex items-start gap-2">
              <Phone className="w-4 h-4 mt-0.5 shrink-0 text-primary/70" />
              {t.confirmation.infoContact} <span className="font-semibold text-foreground">+1 (800) 555-VIDA</span>
            </li>
          </ul>
        </div>

        <p className="text-xs text-muted-foreground text-center px-4">{t.confirmation.disclaimer}</p>

        <div className="flex gap-3">
          <Button variant="outline" onClick={onBack} className="flex-1 h-12 text-base font-medium">
            <ArrowLeft className="mr-2 w-5 h-5" />
            {t.confirmation.back}
          </Button>
          <Button className="flex-1 h-12 text-base font-medium gradient-ocean hover:opacity-90" onClick={handleSubmit}>
            <CheckCircle className="mr-2 w-5 h-5" />
            {t.confirmation.submit}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
