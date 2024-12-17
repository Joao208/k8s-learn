"use client";

import { useState } from "react";
import { Tutorial as TutorialType } from "@/lib/tutorials";
import { ChevronRight, HelpCircle, CheckCircle2 } from "lucide-react";

interface TutorialProps {
  tutorial: TutorialType;
  onCommand: (command: string) => void;
  lastOutput: string;
}

export default function Tutorial({
  tutorial,
  onCommand,
  lastOutput,
}: TutorialProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [showHint, setShowHint] = useState(false);

  const currentStep = tutorial.steps[currentStepIndex] || null;

  if (lastOutput && currentStep && !completedSteps.has(currentStep.id)) {
    const isValid = currentStep.validation(lastOutput);
    if (isValid) {
      setCompletedSteps(new Set([...completedSteps, currentStep.id]));
      if (currentStepIndex < tutorial.steps.length - 1) {
        setCurrentStepIndex(currentStepIndex + 1);
      } else {
        setCurrentStepIndex(-1);
      }
    }
  }

  const progress = (completedSteps.size / tutorial.steps.length) * 100;

  return (
    <div className="bg-background/50 backdrop-blur-sm border border-border rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold">{tutorial.title}</h2>
          <p className="text-sm text-muted-foreground">
            {tutorial.description}
          </p>
        </div>
        <div className="text-sm text-muted-foreground">
          {completedSteps.size}/{tutorial.steps.length} steps
        </div>
      </div>

      <div className="w-full bg-accent rounded-full h-1 mb-4">
        <div
          className="bg-primary h-1 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="space-y-4">
        {tutorial.steps.map((step, index) => {
          const isCompleted = completedSteps.has(step.id);
          const isCurrent = index === currentStepIndex;

          return (
            <div
              key={step.id}
              className={`p-3 rounded-lg transition-colors ${
                isCurrent
                  ? "bg-primary/10 border border-primary/20"
                  : isCompleted
                  ? "bg-primary/10 border border-primary/20"
                  : "bg-accent border border-border"
              }`}
            >
              <div className="flex items-center gap-2">
                {isCompleted ? (
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                ) : isCurrent ? (
                  <ChevronRight className="w-5 h-5 text-primary" />
                ) : (
                  <div className="w-5 h-5 rounded-full border border-border" />
                )}
                <span className={isCurrent ? "text-primary" : ""}>
                  {step.instruction}
                </span>
              </div>

              {isCurrent && (
                <div className="mt-2 ml-7 space-y-2">
                  {showHint ? (
                    <div className="text-sm text-muted-foreground">
                      💡 {step.hint}
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowHint(true)}
                      className="text-sm text-primary hover:text-primary/80 flex items-center gap-1"
                    >
                      <HelpCircle className="w-4 h-4" />
                      Need help?
                    </button>
                  )}
                  <button
                    onClick={() => onCommand(step.expectedCommand)}
                    className="text-sm text-primary hover:text-primary/80"
                  >
                    Run suggested command
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {completedSteps.size === tutorial.steps.length && (
        <div className="mt-4 p-4 bg-primary/10 border border-primary/20 rounded-lg">
          <h3 className="font-semibold text-primary">🎉 Tutorial Completed!</h3>
          <p className="text-sm text-muted-foreground mt-1">
            You&apos;ve successfully completed all steps in this tutorial.
          </p>
        </div>
      )}
    </div>
  );
}
