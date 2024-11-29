"use client";

import dynamic from "next/dynamic";
import { useThemeDetector } from "@/hooks/useThemeDetector";

const Terminal = dynamic(() => import("@/components/Terminal"), {
  ssr: false,
  loading: () => {
    const isDark = useThemeDetector();
    return (
      <div
        className={`w-full h-full flex items-center justify-center ${
          isDark ? "bg-[#1a1b26] text-white" : "bg-white text-black"
        }`}
      >
        Loading terminal...
      </div>
    );
  },
});

export default function TerminalWrapper() {
  return <Terminal />;
}
