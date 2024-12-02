"use client";

import dynamic from "next/dynamic";

const LoadingComponent = () => (
  <div className="w-full h-full flex items-center justify-center bg-background text-foreground">
    Loading terminal...
  </div>
);

const Terminal = dynamic(() => import("@/components/Terminal"), {
  ssr: false,
  loading: LoadingComponent,
});

export default function TerminalWrapper() {
  return <Terminal />;
}
