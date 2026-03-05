"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { MapPin, Calendar, ChevronDown, Users, ArrowLeft, FileText, Loader2 } from "lucide-react";
import Image from "next/image";
import { useLanguage } from "@/contexts/LanguageContext";
import { getStoredAccessToken, clearSessionAndNotify } from "@/services/auth.service";
import type { RiskItem } from "@/services/risk_item.service";
import { getRiskItemsByEmail } from "@/services/risk_item.service";
import type { Variant } from "@/services/variant.service";
import { getVariantsByRiskItemId } from "@/services/variant.service";
import { toast } from "sonner";

const DESTINATION_LABEL = "Riviera Maya";
const LOCATION_LABEL = "Quintana Roo, Mexico";
const PLAN_NAME = "MAWDY Assistance Standard";
const DETAILS_PDF_URL = "/docs/vidanta-benefits.pdf";

const DEFAULT_BENEFITS = [
  { name: "Emergency Medical Expenses", coverage: "Up to $6,000 USD" },
  { name: "Dental Emergency", coverage: "Up to $300 USD" },
  { name: "Medical Transport", coverage: "Up to $6,000 USD" },
  { name: "Hotel Convalescence", coverage: "Up to $500 USD" },
  { name: "Trip Cancellation (Hotel)", coverage: "Up to $3,000 USD" },
  { name: "Baggage Loss", coverage: "Up to $600 USD" },
  { name: "Flight Delay", coverage: "Up to $200 USD" },
  { name: "Cash Delivery", coverage: "Up to $10,000 USD" },
];

/** Formatea fecha ISO (ej. 2026-04-16) a legible según locale */
function formatTripDate(isoDate: string | undefined, locale: string): string {
  if (!isoDate) return "—";
  try {
    const d = new Date(isoDate);
    if (Number.isNaN(d.getTime())) return isoDate;
    return d.toLocaleDateString(locale === "es" ? "es-MX" : "en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return isoDate;
  }
}

/**
 * Calcula días y noches entre tripStartDate y tripEndDate.
 * Retorna objeto con días y noches (si el viaje dura 2 días, son 2 días y 2 noches).
 */
function calculateTripDuration(
  startIso: string | undefined,
  endIso: string | undefined
): { days: number; nights: number } {
  if (!startIso || !endIso) return { days: 0, nights: 0 };
  try {
    const start = new Date(startIso.slice(0, 10));
    const end = new Date(endIso.slice(0, 10));
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return { days: 0, nights: 0 };
    const diffMs = end.getTime() - start.getTime();
    const diffDays = Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));
    // Si el viaje dura N días, son N días y N noches
    return { days: diffDays, nights: diffDays };
  } catch {
    return { days: 0, nights: 0 };
  }
}

/** Formatea nombre completo: firstName lastName maternalLastName */
function formatFullName(
  firstName?: string,
  lastName?: string,
  maternalLastName?: string
): string {
  const parts = [firstName, lastName, maternalLastName].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : "—";
}

interface TripSummaryProps {
  email: string;
  onNext: (riskItem: RiskItem) => void;
  onBack: () => void;
  /** Si el GET risk-items devuelve lista vacía, se invalida sesión y se redirige al inicio (paso 1). */
  onNoPlans?: () => void;
}

export const TripSummary = ({ email, onNext, onBack, onNoPlans }: TripSummaryProps) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [riskItems, setRiskItems] = useState<RiskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [variantsByRiskItem, setVariantsByRiskItem] = useState<Record<string, Variant[]>>({});
  const [loadingVariants, setLoadingVariants] = useState<Record<string, boolean>>({});
  const { t, language } = useLanguage();

  useEffect(() => {
    if (!email || !email.trim()) {
      setLoading(false);
      setRiskItems([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(false);
    const token = getStoredAccessToken();
    if (!token) {
      setError(true);
      setRiskItems([]);
      setLoading(false);
      toast.error(t.tripSummary.errorLoadingPlans);
      return () => {};
    }
    const emailToUse = email.trim().toLowerCase();
    fetch(`/api/risk-items?email=${encodeURIComponent(emailToUse)}`, {
      method: "GET",
      headers: { authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (res.status === 401) {
          clearSessionAndNotify();
          throw new Error("Session expired");
        }
        if (!res.ok) throw new Error(res.statusText);
        return res.json();
      })
      .then((json: { data?: RiskItem[] }) => {
        if (cancelled) return;
        const list = Array.isArray(json?.data) ? json.data : [];
        setRiskItems(list);
        // Si no tiene ningún plan: avisar, invalidar sesión y volver al inicio
        if (list.length === 0 && onNoPlans) {
          toast.info(t.tripSummary.noPlans);
          onNoPlans();
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError(true);
          setRiskItems([]);
          toast.error(t.tripSummary.errorLoadingPlans);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [email, t.tripSummary.errorLoadingPlans, t.tripSummary.noPlans, onNoPlans]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center mb-2">
          <h2 className="text-2xl font-serif font-bold text-foreground">{t.tripSummary.title}</h2>
          <p className="text-muted-foreground mt-1">{t.tripSummary.subtitle}</p>
        </div>
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-muted-foreground">{t.tripSummary.loadingPlans}</p>
        </div>
        <div className="pt-2">
          <Button variant="outline" onClick={onBack} className="h-11">
            <ArrowLeft className="mr-2 w-5 h-5" />
            {t.tripSummary.back}
          </Button>
        </div>
      </div>
    );
  }

  if (error || riskItems.length === 0) {
    return (
      <div className="space-y-6">
        <div className="text-center mb-2">
          <h2 className="text-2xl font-serif font-bold text-foreground">{t.tripSummary.title}</h2>
          <p className="text-muted-foreground mt-1">{t.tripSummary.subtitle}</p>
        </div>
        <div className="text-center py-12 rounded-lg bg-secondary/50">
          <p className="text-muted-foreground">{t.tripSummary.noPlans}</p>
        </div>
        <div className="pt-2">
          <Button variant="outline" onClick={onBack} className="h-11">
            <ArrowLeft className="mr-2 w-5 h-5" />
            {t.tripSummary.back}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-2">
        <h2 className="text-2xl font-serif font-bold text-foreground">{t.tripSummary.title}</h2>
        <p className="text-muted-foreground mt-1">{t.tripSummary.subtitle}</p>
      </div>

      <div className="space-y-4">
        {riskItems.map((item) => {
          const id = item.id ?? item.uid ?? "";
          const subject = item.insured_subject;
          const startDate = subject?.tripStartDate ?? item.start_date;
          const endDate = subject?.tripEndDate ?? item.end_date;
          const duration = calculateTripDuration(startDate, endDate);
          const status = item.status ?? "";
          const statusLower = status.toLowerCase();
          const isActive = statusLower === "active";
          const checkInFormatted = formatTripDate(startDate, language);
          const checkOutFormatted = formatTripDate(endDate, language);
          const fullName = formatFullName(subject?.firstName, subject?.lastName, subject?.maternalLastName);
          const origin = subject?.origin ?? "";
          const destination = subject?.destination ?? "";

          return (
            <Card
              key={id}
              className="shadow-soft border-0 overflow-hidden transition-smooth hover:shadow-elegant"
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge
                        className={
                          isActive
                            ? "bg-green-600 text-white border-0 hover:bg-green-600"
                            : "bg-red-600 text-white border-0 hover:bg-red-600"
                        }
                      >
                        {status || "—"}
                      </Badge>
                      {duration.days > 0 && (
                        <span className="text-sm text-muted-foreground">
                          {duration.days} {duration.days === 1 ? t.tripSummary.day : t.tripSummary.days}{" "}
                          {duration.nights} {duration.nights === 1 ? t.tripSummary.night : t.tripSummary.nights}
                        </span>
                      )}
                    </div>
                    {origin && (
                      <h3 className="text-xl font-serif font-bold text-foreground mb-1">
                        {origin}
                      </h3>
                    )}
                    {destination && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {destination}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end flex-shrink-0">
                    <span className="text-[10px] text-muted-foreground leading-tight">
                      {t.tripSummary.providedBy}
                    </span>
                    <Image
                      src="/assets/mawdy-logo.jpg"
                      alt="MAWDY"
                      width={60}
                      height={20}
                      className="mt-0.5 h-5 w-auto"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm mb-3 p-3 rounded-lg bg-secondary">
                  <Calendar className="w-4 h-4 text-primary flex-shrink-0" />
                  <span className="text-foreground font-medium">{checkInFormatted}</span>
                  <span className="text-muted-foreground">→</span>
                  <span className="text-foreground font-medium">{checkOutFormatted}</span>
                </div>

                <div className="mb-4">
                  <p className="text-sm text-muted-foreground mb-1">{t.tripSummary.plan}</p>
                  <p className="font-semibold text-foreground">{PLAN_NAME}</p>

                  <Collapsible
                    open={expandedId === id}
                    onOpenChange={async (open) => {
                      setExpandedId(open ? id : null);
                      // Cargar variantes cuando se expande por primera vez
                      if (open && !variantsByRiskItem[id] && !loadingVariants[id]) {
                        setLoadingVariants((prev) => ({ ...prev, [id]: true }));
                        try {
                          const token = getStoredAccessToken();
                          if (token) {
                            const variants = await getVariantsByRiskItemId(id, token);
                            setVariantsByRiskItem((prev) => ({ ...prev, [id]: variants }));
                          }
                        } catch {
                          toast.error(t.tripSummary.errorLoadingVariants);
                        } finally {
                          setLoadingVariants((prev) => ({ ...prev, [id]: false }));
                        }
                      }
                    }}
                  >
                    <CollapsibleTrigger className="flex items-center gap-1 text-sm text-primary font-medium mt-2 hover:underline">
                      {t.tripSummary.viewBenefits}
                      <ChevronDown
                        className={`w-4 h-4 transition-transform ${expandedId === id ? "rotate-180" : ""}`}
                      />
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      {loadingVariants[id] ? (
                        <div className="mt-3 flex items-center justify-center py-8">
                          <Loader2 className="w-6 h-6 animate-spin text-primary" />
                        </div>
                      ) : variantsByRiskItem[id] && variantsByRiskItem[id].length > 0 ? (
                        <div className="mt-3 grid grid-cols-2 gap-3">
                          {variantsByRiskItem[id].map((variant, i) => (
                            <div key={variant.id ?? i} className="p-2 rounded-md bg-secondary/50">
                              <p className="text-sm font-medium text-foreground leading-tight">
                                {variant.name || "—"}
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {variant.description || "—"}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="mt-3 grid grid-cols-2 gap-3">
                          {DEFAULT_BENEFITS.map((b, i) => (
                            <div key={i} className="p-2 rounded-md bg-secondary/50">
                              <p className="text-sm font-medium text-foreground leading-tight">
                                {b.name}
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5">{b.coverage}</p>
                            </div>
                          ))}
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground mt-3">
                        {t.tripSummary.showingKeyBenefits}
                      </p>
                      <a
                        href={DETAILS_PDF_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm text-primary font-medium mt-2 hover:underline"
                      >
                        <FileText className="w-4 h-4" />
                        {t.tripSummary.viewAllBenefits}
                      </a>
                    </CollapsibleContent>
                  </Collapsible>
                </div>

                <Button
                  onClick={() => onNext(item)}
                  className="w-full h-11 gradient-ocean hover:opacity-90 text-base font-medium"
                >
                  <Users className="mr-2 w-5 h-5" />
                  {t.tripSummary.manageTravelers}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="pt-2">
        <Button variant="outline" onClick={onBack} className="h-11">
          <ArrowLeft className="mr-2 w-5 h-5" />
          {t.tripSummary.back}
        </Button>
      </div>
    </div>
  );
};
