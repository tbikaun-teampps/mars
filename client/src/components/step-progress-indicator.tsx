import { useMultiStepForm } from "./multi-step-form";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

export function StepProgressIndicator() {
  const { currentStep, steps, goToStep, canGoToStep, isStepComplete } =
    useMultiStepForm();

  return (
    <nav aria-label="Progress">
      <ol className="flex items-start justify-between w-full">
        {steps.map((step, index) => {
          const isActive = currentStep === index;
          const isComplete = isStepComplete(index);
          const isClickable = canGoToStep(index);

          return (
            <li
              key={step.id}
              className="flex-1 flex flex-col items-center relative"
            >
              {/* Step button */}
              <button
                type="button"
                onClick={() => isClickable && goToStep(index)}
                disabled={!isClickable}
                className={cn(
                  "flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors relative z-10",
                  isActive &&
                    "border-blue-600 bg-blue-600 text-white font-semibold",
                  isComplete &&
                    !isActive &&
                    "border-green-600 bg-green-600 text-white",
                  !isActive &&
                    !isComplete &&
                    "border-gray-300 bg-white text-gray-500",
                  isClickable &&
                    !isActive &&
                    "hover:border-blue-400 cursor-pointer",
                  !isClickable && "cursor-not-allowed opacity-50"
                )}
                aria-current={isActive ? "step" : undefined}
              >
                {isComplete && !isActive ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <span className="text-sm">{index + 1}</span>
                )}
              </button>

              {/* Connector line - positioned absolutely to connect circles */}
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "absolute top-5 left-1/2 w-full h-0.5 transition-colors",
                    isComplete ? "bg-green-600" : "bg-gray-300"
                  )}
                  aria-hidden="true"
                />
              )}

              {/* Text labels below circle */}
              <div className="flex flex-col items-center mt-2">
                {/* Step title */}
                <span
                  className={cn(
                    "text-xs text-center font-medium",
                    isActive && "text-blue-600",
                    isComplete && !isActive && "text-green-600",
                    !isActive && !isComplete && "text-gray-500"
                  )}
                >
                  {step.title}
                </span>
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
