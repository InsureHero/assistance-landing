"use client";

import { Check } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface ProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
}

export const ProgressIndicator = ({ currentStep, totalSteps }: ProgressIndicatorProps) => {
  const { t } = useLanguage();

  const steps = [
    { number: 1, label: t.progress.verify },
    { number: 2, label: t.progress.plans },
    { number: 3, label: t.progress.travelers },
    { number: 4, label: t.progress.review },
  ];

  return (
    <div className="w-full px-4">
      <div className="flex items-center justify-between relative">
        {/* Progress Line */}
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-border -z-10">
          <div
            className="h-full bg-primary transition-smooth"
            style={{ width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%` }}
          />
        </div>

        {/* Steps */}
        {steps.map((step) => (
          <div key={step.number} className="flex flex-col items-center">
            <div
              className={`
                w-10 h-10 rounded-full flex items-center justify-center
                transition-smooth font-semibold
                ${
                  currentStep > step.number
                    ? "bg-primary text-primary-foreground"
                    : currentStep === step.number
                    ? "bg-primary text-primary-foreground shadow-elegant"
                    : "bg-card text-muted-foreground border-2 border-border"
                }
              `}
            >
              {currentStep > step.number ? (
                <Check className="w-5 h-5" />
              ) : (
                <span className="text-sm">{step.number}</span>
              )}
            </div>
            <span
              className={`
                mt-2 text-xs md:text-sm font-medium transition-smooth
                ${currentStep >= step.number ? "text-foreground" : "text-muted-foreground"}
              `}
            >
              {step.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
