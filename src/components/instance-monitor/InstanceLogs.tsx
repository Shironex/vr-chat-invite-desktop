/**
 * Instance Logs
 * Live log viewer with filtering for instance events
 */

import { useState, useEffect, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Terminal, Search, Filter, ArrowDown } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/utils/tailwind";

type InstanceLogType = "world" | "join" | "leave" | "system";

interface InstanceLogEntry {
  type: InstanceLogType;
  message: string;
  timestamp: number;
  userId?: string;
  displayName?: string;
  worldName?: string;
  i18nKey?: string;
  i18nParams?: Record<string, string | number>;
}

interface InstanceLogsProps {
  logs: InstanceLogEntry[];
  maxLogs?: number;
  className?: string;
}

const LOG_COLORS: Record<InstanceLogType, string> = {
  world: "#58a6ff", // blue
  join: "#3fb950", // green
  leave: "#f85149", // red
  system: "#8b949e", // gray
};

const LOG_EMOJIS: Record<InstanceLogType, string> = {
  world: "\u{1F30D}", // globe
  join: "\u{1F44B}", // wave
  leave: "\u{1F44B}", // wave (same but with red color)
  system: "\u2699\uFE0F", // gear
};

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function getLogMessage(
  entry: InstanceLogEntry,
  t: (key: string, params?: Record<string, string | number>) => string
): string {
  // Use translation if i18nKey is provided
  if (entry.i18nKey) {
    return t(entry.i18nKey, entry.i18nParams);
  }
  return entry.message;
}

export function InstanceLogs({ logs, maxLogs = 500, className }: InstanceLogsProps) {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<InstanceLogType | "all">("all");
  const [search, setSearch] = useState("");
  const [autoScroll, setAutoScroll] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Filter and search logs
  const filteredLogs = useMemo(() => {
    let result = logs.slice(-maxLogs);

    if (filter !== "all") {
      result = result.filter((log) => log.type === filter);
    }

    if (search.trim()) {
      const searchLower = search.toLowerCase();
      result = result.filter(
        (log) =>
          log.message.toLowerCase().includes(searchLower) ||
          log.displayName?.toLowerCase().includes(searchLower) ||
          log.userId?.toLowerCase().includes(searchLower) ||
          log.worldName?.toLowerCase().includes(searchLower)
      );
    }

    return result;
  }, [logs, filter, search, maxLogs]);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      const scrollElement = scrollRef.current.querySelector("[data-radix-scroll-area-viewport]");
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [filteredLogs, autoScroll]);

  // Detect manual scroll
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const isAtBottom = target.scrollHeight - target.scrollTop - target.clientHeight < 50;
    setAutoScroll(isAtBottom);
  };

  return (
    <div className={cn("flex min-h-0 flex-col rounded-lg border", className)}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b px-2 sm:px-3 py-2">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 shrink-0" />
          <span className="text-sm font-medium">{t("instanceLogTitle")}</span>
          <span className="text-muted-foreground text-xs">({logs.length})</span>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          {/* Filter */}
          <Select value={filter} onValueChange={(v) => setFilter(v as InstanceLogType | "all")}>
            <SelectTrigger className="h-8 w-[100px] sm:w-[130px]">
              <Filter className="mr-1 h-3 w-3 shrink-0" />
              <SelectValue placeholder={t("instanceLogFilterAll")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("instanceLogFilterAll")}</SelectItem>
              <SelectItem value="join">{t("instanceLogFilterJoin")}</SelectItem>
              <SelectItem value="leave">{t("instanceLogFilterLeave")}</SelectItem>
              <SelectItem value="world">{t("instanceLogFilterWorld")}</SelectItem>
              <SelectItem value="system">{t("instanceLogFilterSystem")}</SelectItem>
            </SelectContent>
          </Select>

          {/* Search */}
          <div className="relative">
            <Search className="text-muted-foreground absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2" />
            <Input
              placeholder={t("logSearchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 w-[100px] sm:w-[150px] pl-7"
            />
          </div>

          {/* Auto-scroll indicator */}
          <Button
            variant={autoScroll ? "default" : "outline"}
            size="sm"
            className="h-8 px-2"
            onClick={() => setAutoScroll(!autoScroll)}
            title={autoScroll ? "Auto-scroll on" : "Auto-scroll off"}
          >
            <ArrowDown className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Log Content */}
      <ScrollArea
        ref={scrollRef}
        className="min-h-0 flex-1"
        onScrollCapture={handleScroll as unknown as React.UIEventHandler<HTMLDivElement>}
      >
        <div className="space-y-0.5 p-3 font-mono text-xs">
          {filteredLogs.length === 0 ? (
            <p className="text-muted-foreground italic">
              {logs.length === 0 ? t("instanceLogNoActivity") : t("logNoMatch")}
            </p>
          ) : (
            filteredLogs.map((entry, index) => (
              <div
                key={`${entry.timestamp}-${index}`}
                className="flex items-start gap-2"
                style={{ color: LOG_COLORS[entry.type] }}
              >
                <span className="text-muted-foreground shrink-0">
                  {formatTime(entry.timestamp)}
                </span>
                <span className="shrink-0">{LOG_EMOJIS[entry.type]}</span>
                <span className="break-all">{getLogMessage(entry, t)}</span>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
