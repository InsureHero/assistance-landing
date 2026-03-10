"use client";

import { useState, useEffect, useCallback } from "react";
import { OtpVerification } from "./steps/OtpVerification";
import { TripSummary } from "./steps/TripSummary";
import { AddTravelers } from "./steps/AddTravelers";
import { Confirmation } from "./steps/Confirmation";
import { ProgressIndicator } from "./ProgressIndicator";
import Image from "next/image";
import { LanguageProvider, useLanguage } from "@/contexts/LanguageContext";
import type { RiskItem } from "@/services/risk_item.service";
import {
  getStoredAccessToken,
  isTokenExpired,
  clearSessionAndNotify,
  invalidateSessionQuietly,
  SESSION_EXPIRED_EVENT,
  BOOKING_STORAGE_KEYS,
} from "@/services/auth.service";

export type Traveler = {
  name: string;
  lastname: string;
  email: string;
  isHolder: boolean;
  isTraveler: boolean;
  dateOfBirth: string;
  fiscalType: string;
  fiscalId: string;
  documentCountry: string;
  mobilePrefix: string;
  phone: string;
  source?: string;
  added_at?: string;
  insuredId?: string;
  /** Campos adicionales del backend que no editamos; se reenvían sin modificar. */
  _passthrough?: Record<string, unknown>;
  passportNumber?: string;
  nationality?: string;
  existingFromRiskItem?: boolean;
};

const LanguageToggle = () => {
  const { language, setLanguage } = useLanguage();
  return (
    <div className="flex items-center gap-1 bg-secondary rounded-full p-1">
      <button
        onClick={() => setLanguage("en")}
        className={`px-3 py-1 rounded-full text-sm font-medium transition-smooth ${
          language === "en"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        EN
      </button>
      <button
        onClick={() => setLanguage("es")}
        className={`px-3 py-1 rounded-full text-sm font-medium transition-smooth ${
          language === "es"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        ES
      </button>
    </div>
  );
};

const BookingFlowInner = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [email, setEmail] = useState("");
  const [selectedRiskItem, setSelectedRiskItem] = useState<RiskItem | null>(null);
  const [travelers, setTravelers] = useState<Traveler[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const { t } = useLanguage();

  const totalSteps = 4;

  const handleNextStep = useCallback(() => {
    setCurrentStep((prev) => Math.min(prev + 1, totalSteps));
  }, []);

  const handlePreviousStep = useCallback(() => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  }, []);

  const handleNoPlans = useCallback(() => {
    invalidateSessionQuietly();
    setCurrentStep(1);
    setEmail("");
    setSelectedRiskItem(null);
    setTravelers([]);
  }, []);

  // Restaurar paso y datos si hay token OTP válido
  useEffect(() => {
    if (typeof window === "undefined") return;
    const token = getStoredAccessToken();
    if (!token || isTokenExpired(token)) {
      setCurrentStep(1);
      setEmail("");
      setSelectedRiskItem(null);
      setTravelers([]);
      setHydrated(true);
      return;
    }
    const stepRaw = sessionStorage.getItem(BOOKING_STORAGE_KEYS.step);
    const step = stepRaw ? Math.min(Math.max(1, parseInt(stepRaw, 10)), 4) : 1;
    const savedEmail = sessionStorage.getItem(BOOKING_STORAGE_KEYS.email) ?? "";
    const riskItemJson = sessionStorage.getItem(BOOKING_STORAGE_KEYS.riskItem);
    const travelersJson = sessionStorage.getItem(BOOKING_STORAGE_KEYS.travelers);

    if (step >= 2 && savedEmail.trim()) {
      setEmail(savedEmail);
      setCurrentStep(step);
      if (step >= 3 && riskItemJson) {
        try {
          const item = JSON.parse(riskItemJson) as RiskItem;
          setSelectedRiskItem(item);
        } catch {
          // ignore
        }
      }
      if (step >= 4 && travelersJson) {
        try {
          const list = JSON.parse(travelersJson) as Traveler[];
          if (Array.isArray(list)) setTravelers(list);
        } catch {
          // ignore
        }
      }
    }
    setHydrated(true);
  }, []);

  // Persistir paso y datos cuando cambien (solo en cliente, tras hidratación)
  useEffect(() => {
    if (!hydrated || typeof sessionStorage === "undefined") return;
    sessionStorage.setItem(BOOKING_STORAGE_KEYS.step, String(currentStep));
    sessionStorage.setItem(BOOKING_STORAGE_KEYS.email, email);
    sessionStorage.setItem(
      BOOKING_STORAGE_KEYS.riskItem,
      selectedRiskItem ? JSON.stringify(selectedRiskItem) : ""
    );
    sessionStorage.setItem(BOOKING_STORAGE_KEYS.travelers, JSON.stringify(travelers));
  }, [hydrated, currentStep, email, selectedRiskItem, travelers]);

  // Escuchar sesión expirada (401 o token vencido) para volver al paso 1
  useEffect(() => {
    const handleSessionExpired = () => {
      setCurrentStep(1);
      setEmail("");
      setSelectedRiskItem(null);
      setTravelers([]);
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
  }, []);

  if (!hydrated) {
    return (
      <div className="min-h-screen gradient-sky flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-sky">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header: idioma en su propia fila arriba del logo para no superponerse en móvil */}
          <div className="text-center mb-8 animate-fade-in">
            <div className="flex justify-end mb-3">
              <LanguageToggle />
            </div>
            <Image src="/assets/vidanta-logo.png" alt="Vidanta" width={200} height={72} className="h-14 md:h-18 mx-auto mb-2" priority />
            <p className="text-muted-foreground text-lg">
              {t.header.subtitle}
            </p>
          </div>

          {/* Progress Indicator */}
          <ProgressIndicator currentStep={currentStep} totalSteps={totalSteps} />

          {/* Step Content */}
          <div className="mt-8 animate-slide-up">
            {currentStep === 1 && (
              <OtpVerification
                email={email}
                setEmail={setEmail}
                onNext={handleNextStep}
              />
            )}
            {currentStep === 2 && (
              <TripSummary
                email={email}
                onNext={(riskItem) => {
                  setSelectedRiskItem(riskItem);
                  handleNextStep();
                }}
                onBack={handlePreviousStep}
                onNoPlans={handleNoPlans}
              />
            )}
            {currentStep === 3 && (
              <AddTravelers
                riskItem={selectedRiskItem}
                travelers={travelers}
                setTravelers={setTravelers}
                onNext={() => {
                  invalidateSessionQuietly();
                  handleNextStep();
                }}
                onBack={handlePreviousStep}
              />
            )}
            {currentStep === 4 && (
              <Confirmation
                travelers={travelers}
                onBack={handlePreviousStep}
                onSubmit={() => {
                  // La sesión ya se invalidó al salir de AddTravelers; aquí solo confirmamos visualmente.
                }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export const BookingFlow = () => (
  <LanguageProvider>
    <BookingFlowInner />
  </LanguageProvider>
);
