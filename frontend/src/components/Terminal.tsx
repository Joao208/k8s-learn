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
  GithubIcon,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import Link from "next/link";

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
      "",
      "⚠️ Important Security Notice:",
      "- This is a learning environment with isolated sandboxes",
      "- DO NOT use any sensitive information, secrets, or production credentials",
      "- While sandboxes are isolated, they are still shared infrastructure",
      "- All data is automatically deleted after 1 hour",
      "- This is for educational purposes only",
      "",
      "Setting up your Kubernetes sandbox...",
      "(This might take a few seconds if a new sandbox needs to be created)",
    ].join("\n");

    setOutputs([{ command: "", output: welcomeMessage }]);

    const pollQueue = async (retryCount = 0, maxRetries = 30) => {
      try {
        const response = await kubernetesService.createSandbox();
        if (response.queuePosition) {
          if (retryCount >= maxRetries) {
            throw new Error("Queue timeout: Please try again later");
          }

          const queueMessage = [
            "🔄 You are currently in a waiting queue.",
            "",
            `Queue Position: ${response.queuePosition}`,
            "",
            "⚡ Why am I in a queue?",
            "This is an open-source project with limited resources. To ensure a great experience for everyone,",
            "we maintain a maximum of 10 concurrent sandboxes. This helps us keep the service free and stable.",
            "",
            "⏳ What should I do?",
            "Just hang tight! Your sandbox will be automatically created as soon as resources become available.",
            "We'll keep checking every 5 seconds and update you on your position.",
            "",
            "💙 Thank you for your patience and for using our service!",
            "Consider supporting the project on GitHub if you find it useful.",
            "",
            "Checking again in 5 seconds...",
          ].join("\n");

          setOutputs((prev) => [
            ...prev,
            {
              command: "",
              output: queueMessage,
            },
          ]);
          await new Promise((resolve) => setTimeout(resolve, 5000));
          return pollQueue(retryCount + 1);
        }
        return response;
      } catch (error) {
        throw error;
      }
    };

    pollQueue()
      .then((response) => {
        const sandboxId = getCookie("sandboxId") as string;
        if (sandboxId) {
          setCluster(sandboxId);
        }

        const helpMessage = [
          response.message === "Using existing sandbox"
            ? "Connected to your existing sandbox! You can continue where you left off."
            : "Sandbox created successfully! You have 1 hour to use this environment.",
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
        const errorMessage =
          error.status === 429
            ? "A sandbox is already being created for your IP. Please wait a few seconds and try again. If the problem persists, try refreshing the page."
            : `Error creating sandbox: ${error.message}`;

        setOutputs((prev) => [...prev, { command: "", output: errorMessage }]);
      });

    return () => {
      kubernetesService.deleteSandbox().catch(console.error);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [outputs]);

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
                  ? "bg-accent"
                  : "hover:bg-accent/50"
              }`}
            >
              {tutorial.title}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link href="https://github.com/joao208/k8s-learn">
            <GithubIcon className="w-4 h-4" />
          </Link>
        </div>
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
              className="group mb-4 last:mb-0 pb-4 border-b border-border last:border-0 relative"
            >
              {output.command && (
                <div className="mb-1 font-mono flex items-center justify-between">
                  <div>
                    <span className="text-destructive">~</span>{" "}
                    {cluster && <span className="text-primary">{cluster}</span>}{" "}
                    <span className="text-foreground font-['Geist Mono'] font-medium">
                      $ {output.command}
                    </span>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="p-1 hover:bg-accent rounded">
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
                    ? "bg-destructive/10 p-2 rounded"
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
