"use client";

import { useEffect, useRef, useState } from "react";
import { KubernetesService } from "@/services/kubernetes";
import CommandInput from "./CommandInput";
import { getCookie } from "cookies-next";
import Tutorial from "./Tutorial";
import { tutorials } from "@/lib/tutorials";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Copy,
  CopyCheck,
  Terminal as TerminalIcon,
  Download,
  EllipsisVertical,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

interface CommandOutput {
  command: string;
  output: string;
}

function Terminal() {
  const outputRef = useRef<HTMLDivElement>(null);
  const kubernetesService = KubernetesService.getInstance();
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [outputs, setOutputs] = useState<CommandOutput[]>([]);
  const [currentCommand, setCurrentCommand] = useState<string>("");
  const hasInitialized = useRef(false);
  const [cluster, setCluster] = useState<string>("");
  const [isWatching, setIsWatching] = useState(false);
  const watchIntervalRef = useRef<NodeJS.Timeout>();
  const [selectedTutorial, setSelectedTutorial] = useState(tutorials[0]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const sandboxId = getCookie("sandboxId") as string;
    if (sandboxId) {
      setCluster(sandboxId);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (watchIntervalRef.current) {
        clearInterval(watchIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const welcomeMessage = [
      "Welcome to Kubernetes Terminal! 🚀",
      "Creating your Kubernetes sandbox...",
      "(This might take a few seconds, please wait)",
    ].join("\n");

    setOutputs([{ command: "", output: welcomeMessage }]);

    kubernetesService
      .createSandbox()
      .then(() => {
        const sandboxId = getCookie("sandboxId") as string;
        if (sandboxId) {
          setCluster(sandboxId);
        }

        const helpMessage = [
          "Sandbox created successfully! You have 1 hour to use this environment.",
          "",
          "Available commands:",
          "- You can use 'k' as a shortcut for 'kubectl'",
          "- 'kubectl' prefix is optional (e.g., 'get pods' works the same as 'kubectl get pods')",
          "- Common commands: get pods, get services, describe pod [name], etc.",
          "- For Ingress configuration, use the machine IP: 45.55.124.130",
          "- Clear screen: 'clear', 'cls' or Ctrl+L (Cmd+L on Mac)",
          "- Copy/Paste: Ctrl+C/Ctrl+V (Cmd+C/Cmd+V on Mac) to copy/paste",
          "- History: Up/Down arrows to navigate through command history",
          "- Help: 'help' or 'tutorial' to see basic commands",
        ].join("\n");

        setOutputs((prev) => [...prev, { command: "", output: helpMessage }]);
      })
      .catch((error) => {
        setOutputs((prev) => [
          ...prev,
          { command: "", output: `Error creating sandbox: ${error.message}` },
        ]);
      });

    return () => {
      kubernetesService.deleteSandbox().catch(console.error);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCommand = async (command: string) => {
    try {
      setCurrentCommand(command);
      const commands = command
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith("#"));

      for (const cmd of commands) {
        if (cmd) {
          setCommandHistory((prev) => [...prev, cmd]);
          setHistoryIndex((prev) => prev + 1);
        }

        if (cmd === "clear" || cmd === "cls") {
          setOutputs([]);
          continue;
        }

        if (cmd === "help" || cmd === "tutorial") {
          const helpMessage = [
            "🎓 Kubernetes Basic Tutorial",
            "",
            "1. Check available nodes:",
            "   $ kubectl get nodes",
            "",
            "2. Create a deployment:",
            "   $ kubectl create deployment nginx --image=nginx",
            "",
            "3. Check pods status:",
            "   $ kubectl get pods",
            "   $ watch kubectl get pods  (Ctrl+C to stop)",
            "",
            "4. Expose deployment:",
            "   $ kubectl expose deployment nginx --port=80 --type=LoadBalancer",
            "",
            "5. Check service status:",
            "   $ kubectl get services",
            "   $ watch kubectl get services  (Ctrl+C to stop)",
            "",
            "6. Scale deployment:",
            "   $ kubectl scale deployment nginx --replicas=3",
            "",
            "7. Delete resources:",
            "   $ kubectl delete deployment nginx",
            "   $ kubectl delete service nginx",
          ].join("\n");
          setOutputs((prev) => [
            ...prev,
            { command: cmd, output: helpMessage },
          ]);
          continue;
        }

        if (cmd.startsWith("watch ")) {
          const watchCommand = cmd.slice(6);
          setIsWatching(true);

          const executeWatch = async () => {
            try {
              let normalizedCommand = watchCommand;
              if (normalizedCommand.startsWith("kubectl ")) {
                normalizedCommand = normalizedCommand.slice(7);
              } else if (normalizedCommand.startsWith("k ")) {
                normalizedCommand = normalizedCommand.slice(2);
              }

              const output = await kubernetesService.executeCommand(
                normalizedCommand
              );
              setOutputs((prev) => {
                const filtered = prev.filter((o) => o.command !== cmd);
                return [
                  ...filtered,
                  {
                    command: cmd,
                    output: `Every 2s: ${watchCommand}\n\n${output}`,
                  },
                ];
              });
            } catch (error) {
              setOutputs((prev) => [
                ...prev,
                {
                  command: cmd,
                  output: `Error: ${
                    error instanceof Error ? error.message : "Unknown error"
                  }`,
                },
              ]);

              if (watchIntervalRef.current) {
                clearInterval(watchIntervalRef.current);
                setIsWatching(false);
              }
            }
          };

          await executeWatch();
          watchIntervalRef.current = setInterval(executeWatch, 2000);
          continue;
        }

        if (cmd === "\x03" && isWatching) {
          if (watchIntervalRef.current) {
            clearInterval(watchIntervalRef.current);
          }
          setIsWatching(false);
          setOutputs((prev) => [...prev, { command: "", output: "^C" }]);
          continue;
        }

        let normalizedCommand = cmd;
        if (normalizedCommand.startsWith("kubectl ")) {
          normalizedCommand = normalizedCommand.slice(7);
        } else if (normalizedCommand.startsWith("k ")) {
          normalizedCommand = normalizedCommand.slice(2);
        }

        const output = await kubernetesService.executeCommand(
          normalizedCommand
        );
        if (output.trim() === "" && normalizedCommand.startsWith("get ")) {
          setOutputs((prev) => [
            ...prev,
            { command: cmd, output: "No resources found" },
          ]);
        } else {
          setOutputs((prev) => [...prev, { command: cmd, output }]);
        }
      }
    } catch (error) {
      setOutputs((prev) => [
        ...prev,
        {
          command: command,
          output: `Error: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        },
      ]);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1000);
  };

  return (
    <div className="flex flex-col w-full h-screen">
      <div className="flex items-center gap-2 p-2 border-t border-white/10 justify-between">
        <div className="flex items-center gap-2">
          {tutorials.map((tutorial) => (
            <button
              key={tutorial.id}
              onClick={() => setSelectedTutorial(tutorial)}
              className={`px-3 py-1 rounded text-sm ${
                selectedTutorial.id === tutorial.id
                  ? "bg-white/10"
                  : "hover:bg-white/5"
              }`}
            >
              {tutorial.title}
            </button>
          ))}
        </div>

        <ThemeToggle />
      </div>
      <div className="flex-1 min-h-0 border-t border-white/10">
        <div
          className="w-full h-full p-4 overflow-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-background [&::-webkit-scrollbar-thumb]:bg-accent hover:[&::-webkit-scrollbar-thumb]:bg-accent/80"
          ref={outputRef}
        >
          <Tutorial
            tutorial={selectedTutorial}
            onCommand={handleCommand}
            lastOutput={outputs[outputs.length - 1]?.output || ""}
          />
          {outputs.map((output, index) => (
            <div
              key={index}
              className="group mb-4 last:mb-0 pb-4 border-b border-white/10 last:border-0 relative"
            >
              {output.command && (
                <div className="mb-1 font-mono flex items-center justify-between">
                  <div>
                    <span className="text-pink-500">~</span>{" "}
                    {cluster && (
                      <span className="text-cyan-500">{cluster}</span>
                    )}{" "}
                    <span className="text-white font-['Geist Mono'] font-medium">
                      $ {output.command}
                    </span>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="p-1 hover:bg-white/10 rounded">
                        <EllipsisVertical className="w-4 h-4" />
                      </div>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem
                        onClick={() => handleCopy(output.command)}
                      >
                        {copied ? (
                          <CopyCheck className="w-4 h-4 mr-2" />
                        ) : (
                          <Copy className="w-4 h-4 mr-2" />
                        )}
                        Copy Command
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleCopy(output.output)}
                      >
                        <TerminalIcon className="w-4 h-4 mr-2" />
                        Copy Output
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          handleCopy(`${output.command}\n${output.output}`)
                        }
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Copy Block
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
              <pre
                className={`whitespace-pre-wrap font-mono text-sm ${
                  output.output.startsWith("Error:") ||
                  output.output.includes("error")
                    ? "bg-red-950/30 p-2 rounded"
                    : ""
                }`}
              >
                {output.output}
              </pre>
            </div>
          ))}
          {currentCommand.split("\n").map(
            (line: string, index) =>
              line.startsWith("#") && (
                <div
                  key={`comment-${index}`}
                  className="text-muted-foreground mb-4 last:mb-0"
                >
                  {line}
                </div>
              )
          )}
        </div>
      </div>
      <CommandInput
        onExecute={handleCommand}
        commandHistory={commandHistory}
        historyIndex={historyIndex}
        onHistoryChange={setHistoryIndex}
      />
    </div>
  );
}
export default Terminal;
