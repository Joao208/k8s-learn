"use client";

import dynamic from "next/dynamic";

const Terminal = dynamic(() => import("@/components/Terminal"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[400px] bg-[#1a1b26] rounded-lg overflow-hidden flex items-center justify-center text-white">
      Loading terminal...
    </div>
  ),
});

export default function TerminalWrapper() {
  return <Terminal />;
}
