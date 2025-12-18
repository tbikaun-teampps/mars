import { useMultiStepForm } from "./multi-step-form";
import { cn } from "@/lib/utils";
import { Check, Lock } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface StepProgressIndicatorProps {
  /** Array of step indices that are locked */
  lockedSteps?: number[];
}

export function StepProgressIndicator({ lockedSteps = [] }: StepProgressIndicatorProps) {
  const { currentStep, steps, goToStep, canGoToStep, isStepComplete } =
    useMultiStepForm();

  const isStepLocked = (index: number) => lockedSteps.includes(index);

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
                {isComplete ? (
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
                {/* Step title with optional lock icon */}
                <span
                  className={cn(
                    "text-xs text-center font-medium flex items-center gap-1",
                    isActive && "text-blue-600",
                    isComplete && "text-green-600",
                    !isActive && !isComplete && "text-gray-500"
                  )}
                >
                  {step.title}
                  {isStepLocked(index) && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Lock className="w-3 h-3 text-slate-400 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">
                          This step is locked after workflow progression
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </span>
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
