"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

const Terminal = dynamic(() => import("@/components/Terminal"), {
  ssr: false,
});

export default function TerminalWrapper() {
  const [shouldLoadTerminal, setShouldLoadTerminal] = useState(false);

  if (!shouldLoadTerminal) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-background text-foreground">
        <button
          onClick={() => setShouldLoadTerminal(true)}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          Create Sandbox
        </button>
      </div>
    );
  }

  return <Terminal />;
}
