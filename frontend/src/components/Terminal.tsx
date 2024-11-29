"use client";

import { useEffect, useRef } from "react";
import { Terminal as XTerm } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import { KubernetesService } from "@/services/kubernetes";
import { VirtualFileSystem } from "@/services/fileSystem";
import { useThemeDetector } from "@/hooks/useThemeDetector";

const fs = VirtualFileSystem.getInstance();

const Terminal = () => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const commandRef = useRef("");
  const kubernetesService = KubernetesService.getInstance();
  const commandHistoryRef = useRef<string[]>([]);
  const historyIndexRef = useRef(-1);
  const currentLineRef = useRef("");
  const isDark = useThemeDetector();
  const terminalInstance = useRef<XTerm | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !terminalRef.current) return;

    const term = new XTerm({
      cursorBlink: true,
      theme: {
        background: isDark ? "#1a1b26" : "#ffffff",
        foreground: isDark ? "#a9b1d6" : "#000000",
        cursor: isDark ? "#a9b1d6" : "#000000",
        cursorAccent: isDark ? "#1a1b26" : "#ffffff",
      },
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      allowTransparency: true,
      scrollback: 0,
    });

    terminalInstance.current = term;

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalRef.current);

    setTimeout(() => {
      fitAddon.fit();
    }, 100);

    term.attachCustomKeyEventHandler((event) => {
      const isCopyPasteKey = event.ctrlKey || event.metaKey;

      if (event.type === "keydown" && isCopyPasteKey) {
        if (event.key === "c") {
          if (term.hasSelection()) {
            const selection = term.getSelection();
            navigator.clipboard.writeText(selection);
            return false;
          } else {
            term.write("^C");
            term.write("\r\nkubernetes$ ");
            commandRef.current = "";
            return false;
          }
        }
        if (event.key === "v") {
          navigator.clipboard
            .readText()
            .then((text) => {
              if (text) {
                commandRef.current += text;
                term.write(text);
              }
            })
            .catch(console.error);
          return false;
        }
      }
      return true;
    });

    term.write("Welcome to Kubernetes Terminal! 🚀\r\n");
    term.write("Creating your Kubernetes sandbox...\r\n");

    kubernetesService
      .createSandbox()
      .then(() => {
        term.write(
          "Sandbox created successfully! You have 1 hour to use this environment.\r\n"
        );
        term.write(
          "\r\nAvailable commands:\r\n" +
            "- You can use 'k' as a shortcut for 'kubectl'\r\n" +
            "- 'kubectl' prefix is optional (e.g., 'get pods' works the same as 'kubectl get pods')\r\n" +
            "- Common commands: get pods, get services, describe pod [name], etc.\r\n" +
            "- Clear screen: 'clear', 'cls' or Ctrl+L (Cmd+L on Mac)\r\n" +
            "- Copy/Paste: Ctrl+C/Ctrl+V (Cmd+C/Cmd+V on Mac) to copy/paste\r\n" +
            "- History: Up/Down arrows to navigate through command history\r\n" +
            "\r\nFile System Commands:\r\n" +
            "- ls: List files and directories\r\n" +
            "- cd [dir]: Change directory\r\n" +
            "- mkdir [dir]: Create directory\r\n" +
            "- touch [file]: Create empty file\r\n" +
            "- rm [-r] [file/dir]: Remove file or directory\r\n" +
            "- cat [file]: Display file content\r\n" +
            "- echo [text] > [file]: Write text to file\r\n"
        );
        term.write("kubernetes$ ");
      })
      .catch((error) => {
        term.write(`\r\nError creating sandbox: ${error.message}\r\n`);
        term.write("kubernetes$ ");
      });

    const clearCurrentLine = () => {
      const currentCommand = commandRef.current;
      for (let i = 0; i < currentCommand.length; i++) {
        term.write("\b \b");
      }
    };

    const handleCommand = async (command: string) => {
      try {
        const trimmedCommand = command.trim();

        if (
          trimmedCommand &&
          (commandHistoryRef.current.length === 0 ||
            commandHistoryRef.current[commandHistoryRef.current.length - 1] !==
              trimmedCommand)
        ) {
          commandHistoryRef.current.push(trimmedCommand);
        }
        historyIndexRef.current = commandHistoryRef.current.length;

        const [cmd, ...args] = trimmedCommand.split(" ");

        if (cmd === "ls") {
          const files = fs.ls(args[0]);
          files.forEach((file) => term.write("\r\n" + file));
          term.write("\r\nkubernetes$ ");
          return;
        }

        if (cmd === "cd") {
          const newPath = fs.cd(args[0] || "/");
          term.write("\r\nkubernetes [" + newPath + "]$ ");
          return;
        }

        if (cmd === "mkdir") {
          if (!args[0]) {
            term.write("\r\nError: mkdir requires a directory name");
          } else {
            fs.mkdir(args[0]);
            term.write("\r\nDirectory created: " + args[0]);
          }
          term.write("\r\nkubernetes$ ");
          return;
        }

        if (cmd === "touch") {
          if (!args[0]) {
            term.write("\r\nError: touch requires a file name");
          } else {
            fs.touch(args[0]);
            term.write("\r\nFile created: " + args[0]);
          }
          term.write("\r\nkubernetes$ ");
          return;
        }

        if (cmd === "rm") {
          if (!args[0]) {
            term.write("\r\nError: rm requires a file/directory name");
          } else {
            const recursive = args.includes("-r") || args.includes("-rf");
            fs.rm(args[args.length - 1], recursive);
            term.write("\r\nRemoved: " + args[args.length - 1]);
          }
          term.write("\r\nkubernetes$ ");
          return;
        }

        if (cmd === "cat") {
          if (!args[0]) {
            term.write("\r\nError: cat requires a file name");
          } else {
            const content = fs.cat(args[0]);
            term.write("\r\n" + content);
          }
          term.write("\r\nkubernetes$ ");
          return;
        }

        if (cmd === "echo") {
          if (args.length < 2 || args[args.length - 2] !== ">") {
            term.write("\r\n" + args.join(" "));
          } else {
            const content = args.slice(0, -2).join(" ");
            const fileName = args[args.length - 1];
            fs.echo(content, fileName);
            term.write("\r\nContent written to: " + fileName);
          }
          term.write("\r\nkubernetes$ ");
          return;
        }

        if (trimmedCommand === "clear" || trimmedCommand === "cls") {
          term.clear();
          term.write("\x1b[H");
          term.write("kubernetes$ ");
          return;
        }

        let normalizedCommand = trimmedCommand;
        if (normalizedCommand.startsWith("kubectl ")) {
          normalizedCommand = normalizedCommand.slice(7);
        } else if (normalizedCommand.startsWith("k ")) {
          normalizedCommand = normalizedCommand.slice(2);
        }

        const output = await kubernetesService.executeCommand(
          normalizedCommand
        );
        output.split("\n").forEach((line) => {
          term.write("\r\n" + line);
        });
      } catch (error) {
        term.write(
          `\r\nError: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      }
      term.write("\r\nkubernetes$ ");
    };

    term.onKey(({ key, domEvent }) => {
      const ev = domEvent as KeyboardEvent;
      const isCopyPasteKey = ev.ctrlKey || ev.metaKey;

      if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === "l") {
        term.clear();
        term.write("\x1b[H");
        term.write("kubernetes$ ");
        commandRef.current = "";
        return;
      }

      if (isCopyPasteKey && (ev.key === "c" || ev.key === "v")) {
        return;
      }

      if (ev.key === "ArrowUp" || ev.key === "ArrowDown") {
        const history = commandHistoryRef.current;
        if (history.length === 0) return;

        if (historyIndexRef.current === history.length) {
          currentLineRef.current = commandRef.current;
        }

        if (ev.key === "ArrowUp" && historyIndexRef.current > 0) {
          historyIndexRef.current--;
        } else if (
          ev.key === "ArrowDown" &&
          historyIndexRef.current < history.length
        ) {
          historyIndexRef.current++;
        }

        clearCurrentLine();

        if (historyIndexRef.current === history.length) {
          commandRef.current = currentLineRef.current;
        } else {
          commandRef.current = history[historyIndexRef.current];
        }

        term.write(commandRef.current);
        return;
      }

      if (ev.keyCode === 13) {
        const command = commandRef.current;
        if (command.trim()) {
          term.write("\r\n");
          handleCommand(command);
        } else {
          term.write("\r\nkubernetes$ ");
        }
        commandRef.current = "";
      } else if (ev.keyCode === 8) {
        if (commandRef.current.length > 0) {
          commandRef.current = commandRef.current.slice(0, -1);
          term.write("\b \b");
        }
      } else if (key.length === 1) {
        commandRef.current += key;
        term.write(key);
      }
    });

    const handleResize = () => {
      setTimeout(() => {
        fitAddon.fit();
      }, 100);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      kubernetesService.deleteSandbox().catch(console.error);
      term.dispose();
      window.removeEventListener("resize", handleResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!terminalInstance.current) return;

    terminalInstance.current.options.theme = {
      background: isDark ? "#1a1b26" : "#ffffff",
      foreground: isDark ? "#a9b1d6" : "#000000",
      cursor: isDark ? "#a9b1d6" : "#000000",
      cursorAccent: isDark ? "#1a1b26" : "#ffffff",
    };
  }, [isDark]);

  return (
    <div className="w-full h-full">
      <div
        ref={terminalRef}
        className="w-full h-full [&_.xterm-viewport]:!overflow-hidden"
      />
    </div>
  );
};

export default Terminal;
