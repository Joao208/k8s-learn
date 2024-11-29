import TerminalWrapper from "@/components/TerminalWrapper";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function Home() {
  return (
    <main className="flex h-screen w-screen">
      <div className="fixed top-4 right-4 z-10">
        <ThemeToggle />
      </div>

      <TerminalWrapper />
    </main>
  );
}
