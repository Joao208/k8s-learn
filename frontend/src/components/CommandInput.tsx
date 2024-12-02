"use client";

import Editor, { OnMount, loader } from "@monaco-editor/react";
import { useRef } from "react";
import * as Monaco from "monaco-editor";

loader.config({ monaco: Monaco });

interface CommandInputProps {
  onExecute: (command: string) => void;
  commandHistory: string[];
  historyIndex: number;
  onHistoryChange: (index: number) => void;
}

export default function CommandInput({
  onExecute,
  commandHistory,
  historyIndex,
  onHistoryChange,
}: CommandInputProps) {
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);

  const handleEditorMount: OnMount = (editor) => {
    editorRef.current = editor;

    const suggestions = [
      {
        label: "kubectl",
        insertText: "kubectl ",
        documentation: "Kubernetes command-line tool",
      },
      {
        label: "k",
        insertText: "k ",
        documentation: "Alias for kubectl",
      },
      {
        label: "get",
        insertText: "get ",
        documentation: "Display one or many resources",
      },
      {
        label: "describe",
        insertText: "describe ",
        documentation: "Show details of a specific resource",
      },
      {
        label: "create",
        insertText: "create ",
        documentation: "Create a resource from a file or stdin",
      },
      {
        label: "apply",
        insertText: "apply ",
        documentation: "Apply a configuration to a resource",
      },
      {
        label: "delete",
        insertText: "delete ",
        documentation: "Delete resources",
      },
      { label: "pods", insertText: "pods", documentation: "List all pods" },
      {
        label: "services",
        insertText: "services",
        documentation: "List all services",
      },
      {
        label: "deployments",
        insertText: "deployments",
        documentation: "List all deployments",
      },
      { label: "nodes", insertText: "nodes", documentation: "List all nodes" },
      {
        label: "watch",
        insertText: "watch ",
        documentation: "Watch resources for changes",
      },
      {
        label: "clear",
        insertText: "clear",
        documentation: "Clear the terminal screen",
      },
      { label: "help", insertText: "help", documentation: "Show help message" },
    ];

    Monaco.languages.register({ id: "shell" });

    Monaco.languages.registerCompletionItemProvider("shell", {
      provideCompletionItems: (
        model: Monaco.editor.ITextModel,
        position: Monaco.Position
      ) => {
        const word = model.getWordUntilPosition(position);
        const range: Monaco.IRange = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };

        return {
          suggestions: suggestions.map((s) => ({
            ...s,
            kind: Monaco.languages.CompletionItemKind.Keyword,
            insertTextRules:
              Monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range: range,
          })),
        };
      },
    });

    Monaco.languages.registerInlineCompletionsProvider("shell", {
      provideInlineCompletions: async (
        model: Monaco.editor.ITextModel,
        position: Monaco.Position
      ): Promise<Monaco.languages.InlineCompletions> => {
        const lineContent = model.getLineContent(position.lineNumber);
        const wordUntilPosition = model.getWordUntilPosition(position);

        let bestSuggestion = "";
        if (lineContent.startsWith("kubectl") || lineContent.startsWith("k")) {
          if (lineContent.includes("get")) {
            bestSuggestion = "pods";
          } else if (lineContent.includes("describe")) {
            bestSuggestion = "pod nginx";
          } else if (lineContent.includes("create")) {
            bestSuggestion = "deployment nginx --image=nginx";
          }
        } else if (lineContent.startsWith("watch")) {
          bestSuggestion = "kubectl get pods";
        }

        if (!bestSuggestion) return { items: [] };

        return {
          items: [
            {
              insertText: bestSuggestion,
              range: {
                startLineNumber: position.lineNumber,
                endLineNumber: position.lineNumber,
                startColumn: wordUntilPosition.endColumn,
                endColumn: wordUntilPosition.endColumn,
              },
            },
          ],
        };
      },

      freeInlineCompletions: () => {},
    });

    editor.updateOptions({
      cursorStyle: "block",
      cursorBlinking: "blink",
      lineNumbers: "off",
      glyphMargin: false,
      folding: false,
      lineDecorationsWidth: 0,
      lineNumbersMinChars: 0,
      renderLineHighlight: "none",
      scrollbar: {
        vertical: "hidden",
        horizontal: "hidden",
      },
      overviewRulerBorder: false,
      hideCursorInOverviewRuler: true,
      overviewRulerLanes: 0,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      wordWrap: "on",
      wrappingStrategy: "simple",
      fontSize: 14,
      fontFamily: "'Geist Mono', monospace",
      padding: { top: 12, bottom: 12 },
      fixedOverflowWidgets: true,
      roundedSelection: false,
      renderFinalNewline: "off",
      smoothScrolling: true,
      mouseWheelZoom: false,
      quickSuggestions: {
        other: "on",
        comments: false,
        strings: "on",
      },
      suggestOnTriggerCharacters: true,
      acceptSuggestionOnEnter: "off",
      tabCompletion: "on",
      wordBasedSuggestions: "off",
      suggestSelection: "first",
      inlineSuggest: {
        enabled: true,
        mode: "subwordSmart",
      },
      suggest: {
        showInlineDetails: true,
        preview: true,
        showIcons: true,
        showStatusBar: true,
        filterGraceful: true,
        snippetsPreventQuickSuggestions: false,
        localityBonus: true,
        shareSuggestSelections: true,
        selectionMode: "always",
        insertMode: "insert",
      },
      quickSuggestionsDelay: 0,
    });

    editor.addCommand(Monaco.KeyCode.Enter, () => {
      const value = editor.getValue();
      if (value.trim()) {
        onExecute(value);
        editor.setValue("");
      }
    });

    editor.addCommand(Monaco.KeyMod.Shift | Monaco.KeyCode.Enter, () => {
      editor.trigger("keyboard", "type", { text: "\n" });
    });

    editor.addCommand(Monaco.KeyMod.CtrlCmd | Monaco.KeyCode.Enter, () => {
      const value = editor.getValue();
      if (value.trim()) {
        onExecute(value);
        editor.setValue("");
      }
    });

    editor.addCommand(Monaco.KeyCode.UpArrow, () => {
      if (historyIndex > 0) {
        onHistoryChange(historyIndex - 1);
        editor.setValue(commandHistory[historyIndex - 1]);
        editor.setPosition({ lineNumber: 1, column: 1 });
      }
    });

    editor.addCommand(Monaco.KeyCode.DownArrow, () => {
      if (historyIndex < commandHistory.length) {
        onHistoryChange(historyIndex + 1);
        editor.setValue(
          historyIndex === commandHistory.length
            ? ""
            : commandHistory[historyIndex]
        );
        editor.setPosition({ lineNumber: 1, column: 1 });
      }
    });

    editor.focus();
  };

  return (
    <div className="h-24 border-t border-border bg-background [&_.monaco-editor]:!bg-background [&_.monaco-editor-background]:!bg-background [&_.margin]:!bg-background px-4">
      <Editor
        height="100%"
        defaultLanguage="shell"
        theme="vs-dark"
        loading=""
        className="!bg-background"
        options={{
          readOnly: false,
          contextmenu: false,
          quickSuggestions: false,
          parameterHints: { enabled: false },
          suggestOnTriggerCharacters: false,
          acceptSuggestionOnEnter: "off",
          tabCompletion: "off",
          wordBasedSuggestions: "off",
          links: false,
          renderWhitespace: "none",
          multiCursorModifier: "alt",
          autoClosingBrackets: "never",
          autoClosingQuotes: "never",
          autoSurround: "never",
        }}
        onMount={handleEditorMount}
      />
    </div>
  );
}
