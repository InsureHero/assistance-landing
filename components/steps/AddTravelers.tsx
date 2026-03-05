"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, ArrowRight, ArrowLeft, Plus, Trash2, Pencil, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import type { Traveler } from "../BookingFlow";
import { useLanguage } from "@/contexts/LanguageContext";
import type { RiskItem } from "@/services/risk_item.service";
import { patchBeneficiaries, patchRiskItemMetadata } from "@/services/risk_item.service";
import type { BeneficiaryPayload } from "@/services/risk_item.service";
import {
  postSalesSyncBeneficiaries,
  getPostSalesBaseUrl,
  type PostSalesBeneficiaryAction,
} from "@/services/post_sales.service";
import Link from "next/link";
import { COUNTRIES, FISCAL_TYPES, SOURCE_LANDING, MAX_BENEFICIARIES } from "@/lib/addTravelersConstants";
import {
  getPostSalesSyncedKey,
  isPolicyPrivacyAccepted,
  createEmptyTraveler,
  isMinor,
  isTravelerComplete,
  formatDateForDisplay,
  beneficiaryToTraveler,
  travelerToBeneficiaryPayload,
} from "@/lib/utils/addTravelersUtils";

interface AddTravelersProps {
  riskItem: RiskItem | null;
  travelers: Traveler[];
  setTravelers: (travelers: Traveler[]) => void;
  onNext: () => void;
  onBack: () => void;
}

export const AddTravelers = ({ riskItem, travelers, setTravelers, onNext, onBack }: AddTravelersProps) => {
  const [currentTraveler, setCurrentTraveler] = useState<Traveler>(() => createEmptyTraveler(false));
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const { t } = useLanguage();

  const privacyPolicyUrl = process.env.NEXT_PUBLIC_PRIVACY_POLICY_URL ?? "/privacy-policy";

  // Cargar beneficiarios del risk item al montar el componente (primer elemento = holder)
  // Si el risk item ya trae beneficiarios, marcar como ya sincronizado con post-sales → en el guardado se enviarán como "edit"
  // Inicializar checkbox de política de privacidad desde metadata (policy_privacy === true → marcado)
  useEffect(() => {
    if (riskItem?.beneficiaries && riskItem.beneficiaries.length > 0) {
      const loadedTravelers = riskItem.beneficiaries.map((b, i) => beneficiaryToTraveler(b, i));
      setTravelers(loadedTravelers);
      const riskItemId = riskItem.id ?? riskItem.uid;
      if (riskItemId && typeof sessionStorage !== "undefined") {
        sessionStorage.setItem(getPostSalesSyncedKey(riskItemId), "true");
      }
    }
    setPrivacyAccepted(isPolicyPrivacyAccepted(riskItem?.metadata));
  }, [riskItem, setTravelers]);

  const validateAndGetError = (): string | null => {
    if (!currentTraveler.dateOfBirth) return t.addTravelers.fillAll;
    const minor = isMinor(currentTraveler.dateOfBirth);
    if (minor) {
      if (!currentTraveler.name?.trim()) return t.addTravelers.fillMinor;
      if (!currentTraveler.lastname?.trim()) return t.addTravelers.fillMinor;
      if (!currentTraveler.fiscalType) return t.addTravelers.fillMinor;
      if (!currentTraveler.fiscalId?.trim()) return t.addTravelers.fillMinor;
      if (!currentTraveler.documentCountry) return t.addTravelers.fillMinor;
      return null;
    }
    // Mayor de edad: requeridos comunes
    if (!currentTraveler.name?.trim() || !currentTraveler.lastname?.trim()) return t.addTravelers.fillAll;
    if (!currentTraveler.dateOfBirth) return t.addTravelers.fillAll;
    if (!currentTraveler.fiscalType || !currentTraveler.fiscalId?.trim()) return t.addTravelers.fillAll;
    if (!currentTraveler.documentCountry) return t.addTravelers.fillAll;
    // Solo para titular (isHolder: true): email, código de país y número de celular son obligatorios. Si isTraveler y no holder, son opcionales.
    if (currentTraveler.isHolder) {
      if (!currentTraveler.email?.trim()) return t.addTravelers.fillAll;
      if (!currentTraveler.mobilePrefix?.trim() || !currentTraveler.phone?.trim()) return t.addTravelers.fillAll;
    }
    return null;
  };

  const handleAddOrSaveTraveler = () => {
    const err = validateAndGetError();
    if (err) {
      toast.error(err);
      return;
    }

    if (editingIndex !== null) {
      const updated = [...travelers];
      const existing = travelers[editingIndex];
      const toSave: Traveler = { ...currentTraveler };
      // Holder: no modificar source ni added_at (preservar valores existentes).
      if (existing.isHolder) {
        if (existing.source != null && String(existing.source).trim() !== "") toSave.source = existing.source;
        if (existing.added_at != null && String(existing.added_at).trim() !== "") toSave.added_at = existing.added_at;
      }
      updated[editingIndex] = toSave;
      setTravelers(updated);
      setEditingIndex(null);
      toast.success(t.addTravelers.travelerUpdated);
    } else {
      if (travelers.length >= MAX_BENEFICIARIES) {
        toast.error(t.addTravelers.maxBeneficiariesReached);
        return;
      }
      // Nuevo traveler desde el landing: siempre isTraveler: true, isHolder: false
      const newTraveler: Traveler = {
        ...currentTraveler,
        isHolder: false,
        isTraveler: true,
        source: SOURCE_LANDING,
        added_at: new Date().toISOString(),
      };
      setTravelers([...travelers, newTraveler]);
      toast.success(t.addTravelers.travelerAdded);
    }
    setCurrentTraveler(createEmptyTraveler(false));
  };

  const handleEditTraveler = (index: number) => {
    const traveler = travelers[index];
    const withDefaults: Traveler = {
      ...createEmptyTraveler(traveler.isHolder),
      ...traveler,
      name: traveler.name ?? "",
      lastname: traveler.lastname ?? "",
      dateOfBirth: traveler.dateOfBirth ?? "",
      documentCountry: traveler.documentCountry ?? "",
      fiscalType: traveler.fiscalType || "1004",
      fiscalId: traveler.fiscalId ?? "",
      email: traveler.email ?? "",
      mobilePrefix: traveler.mobilePrefix ?? "",
      phone: traveler.phone ?? "",
      source: traveler.source,
      added_at: traveler.added_at,
      isTraveler: typeof traveler.isTraveler === "boolean" ? traveler.isTraveler : !traveler.isHolder,
    };
    setCurrentTraveler(withDefaults);
    setEditingIndex(index);
  };

  const handleCancelEdit = () => {
    setCurrentTraveler(createEmptyTraveler(false));
    setEditingIndex(null);
  };

  const handleRemoveTraveler = (index: number) => {
    if (editingIndex === index) handleCancelEdit();
    setTravelers(travelers.filter((_, i) => i !== index));
    toast.success(t.addTravelers.travelerRemoved);
  };

  const handleContinue = async () => {
    if (travelers.length === 0) {
      toast.error(t.addTravelers.addAtLeastOne);
      return;
    }
    if (!riskItem) {
      toast.error(t.addTravelers.noPlanSelected);
      return;
    }
    const riskItemId = riskItem.id ?? riskItem.uid;
    if (!riskItemId) {
      toast.error(t.addTravelers.invalidPlanId);
      return;
    }

    setIsSaving(true);
    try {
      let clientIp = "unknown";
      try {
        const ipRes = await fetch("/api/my-ip");
        if (ipRes.ok) {
          const data = await ipRes.json();
          clientIp = (data.ip ?? clientIp).trim() || "unknown";
        }
      } catch {
        // seguir sin IP si falla
      }
      // En local (next dev) el servidor ve la IP como ::1 o 127.0.0.1. Fallback: obtener IP pública desde el cliente.
      const isLocalhost = clientIp === "::1" || clientIp === "127.0.0.1" || clientIp === "::ffff:127.0.0.1";
      if (isLocalhost && typeof window !== "undefined") {
        try {
          const pubRes = await fetch("https://api.ipify.org?format=json", { signal: AbortSignal.timeout(3000) });
          if (pubRes.ok) {
            const pub = await pubRes.json();
            if (pub?.ip?.trim()) clientIp = pub.ip.trim();
          }
        } catch {
          // mantener clientIp (::1 o unknown)
        }
      }
      const metadata = {
        privacy_policy: {
          client_ip: clientIp,
          date: new Date().toISOString(),
          policy_privacy: privacyAccepted,
        },
      };
      const alreadyHadPrivacyAccepted = isPolicyPrivacyAccepted(riskItem?.metadata);
      try {
        await patchRiskItemMetadata(riskItemId, metadata);
      } catch {
        if (privacyAccepted && !alreadyHadPrivacyAccepted) {
          toast.warning(t.addTravelers.privacyMetadataNotSaved);
        }
      }
      const beneficiariesPayload = travelers.map(travelerToBeneficiaryPayload);
      await patchBeneficiaries(riskItemId, beneficiariesPayload);
      toast.success(t.addTravelers.beneficiariesSaved);

      // Sincronizar con post-sales (body: risk_item + beneficiaries con action en cada uno).
      const baseUrl = getPostSalesBaseUrl();
      if (baseUrl && riskItemId && riskItem) {
        const syncedKey = getPostSalesSyncedKey(riskItemId);
        const isFirstSync =
          typeof sessionStorage !== "undefined" ? !sessionStorage.getItem(syncedKey) : true;
        const action: PostSalesBeneficiaryAction = isFirstSync ? "create" : "edit";
        const beneficiariesWithAction: { payload: BeneficiaryPayload; action: PostSalesBeneficiaryAction }[] =
          beneficiariesPayload.map((payload) => ({ payload, action }));
        try {
          await postSalesSyncBeneficiaries(riskItem, beneficiariesWithAction);
          if (typeof sessionStorage !== "undefined") sessionStorage.setItem(syncedKey, "true");
        } catch {
          // Solo consumir y enviar datos; no mostrar mensajes al usuario
        }
      }

      onNext();
    } catch (error) {
      const message = error instanceof Error ? error.message : t.addTravelers.errorSaving;
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const allTravelersComplete = travelers.length > 0 && travelers.every(isTravelerComplete);
  const hasAtLeastOneTraveler = travelers.some((t) => t.isTraveler === true);
  const canContinue = allTravelersComplete && privacyAccepted && hasAtLeastOneTraveler;

  const selectClass = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

  /** Prefijo + teléfono en una fila compacta */
  const phoneWithPrefix = (inputPrefix: string, required?: boolean) => (
    <div className="space-y-1.5">
      <Label htmlFor={`${inputPrefix}-phone`} className="text-sm">{t.addTravelers.phone}{required ? " *" : ""}</Label>
      <div className="flex gap-2">
        <Input
          id={`${inputPrefix}-prefix`}
          placeholder="593"
          value={currentTraveler.mobilePrefix}
          onChange={(e) => setCurrentTraveler({ ...currentTraveler, mobilePrefix: e.target.value.replace(/\D/g, "").slice(0, 4) })}
          className="w-16 shrink-0 h-10 text-sm"
          maxLength={4}
        />
        <Input
          id={`${inputPrefix}-phone`}
          placeholder={t.addTravelers.phonePlaceholder}
          value={currentTraveler.phone}
          onChange={(e) => setCurrentTraveler({ ...currentTraveler, phone: e.target.value })}
          className="min-w-0 flex-1 h-10 text-sm"
        />
      </div>
    </div>
  );

  const renderFormFields = (prefix: string) => {
    const minor = isMinor(currentTraveler.dateOfBirth);
    const isHolder = currentTraveler.isHolder;

    return (
      <div className="space-y-3">
        {/* 1. Nombre y apellido — en pantalla completa 2 cols, en móvil se apilan */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor={`${prefix}-name`} className="text-sm">{t.addTravelers.name} *</Label>
            <Input
              id={`${prefix}-name`}
              placeholder={t.addTravelers.namePlaceholder}
              value={currentTraveler.name}
              onChange={(e) => setCurrentTraveler({ ...currentTraveler, name: e.target.value })}
              className="h-10 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${prefix}-lastname`} className="text-sm">{t.addTravelers.lastname} *</Label>
            <Input
              id={`${prefix}-lastname`}
              placeholder={t.addTravelers.lastnamePlaceholder}
              value={currentTraveler.lastname}
              onChange={(e) => setCurrentTraveler({ ...currentTraveler, lastname: e.target.value })}
              className="h-10 text-sm"
            />
          </div>
        </div>

        {/* 2. Fecha de nacimiento | Nacionalidad — siempre en la misma fila */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5 min-w-0">
            <Label htmlFor={`${prefix}-dob`} className="text-sm">{t.addTravelers.dateOfBirth} *</Label>
            <Input
              id={`${prefix}-dob`}
              type="date"
              value={currentTraveler.dateOfBirth}
              onChange={(e) => setCurrentTraveler({ ...currentTraveler, dateOfBirth: e.target.value })}
              className="h-10 text-sm w-full min-w-0"
            />
          </div>
          <div className="space-y-1.5 min-w-0">
            <Label htmlFor={`${prefix}-documentCountry`} className="text-sm">{t.addTravelers.documentCountry} *</Label>
            <select
              id={`${prefix}-documentCountry`}
              className={selectClass + " h-10 min-w-0"}
              value={currentTraveler.documentCountry}
              onChange={(e) => setCurrentTraveler({ ...currentTraveler, documentCountry: e.target.value })}
            >
              <option value="">{t.addTravelers.documentCountryPlaceholder}</option>
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* 3. ID type (pequeño) | ID number — misma fila en pantalla completa, se apilan al reducir */}
        <div className="flex flex-wrap gap-3 items-end">
          <div className="space-y-1.5 w-full sm:w-32 shrink-0">
            <Label htmlFor={`${prefix}-fiscalType`} className="text-sm">{t.addTravelers.fiscalType} *</Label>
            <select
              id={`${prefix}-fiscalType`}
              className={selectClass + " h-10"}
              value={currentTraveler.fiscalType}
              onChange={(e) => setCurrentTraveler({ ...currentTraveler, fiscalType: e.target.value })}
            >
              {FISCAL_TYPES.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5 min-w-0 flex-1 sm:min-w-[12rem]">
            <Label htmlFor={`${prefix}-fiscalId`} className="text-sm">{t.addTravelers.fiscalId} *</Label>
            <Input
              id={`${prefix}-fiscalId`}
              placeholder={t.addTravelers.fiscalIdPlaceholder}
              value={currentTraveler.fiscalId}
              onChange={(e) => setCurrentTraveler({ ...currentTraveler, fiscalId: e.target.value })}
              className="h-10 text-sm"
            />
          </div>
        </div>

        {/* 4. Correo y número (prefijo + teléfono) — solo si no es menor */}
        {!minor && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {isHolder ? (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor={`${prefix}-email`} className="text-sm">{t.addTravelers.email} *</Label>
                  <Input
                    id={`${prefix}-email`}
                    type="email"
                    placeholder={t.addTravelers.emailPlaceholder}
                    value={currentTraveler.email}
                    onChange={(e) => setCurrentTraveler({ ...currentTraveler, email: e.target.value })}
                    className="h-10 text-sm"
                  />
                </div>
                {phoneWithPrefix(prefix, true)}
              </>
            ) : (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor={`${prefix}-email-opt`} className="text-sm">{t.addTravelers.email}</Label>
                  <Input
                    id={`${prefix}-email-opt`}
                    type="email"
                    placeholder={t.addTravelers.emailPlaceholder}
                    value={currentTraveler.email}
                    onChange={(e) => setCurrentTraveler({ ...currentTraveler, email: e.target.value })}
                    className="h-10 text-sm"
                  />
                </div>
                {phoneWithPrefix(`${prefix}-opt`, false)}
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className="shadow-elegant border-0">
      <CardHeader className="text-center">
        <div className="w-16 h-16 rounded-full gradient-ocean flex items-center justify-center mx-auto mb-4">
          <Users className="w-8 h-8 text-primary-foreground" />
        </div>
        <CardTitle className="text-2xl font-serif">{t.addTravelers.title}</CardTitle>
        <CardDescription className="text-base">{t.addTravelers.description}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {travelers.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-muted-foreground">{t.addTravelers.addedTravelers} ({travelers.length})</h3>
            {travelers.map((traveler, index) => {
              const complete = isTravelerComplete(traveler);
              const isIncomplete = !complete;
              return (
              <div key={index} className="space-y-3">
                <div
                  className={`flex items-center justify-between p-4 rounded-xl border-2 ${
                    isIncomplete
                      ? "bg-amber-50/80 border-amber-400 dark:bg-amber-950/20 dark:border-amber-500"
                      : "bg-secondary border-transparent"
                  } ${editingIndex === index ? "ring-2 ring-primary" : ""}`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-foreground">{traveler.name} {traveler.lastname}</p>
                      {traveler.isHolder && (
                        <Badge variant="secondary" className="text-xs">{t.addTravelers.primaryBooker}</Badge>
                      )}
                      {traveler.isTraveler && !traveler.isHolder && (
                        <Badge variant="outline" className="text-xs">{t.addTravelers.traveler}</Badge>
                      )}
                      {isIncomplete && (
                        <Badge className="text-xs bg-amber-500 text-white border-0 hover:bg-amber-600">
                          {t.addTravelers.incomplete}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {t.addTravelers.dob}: {traveler.dateOfBirth ? formatDateForDisplay(traveler.dateOfBirth) : "—"} · {traveler.documentCountry || traveler.nationality || "—"}
                    </p>
                    {isIncomplete && (
                      <p className="flex items-center gap-1.5 text-sm text-amber-600 dark:text-amber-400 mt-2 font-medium">
                        <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden />
                        {t.addTravelers.completeYourInfo}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditTraveler(index)}
                      className="text-muted-foreground hover:text-foreground"
                      disabled={editingIndex !== null && editingIndex !== index}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    {!traveler.isHolder && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveTraveler(index)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        disabled={editingIndex !== null}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>

                {editingIndex === index && (
                  <div className="space-y-4 p-4 rounded-lg border-2 border-primary bg-primary/5">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Pencil className="w-5 h-5 text-primary" /> {t.addTravelers.editTraveler}
                    </h3>
                    {currentTraveler.isHolder && (
                      <div className="flex items-center gap-3">
                        <button
                          id={`is-traveler-toggle-${index}`}
                          type="button"
                          role="switch"
                          aria-checked={currentTraveler.isTraveler}
                          aria-label={t.addTravelers.travelingOnTrip}
                          onClick={() => setCurrentTraveler({ ...currentTraveler, isTraveler: !currentTraveler.isTraveler })}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                            currentTraveler.isTraveler ? "bg-primary" : "bg-muted"
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform ${
                              currentTraveler.isTraveler ? "translate-x-5" : "translate-x-0.5"
                            }`}
                            style={{ marginTop: 2 }}
                          />
                        </button>
                        <Label htmlFor={`is-traveler-toggle-${index}`} className="text-sm font-normal cursor-pointer">
                          {t.addTravelers.travelingOnTrip}
                        </Label>
                      </div>
                    )}
                    {renderFormFields(`edit-${index}`)}
                    <div className="flex gap-2">
                      <Button onClick={handleAddOrSaveTraveler} className="flex-1 gradient-ocean text-white hover:opacity-90">
                        <Pencil className="mr-2 w-4 h-4" /> {t.addTravelers.saveChanges}
                      </Button>
                      <Button variant="ghost" onClick={handleCancelEdit}>{t.addTravelers.cancel}</Button>
                    </div>
                  </div>
                )}
              </div>
            );
            })}
          </div>
        )}

        {editingIndex === null && (
          <div className="space-y-4 p-4 rounded-lg border-2 border-dashed border-border">
            <h3 className="font-semibold flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary" /> {t.addTravelers.addNewTraveler}
            </h3>
            {travelers.length >= MAX_BENEFICIARIES ? (
              <p className="text-sm text-muted-foreground">{t.addTravelers.maxBeneficiariesReached}</p>
            ) : (
              <>
                {renderFormFields("new")}
                <div className="flex gap-2">
                  <Button onClick={handleAddOrSaveTraveler} className="flex-1 gradient-ocean text-white hover:opacity-90">
                    <Plus className="mr-2 w-4 h-4" /> {t.addTravelers.addThisTraveler}
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        <div className="flex flex-col gap-3 pt-4">
          <label className="flex items-start gap-3 cursor-pointer text-sm">
            <input
              type="checkbox"
              checked={privacyAccepted}
              onChange={(e) => setPrivacyAccepted(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-input"
            />
            <span className="text-muted-foreground">
              * {t.addTravelers.privacyAccept}{" "}
              <Link
                href={privacyPolicyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline hover:no-underline font-medium"
              >
                {t.addTravelers.privacyPolicy}
              </Link>
              .
            </span>
          </label>
          <div className="flex gap-3">
          <Button variant="outline" onClick={onBack} className="flex-1 h-12">
            <ArrowLeft className="mr-2 w-5 h-5" />
            {t.addTravelers.back}
          </Button>
          <Button
            onClick={handleContinue}
            className="flex-1 h-12 text-base font-medium gradient-ocean hover:opacity-90"
            disabled={!canContinue || isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 w-5 h-5 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                {t.addTravelers.continue}
                <ArrowRight className="ml-2 w-5 h-5" />
              </>
            )}
          </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
