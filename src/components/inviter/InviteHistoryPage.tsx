/**
 * Invite History Page
 * Browse, search, and export invite history
 */

import { useState, useEffect, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  History,
  Search,
  Filter,
  Download,
  Trash2,
  Loader2,
  CheckCircle,
  XCircle,
  SkipForward,
  Clock,
  Users,
  TrendingUp,
  Info,
} from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/utils/tailwind";
import { toast } from "sonner";

type InviteStatus = "success" | "skipped" | "error";

interface HistoryEntry {
  id: string;
  result: InviteStatus;
  userId: string;
  displayName: string;
  message: string;
  timestamp: number;
}

interface HistoryStats {
  total: number;
  successful: number;
  skipped: number;
  errors: number;
  lastInviteAt?: number;
}

const PAGE_SIZE = 50;

function formatDateTime(timestamp: number, locale: string): string {
  const date = new Date(timestamp);
  // Use locale-aware formatting
  return date.toLocaleString(locale === "pl" ? "pl-PL" : "en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatRelativeTime(
  timestamp: number,
  t: (key: string, options?: Record<string, unknown>) => string
): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return t("timeJustNow");
  if (minutes < 60) return t("timeMinutesAgo", { count: minutes });
  if (hours < 24) return t("timeHoursAgo", { count: hours });
  return t("timeDaysAgo", { count: days });
}

function getStatusIcon(status: InviteStatus) {
  switch (status) {
    case "success":
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case "skipped":
      return <SkipForward className="h-4 w-4 text-yellow-500" />;
    case "error":
      return <XCircle className="h-4 w-4 text-red-500" />;
  }
}

function getStatusColor(status: InviteStatus): string {
  switch (status) {
    case "success":
      return "text-green-500";
    case "skipped":
      return "text-yellow-500";
    case "error":
      return "text-red-500";
  }
}

function getStatusTranslationKey(status: InviteStatus): string {
  switch (status) {
    case "success":
      return "historyStatusSuccess";
    case "skipped":
      return "historyStatusSkipped";
    case "error":
      return "historyStatusError";
  }
}

export function InviteHistoryPage({ className }: { className?: string }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [stats, setStats] = useState<HistoryStats | null>(null);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<InviteStatus | "all">("all");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Load stats
  const loadStats = useCallback(async () => {
    try {
      const statsData = await window.vrchatAPI.getHistoryStats();
      setStats(statsData);
    } catch (error) {
      console.error("Failed to load stats:", error);
    }
  }, []);

  // Load history
  const loadHistory = useCallback(
    async (reset = true) => {
      try {
        if (reset) {
          setLoading(true);
        } else {
          setLoadingMore(true);
        }

        const offset = reset ? 0 : entries.length;
        const response = await window.vrchatAPI.getHistory({
          limit: PAGE_SIZE,
          offset,
          search: debouncedSearch || undefined,
          status: statusFilter === "all" ? undefined : statusFilter,
        });

        if (reset) {
          setEntries(response.entries);
        } else {
          setEntries((prev) => [...prev, ...response.entries]);
        }
        setTotal(response.total);
        setHasMore(response.hasMore);
      } catch (error) {
        console.error("Failed to load history:", error);
        toast.error(t("msgError", { error: String(error) }));
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [debouncedSearch, statusFilter, entries.length, t]
  );

  // Initial load - reset entries when filters change
  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    loadHistory(true);
  }, [debouncedSearch, statusFilter]); // loadHistory changes when these change via deps

  // Export to CSV
  const handleExport = async () => {
    setExporting(true);
    try {
      const result = await window.vrchatAPI.exportHistoryCSV();
      if (result.success && result.path) {
        toast.success(t("historyExportSuccess", { path: result.path }));
      } else if (!result.success && !result.error) {
        toast.info(t("historyExportCancelled"));
      } else {
        toast.error(t("historyExportFailed", { error: result.error }));
      }
    } catch (error) {
      toast.error(t("historyExportFailed", { error: String(error) }));
    } finally {
      setExporting(false);
    }
  };

  // Clear history
  const handleClear = async () => {
    setClearing(true);
    try {
      await window.vrchatAPI.clearHistory();
      setEntries([]);
      setTotal(0);
      setHasMore(false);
      await loadStats();
      toast.success(t("historyClearSuccess"));
    } catch (error) {
      toast.error(t("msgError", { error: String(error) }));
    } finally {
      setClearing(false);
      setShowClearDialog(false);
    }
  };

  // Calculate success rate
  const successRate = useMemo(() => {
    if (!stats || stats.total === 0) return 0;
    return Math.round((stats.successful / stats.total) * 100);
  }, [stats]);

  return (
    <div className={cn("flex h-full flex-col overflow-hidden p-4", className)}>
      {/* Header with Stats */}
      <div className="mb-4 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <History className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-xl font-bold">{t("historyTitle")}</h1>
              <p className="text-muted-foreground text-sm">{t("historyDescription")}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={exporting || total === 0}
            >
              {exporting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              {exporting ? t("historyExporting") : t("historyExport")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowClearDialog(true)}
              disabled={clearing || total === 0}
              className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
            >
              {clearing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              {clearing ? t("historyClearing") : t("historyClear")}
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-card flex items-center gap-3 rounded-lg border p-3">
              <Users className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-muted-foreground text-xs">{t("historyStatsTotal")}</p>
                <p className="text-lg font-bold tabular-nums">{stats.total}</p>
              </div>
            </div>
            <div className="bg-card flex items-center gap-3 rounded-lg border p-3">
              <TrendingUp className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-muted-foreground text-xs">{t("historyStatsSuccessRate")}</p>
                <p className="text-lg font-bold tabular-nums">{successRate}%</p>
              </div>
            </div>
            <div className="bg-card flex items-center gap-3 rounded-lg border p-3">
              <Clock className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-muted-foreground text-xs">{t("historyStatsLastInvite")}</p>
                <p className="text-lg font-bold tabular-nums">
                  {stats.lastInviteAt ? formatRelativeTime(stats.lastInviteAt, t) : t("historyStatsNever")}
                </p>
              </div>
            </div>
            <div className="bg-card flex items-center gap-3 rounded-lg border p-3">
              <Info className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground text-xs">{t("historyRetention")}</p>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
            <Input
              placeholder={t("historySearch")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as InviteStatus | "all")}
          >
            <SelectTrigger className="w-[150px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("historyFilterAll")}</SelectItem>
              <SelectItem value="success">{t("historyFilterSuccess")}</SelectItem>
              <SelectItem value="skipped">{t("historyFilterSkipped")}</SelectItem>
              <SelectItem value="error">{t("historyFilterError")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* History Table */}
      <div className="flex min-h-0 flex-1 flex-col rounded-lg border">
        {/* Table Header */}
        <div className="bg-muted/50 grid grid-cols-[120px_1fr_100px_1fr] gap-4 border-b px-4 py-2 text-xs font-medium">
          <div>{t("historyColumnTime")}</div>
          <div>{t("historyColumnUser")}</div>
          <div>{t("historyColumnStatus")}</div>
          <div>{t("historyColumnMessage")}</div>
        </div>

        {/* Table Body */}
        <ScrollArea className="min-h-0 flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <History className="mb-4 h-12 w-12 text-muted-foreground/50" />
              <h3 className="text-lg font-medium">{t("historyEmpty")}</h3>
              <p className="text-muted-foreground text-sm">{t("historyEmptyDescription")}</p>
            </div>
          ) : (
            <div className="divide-y">
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  className="hover:bg-muted/50 grid grid-cols-[120px_1fr_100px_1fr] gap-4 px-4 py-3 text-sm transition-colors"
                >
                  <div className="text-muted-foreground tabular-nums">
                    {formatDateTime(entry.timestamp, locale)}
                  </div>
                  <div className="truncate font-medium" title={entry.userId}>
                    {entry.displayName}
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(entry.result)}
                    <span className={getStatusColor(entry.result)}>
                      {t(getStatusTranslationKey(entry.result))}
                    </span>
                  </div>
                  <div className="text-muted-foreground truncate" title={entry.message}>
                    {entry.message}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Load More */}
        {hasMore && !loading && (
          <div className="border-t p-3 text-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => loadHistory(false)}
              disabled={loadingMore}
            >
              {loadingMore ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {loadingMore ? t("loading") : t("historyLoadMore")}
            </Button>
          </div>
        )}

        {/* No more results */}
        {!hasMore && entries.length > 0 && !loading && (
          <div className="text-muted-foreground border-t p-3 text-center text-sm">
            {t("historyNoMore")} ({total} {t("historyStatsTotal").toLowerCase()})
          </div>
        )}
      </div>

      {/* Clear Confirmation Dialog */}
      <Dialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("historyClearTitle")}</DialogTitle>
            <DialogDescription>{t("historyClearConfirm")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowClearDialog(false)}>
              {t("historyClearNo")}
            </Button>
            <Button variant="destructive" onClick={handleClear} disabled={clearing}>
              {clearing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("historyClearYes")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
