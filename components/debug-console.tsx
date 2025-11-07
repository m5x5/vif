"use client";

import { useState, useEffect, useRef } from "react";
import { Bug, X, Trash, FunnelSimple, Pause, Play, Copy, Check } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface LogEntry {
  id: string;
  type: "log" | "error" | "warn" | "info";
  message: string;
  timestamp: string;
  args: any[];
}

type LogFilter = "all" | "log" | "error" | "warn" | "info";

interface DebugConsoleProps {
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  showFloatingButton?: boolean;
}

export function DebugConsole({
  isOpen: externalIsOpen,
  onOpenChange,
  showFloatingButton = false
}: DebugConsoleProps = {}) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);

  // Use external control if provided, otherwise use internal state
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;
  const setIsOpen = onOpenChange || setInternalIsOpen;
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState<LogFilter>("all");
  const [isPaused, setIsPaused] = useState(false);
  const [copied, setCopied] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const isInterceptingRef = useRef(false);
  const isPausedRef = useRef(false);
  const pausedLogsQueueRef = useRef<LogEntry[]>([]);

  // Scroll to bottom when new logs arrive
  const scrollToBottom = () => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (!isPaused) {
      scrollToBottom();
    }
  }, [logs, isPaused]);

  // Load logs from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("debug-console-logs");
      if (saved) {
        setLogs(JSON.parse(saved));
      }
    } catch (e) {
      console.error("Failed to load debug logs:", e);
    }
  }, []);

  // Intercept console methods
  useEffect(() => {
    if (isInterceptingRef.current) return;
    isInterceptingRef.current = true;

    const originalConsole = {
      log: console.log,
      error: console.error,
      warn: console.warn,
      info: console.info,
    };

    const createInterceptor = (
      type: "log" | "error" | "warn" | "info",
      original: (...args: any[]) => void
    ) => {
      return (...args: any[]) => {
        // Call original console method
        original.apply(console, args);

        // Create log entry
        const entry: LogEntry = {
          id: `${Date.now()}-${Math.random()}`,
          type,
          message: args
            .map((arg) => {
              if (typeof arg === "object") {
                try {
                  return JSON.stringify(arg, null, 2);
                } catch {
                  return String(arg);
                }
              }
              return String(arg);
            })
            .join(" "),
          timestamp: new Date().toISOString(),
          args,
        };

        // Update state (only if not paused)
        // Use queueMicrotask to defer state update and avoid setState during render
        queueMicrotask(() => {
          setLogs((prev) => {
            // If paused, queue the log for later
            if (isPausedRef.current) {
              pausedLogsQueueRef.current.push(entry);
              return prev;
            }

            const newLogs = [...prev, entry];
            // Keep only last 100 logs to prevent memory issues
            const trimmed = newLogs.slice(-100);

            // Persist to localStorage
            try {
              localStorage.setItem("debug-console-logs", JSON.stringify(trimmed));
            } catch (e) {
              // If localStorage is full, clear old logs
            try {
              localStorage.setItem("debug-console-logs", JSON.stringify([entry]));
              return [entry];
            } catch {}
          }

          return trimmed;
          });
        });
      };
    };

    // Override console methods
    console.log = createInterceptor("log", originalConsole.log);
    console.error = createInterceptor("error", originalConsole.error);
    console.warn = createInterceptor("warn", originalConsole.warn);
    console.info = createInterceptor("info", originalConsole.info);

    // Cleanup on unmount
    return () => {
      console.log = originalConsole.log;
      console.error = originalConsole.error;
      console.warn = originalConsole.warn;
      console.info = originalConsole.info;
    };
  }, []);

  const clearLogs = () => {
    setLogs([]);
    localStorage.removeItem("debug-console-logs");
  };

  const togglePause = () => {
    if (isPaused) {
      // Resume: add queued logs to the display
      if (pausedLogsQueueRef.current.length > 0) {
        setLogs((prev) => {
          const newLogs = [...prev, ...pausedLogsQueueRef.current];
          const trimmed = newLogs.slice(-100);

          try {
            localStorage.setItem("debug-console-logs", JSON.stringify(trimmed));
          } catch (e) {
            // Handle storage errors
          }

          return trimmed;
        });
        pausedLogsQueueRef.current = [];
      }
      isPausedRef.current = false;
      setIsPaused(false);
    } else {
      // Pause
      isPausedRef.current = true;
      setIsPaused(true);
    }
  };

  const copyLogs = async () => {
    const logsText = filteredLogs
      .map((log) => {
        const time = formatTime(log.timestamp);
        return `[${time}] [${log.type.toUpperCase()}] ${log.message}`;
      })
      .join("\n");

    try {
      await navigator.clipboard.writeText(logsText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy logs:", error);
    }
  };

  const filteredLogs = filter === "all"
    ? logs
    : logs.filter((log) => log.type === filter);

  const getLogColor = (type: LogEntry["type"]) => {
    switch (type) {
      case "error":
        return "text-red-500";
      case "warn":
        return "text-yellow-500";
      case "info":
        return "text-blue-500";
      default:
        return "text-foreground";
    }
  };

  const getLogBadge = (type: LogEntry["type"]) => {
    const colors = {
      error: "bg-red-500/10 text-red-500 border-red-500/20",
      warn: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
      info: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      log: "bg-muted text-muted-foreground border-border",
    };
    return colors[type];
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      fractionalSecondDigits: 3,
    });
  };

  const filterOptions: { value: LogFilter; label: string; count: number }[] = [
    { value: "all", label: "All", count: logs.length },
    { value: "log", label: "Logs", count: logs.filter((l) => l.type === "log").length },
    { value: "error", label: "Errors", count: logs.filter((l) => l.type === "error").length },
    { value: "warn", label: "Warnings", count: logs.filter((l) => l.type === "warn").length },
    { value: "info", label: "Info", count: logs.filter((l) => l.type === "info").length },
  ];

  return (
    <>
      {/* Floating debug button - positioned for easy thumb access on mobile */}
      {showFloatingButton && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-4 right-4 z-50 p-3 bg-purple-500 hover:bg-purple-600 text-white rounded-full shadow-lg transition-all hover:scale-110 active:scale-95"
          aria-label="Open debug console"
        >
          <Bug size={24} weight="bold" />
          {logs.filter((l) => l.type === "error").length > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-xs font-bold">
              {logs.filter((l) => l.type === "error").length}
            </span>
          )}
        </button>
      )}

      <Drawer open={isOpen} onOpenChange={setIsOpen}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader className="border-b">
            <div className="flex items-center justify-between">
              <DrawerTitle className="flex items-center gap-2">
                <Bug size={20} weight="bold" />
                Debug Console
                <span className="text-xs text-muted-foreground font-normal">
                  ({filteredLogs.length} {filteredLogs.length === 1 ? "log" : "logs"})
                </span>
              </DrawerTitle>
              <div className="flex items-center gap-2 flex-wrap">
                {/* Pause/Resume button */}
                <Button
                  variant={isPaused ? "default" : "outline"}
                  size="sm"
                  onClick={togglePause}
                  className="gap-2"
                >
                  {isPaused ? (
                    <>
                      <Play size={16} weight="fill" />
                      Resume
                      {pausedLogsQueueRef.current.length > 0 && (
                        <span className="ml-1 text-xs opacity-70">
                          (+{pausedLogsQueueRef.current.length})
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      <Pause size={16} weight="fill" />
                      Pause
                    </>
                  )}
                </Button>

                {/* Copy button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyLogs}
                  disabled={filteredLogs.length === 0}
                  className="gap-2"
                >
                  {copied ? (
                    <>
                      <Check size={16} weight="bold" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy size={16} />
                      Copy
                    </>
                  )}
                </Button>

                {/* Filter dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      <FunnelSimple size={16} />
                      <span className="hidden sm:inline">
                        {filter === "all" ? "All" : filter.charAt(0).toUpperCase() + filter.slice(1)}
                      </span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {filterOptions.map((option) => (
                      <DropdownMenuItem
                        key={option.value}
                        onClick={() => setFilter(option.value)}
                        className="flex items-center justify-between gap-4"
                      >
                        <span>{option.label}</span>
                        <span className="text-xs text-muted-foreground">
                          {option.count}
                        </span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Clear button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearLogs}
                  className="gap-2"
                >
                  <Trash size={16} />
                  <span className="hidden sm:inline">Clear</span>
                </Button>

                {/* Close button */}
                <DrawerClose asChild>
                  <Button variant="ghost" size="sm">
                    <X size={20} />
                  </Button>
                </DrawerClose>
              </div>
            </div>
          </DrawerHeader>

          {/* Logs container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2 font-mono text-xs">
            {filteredLogs.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                No logs to display
                {filter !== "all" && (
                  <div className="text-xs mt-2">
                    Try changing the filter or clearing it
                  </div>
                )}
              </div>
            ) : (
              filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 rounded-lg bg-muted/50 border"
                >
                  <div className="flex items-start gap-2 mb-1">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${getLogBadge(
                        log.type
                      )}`}
                    >
                      {log.type.toUpperCase()}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {formatTime(log.timestamp)}
                    </span>
                  </div>
                  <div className={`whitespace-pre-wrap break-words ${getLogColor(log.type)}`}>
                    {log.message}
                  </div>
                </div>
              ))
            )}
            <div ref={logsEndRef} />
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
