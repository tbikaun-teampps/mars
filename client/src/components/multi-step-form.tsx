import * as React from "react";

export interface Step {
  id: string;
  title: string;
  description?: string;
  isOptional?: boolean;
}

interface MultiStepFormContextValue {
  currentStep: number;
  totalSteps: number;
  steps: Step[];
  goToStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  canGoToStep: (step: number) => boolean;
  completedSteps: Set<number>;
  markStepComplete: (step: number) => void;
  isStepComplete: (step: number) => boolean;
}

const MultiStepFormContext = React.createContext<
  MultiStepFormContextValue | undefined
>(undefined);

export function useMultiStepForm() {
  const context = React.useContext(MultiStepFormContext);
  if (!context) {
    throw new Error("useMultiStepForm must be used within MultiStepFormProvider");
  }
  return context;
}

interface MultiStepFormProviderProps {
  children: React.ReactNode;
  steps: Step[];
  initialStep?: number;
  onStepChange?: (step: number) => void;
}

export function MultiStepFormProvider({
  children,
  steps,
  initialStep = 0,
  onStepChange,
}: MultiStepFormProviderProps) {
  const [currentStep, setCurrentStep] = React.useState(initialStep);
  const [completedSteps, setCompletedSteps] = React.useState<Set<number>>(
    new Set()
  );

  const goToStep = React.useCallback(
    (step: number) => {
      if (step >= 0 && step < steps.length) {
        setCurrentStep(step);
        onStepChange?.(step);
      }
    },
    [steps.length, onStepChange]
  );

  const nextStep = React.useCallback(() => {
    if (currentStep < steps.length - 1) {
      goToStep(currentStep + 1);
    }
  }, [currentStep, steps.length, goToStep]);

  const prevStep = React.useCallback(() => {
    if (currentStep > 0) {
      goToStep(currentStep - 1);
    }
  }, [currentStep, goToStep]);

  const canGoToStep = React.useCallback(
    (step: number) => {
      // Allow navigation to any step for preview purposes
      return step >= 0 && step < steps.length;
    },
    [steps.length]
  );

  const markStepComplete = React.useCallback((step: number) => {
    setCompletedSteps((prev) => new Set(prev).add(step));
  }, []);

  const isStepComplete = React.useCallback(
    (step: number) => {
      return completedSteps.has(step);
    },
    [completedSteps]
  );

  const value: MultiStepFormContextValue = {
    currentStep,
    totalSteps: steps.length,
    steps,
    goToStep,
    nextStep,
    prevStep,
    canGoToStep,
    completedSteps,
    markStepComplete,
    isStepComplete,
  };

  return (
    <MultiStepFormContext.Provider value={value}>
      {children}
    </MultiStepFormContext.Provider>
  );
}

interface StepContentProps {
  step: number;
  children: React.ReactNode;
}

export function StepContent({ step, children }: StepContentProps) {
  const { currentStep } = useMultiStepForm();

  if (currentStep !== step) {
    return null;
  }

  return <div className="space-y-4">{children}</div>;
}

interface StepNavigationProps {
  onNext?: () => Promise<boolean> | boolean;
  onPrev?: () => void;
  isNextDisabled?: boolean;
  isPrevDisabled?: boolean;
  nextLabel?: string;
  prevLabel?: string;
  isLoading?: boolean;
}

export function StepNavigation({
  onNext,
  onPrev,
  isNextDisabled = false,
  isPrevDisabled = false,
  nextLabel,
  prevLabel = "Previous",
  isLoading = false,
}: StepNavigationProps) {
  const { currentStep, totalSteps, nextStep, prevStep } = useMultiStepForm();
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === totalSteps - 1;

  const handleNext = async () => {
    if (onNext) {
      const canProceed = await onNext();
      if (canProceed) {
        nextStep();
      }
    } else {
      nextStep();
    }
  };

  const handlePrev = () => {
    if (onPrev) {
      onPrev();
    }
    prevStep();
  };

  return (
    <div className="flex gap-2 pt-4">
      <button
        type="button"
        onClick={handlePrev}
        disabled={isFirstStep || isPrevDisabled || isLoading}
        className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {prevLabel}
      </button>
      <button
        type="button"
        onClick={handleNext}
        disabled={isNextDisabled || isLoading}
        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading
          ? "Saving..."
          : nextLabel || (isLastStep ? "Complete" : "Next")}
      </button>
    </div>
  );
}
