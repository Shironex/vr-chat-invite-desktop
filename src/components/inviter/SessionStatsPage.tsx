/**
 * Session Statistics Page
 * Display session stats with unique players, peak times, and graphs
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  BarChart3,
  Users,
  Send,
  Clock,
  TrendingUp,
  Trash2,
  Loader2,
  Info,
  Activity,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { ScrollArea } from "@/components/ui/scroll-area";
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

interface TimeBucket {
  startTime: number;
  playerCount: number;
  invitesSent: number;
  invitesSkipped: number;
  invitesError: number;
}

interface SessionData {
  id: string;
  startTime: number;
  endTime?: number;
  isActive: boolean;
  uniquePlayerIds: string[];
  totalPlayersDetected: number;
  totalInvitesSent: number;
  totalInvitesSkipped: number;
  totalInvitesError: number;
  timeBuckets: TimeBucket[];
}

interface PeakHourData {
  hour: number;
  avgPlayers: number;
}

interface SessionStatsResponse {
  sessions: SessionData[];
  activeSession?: SessionData;
  peakHours: PeakHourData[];
}

function formatDuration(startTime: number, endTime?: number): string {
  const end = endTime || Date.now();
  const durationMs = end - startTime;
  const minutes = Math.floor(durationMs / 60000);
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m`;
}

function formatSessionDate(timestamp: number, locale: string): string {
  const date = new Date(timestamp);
  return date.toLocaleString(locale === "pl" ? "pl-PL" : "en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
}

function getPeakHour(peakHours: PeakHourData[]): number | null {
  if (peakHours.length === 0) return null;
  const peak = peakHours.reduce((max, h) => (h.avgPlayers > max.avgPlayers ? h : max), peakHours[0]);
  return peak.avgPlayers > 0 ? peak.hour : null;
}

export function SessionStatsPage({ className }: { className?: string }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;

  const [statsResponse, setStatsResponse] = useState<SessionStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string>("active");

  // Load session stats
  const loadStats = useCallback(async () => {
    try {
      setLoading(true);
      const response = await window.vrchatAPI.getSessionStats({ limit: 20, includeActive: true });
      setStatsResponse(response);
    } catch (error) {
      console.error("Failed to load session stats:", error);
      toast.error(t("msgError", { error: String(error) }));
    } finally {
      setLoading(false);
    }
  }, [t]);

  // Initial load
  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // Listen for real-time updates
  useEffect(() => {
    const unsubscribe = window.vrchatAPI.onSessionStatsUpdated((session) => {
      if (session) {
        setStatsResponse((prev) => {
          if (!prev) return prev;
          return { ...prev, activeSession: session };
        });
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Get the currently selected session
  const selectedSession = useMemo((): SessionData | null => {
    if (!statsResponse) return null;
    if (selectedSessionId === "active") {
      return statsResponse.activeSession || null;
    }
    return statsResponse.sessions.find((s) => s.id === selectedSessionId) || null;
  }, [statsResponse, selectedSessionId]);

  // Prepare chart data for activity over time
  const activityChartData = useMemo(() => {
    if (!selectedSession || selectedSession.timeBuckets.length === 0) return [];
    return selectedSession.timeBuckets.map((bucket) => ({
      time: formatTime(bucket.startTime),
      players: bucket.playerCount,
      invites: bucket.invitesSent + bucket.invitesSkipped + bucket.invitesError,
    }));
  }, [selectedSession]);

  // Prepare chart data for peak hours (bar chart)
  const peakHoursChartData = useMemo(() => {
    if (!statsResponse) return [];
    return statsResponse.peakHours.map((ph) => ({
      hour: `${ph.hour}:00`,
      players: ph.avgPlayers,
    }));
  }, [statsResponse]);

  // Get peak hour for stats card
  const peakHour = useMemo(() => {
    if (!statsResponse) return null;
    return getPeakHour(statsResponse.peakHours);
  }, [statsResponse]);

  // Handle clear
  const handleClear = async () => {
    setClearing(true);
    try {
      await window.vrchatAPI.clearSessionStats();
      await loadStats();
      setSelectedSessionId("active");
      toast.success(t("statsClearSuccess"));
    } catch (error) {
      toast.error(t("msgError", { error: String(error) }));
    } finally {
      setClearing(false);
      setShowClearDialog(false);
    }
  };

  // Check if there are any sessions
  const hasSessions = statsResponse && (statsResponse.activeSession || statsResponse.sessions.length > 0);
  const hasHistory = statsResponse && statsResponse.sessions.length > 0;

  return (
    <div className={cn("flex h-full flex-col overflow-hidden p-4", className)}>
      {/* Header */}
      <div className="mb-4 flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary shrink-0" />
            <div>
              <h1 className="text-lg font-bold">{t("statsTitle")}</h1>
              <p className="text-muted-foreground text-xs hidden sm:block">{t("statsDescription")}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Session Selector */}
            <Select
              value={selectedSessionId}
              onValueChange={setSelectedSessionId}
              disabled={!hasSessions}
            >
              <SelectTrigger className="w-[160px] sm:w-[200px]">
                <Activity className="mr-2 h-4 w-4 shrink-0" />
                <SelectValue placeholder={t("statsSessionSelect")} />
              </SelectTrigger>
              <SelectContent>
                {statsResponse?.activeSession && (
                  <SelectItem value="active">
                    {t("statsActiveSession")} - {formatSessionDate(statsResponse.activeSession.startTime, locale)}
                  </SelectItem>
                )}
                {statsResponse?.sessions.map((session) => (
                  <SelectItem key={session.id} value={session.id}>
                    {formatSessionDate(session.startTime, locale)} ({formatDuration(session.startTime, session.endTime)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowClearDialog(true)}
              disabled={clearing || !hasHistory}
              className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
              title={t("statsClear")}
            >
              {clearing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              <span className="hidden sm:inline ml-2">{t("statsClear")}</span>
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        {selectedSession && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="bg-card flex items-center gap-2 rounded-lg border p-2 sm:p-3">
              <Users className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500 shrink-0" />
              <div className="min-w-0">
                <p className="text-muted-foreground text-[10px] sm:text-xs truncate">{t("statsUniquePlayersCard")}</p>
                <p className="text-base sm:text-lg font-bold tabular-nums">{selectedSession.uniquePlayerIds.length}</p>
              </div>
            </div>
            <div className="bg-card flex items-center gap-2 rounded-lg border p-2 sm:p-3">
              <Send className="h-4 w-4 sm:h-5 sm:w-5 text-green-500 shrink-0" />
              <div className="min-w-0">
                <p className="text-muted-foreground text-[10px] sm:text-xs truncate">{t("statsInvitesSentCard")}</p>
                <p className="text-base sm:text-lg font-bold tabular-nums">{selectedSession.totalInvitesSent}</p>
              </div>
            </div>
            <div className="bg-card flex items-center gap-2 rounded-lg border p-2 sm:p-3">
              <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-purple-500 shrink-0" />
              <div className="min-w-0">
                <p className="text-muted-foreground text-[10px] sm:text-xs truncate">{t("statsSessionDurationCard")}</p>
                <p className="text-base sm:text-lg font-bold tabular-nums">
                  {formatDuration(selectedSession.startTime, selectedSession.endTime)}
                </p>
              </div>
            </div>
            <div className="bg-card flex items-center gap-2 rounded-lg border p-2 sm:p-3">
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-orange-500 shrink-0" />
              <div className="min-w-0">
                <p className="text-muted-foreground text-[10px] sm:text-xs truncate">{t("statsPeakHourCard")}</p>
                <p className="text-base sm:text-lg font-bold tabular-nums">
                  {peakHour !== null ? `${peakHour}:00` : "-"}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex min-h-0 flex-1 flex-col gap-4">
        {loading ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !hasSessions ? (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <BarChart3 className="mb-4 h-12 w-12 text-muted-foreground/50" />
            <h3 className="text-lg font-medium">{t("statsNoActiveSession")}</h3>
            <p className="text-muted-foreground text-sm">{t("statsStartMonitoring")}</p>
          </div>
        ) : (
          <ScrollArea className="min-h-0 flex-1">
            <div className="flex flex-col gap-4 pb-4">
              {/* Activity Chart */}
              {activityChartData.length > 0 && (
                <div className="bg-card rounded-lg border p-4">
                  <h3 className="mb-4 font-medium">{t("statsActivityChart")}</h3>
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={activityChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis
                          dataKey="time"
                          tick={{ fontSize: 12, fill: "#9ca3af" }}
                          stroke="#4b5563"
                        />
                        <YAxis
                          tick={{ fontSize: 12, fill: "#9ca3af" }}
                          stroke="#4b5563"
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#1f2937",
                            border: "1px solid #374151",
                            borderRadius: "8px",
                            color: "#f9fafb",
                          }}
                          labelStyle={{ color: "#f9fafb" }}
                        />
                        <Area
                          type="monotone"
                          dataKey="players"
                          name={t("statsPlayers")}
                          stroke="#3b82f6"
                          fill="#3b82f6"
                          fillOpacity={0.3}
                        />
                        <Area
                          type="monotone"
                          dataKey="invites"
                          name={t("statsInvites")}
                          stroke="#22c55e"
                          fill="#22c55e"
                          fillOpacity={0.3}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Peak Hours Chart */}
              {peakHoursChartData.some((d) => d.players > 0) && (
                <div className="bg-card rounded-lg border p-4">
                  <h3 className="mb-4 font-medium">{t("statsPeakTimesChart")}</h3>
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={peakHoursChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis
                          dataKey="hour"
                          tick={{ fontSize: 10, fill: "#9ca3af" }}
                          stroke="#4b5563"
                        />
                        <YAxis
                          tick={{ fontSize: 12, fill: "#9ca3af" }}
                          stroke="#4b5563"
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#1f2937",
                            border: "1px solid #374151",
                            borderRadius: "8px",
                            color: "#f9fafb",
                          }}
                          labelStyle={{ color: "#f9fafb" }}
                        />
                        <Bar
                          dataKey="players"
                          name={t("statsPlayers")}
                          fill="#22c55e"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Session History List */}
              {hasHistory && (
                <div className="bg-card rounded-lg border p-4">
                  <h3 className="mb-4 font-medium">{t("statsSessionHistory")}</h3>
                  <div className="space-y-2">
                    {statsResponse?.sessions.slice(0, 10).map((session) => (
                      <div
                        key={session.id}
                        className={cn(
                          "flex items-center justify-between rounded-md border p-3 text-sm transition-colors cursor-pointer hover:bg-muted/50",
                          selectedSessionId === session.id && "border-primary bg-primary/5"
                        )}
                        onClick={() => setSelectedSessionId(session.id)}
                      >
                        <div className="flex items-center gap-3">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span>{formatSessionDate(session.startTime, locale)}</span>
                          <span className="text-muted-foreground">
                            ({formatDuration(session.startTime, session.endTime)})
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {session.uniquePlayerIds.length}
                          </span>
                          <span className="flex items-center gap-1">
                            <Send className="h-3 w-3" />
                            {session.totalInvitesSent}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Retention Info */}
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Info className="h-4 w-4" />
                <span>{t("statsRetention")}</span>
              </div>
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Clear Confirmation Dialog */}
      <Dialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("statsClear")}</DialogTitle>
            <DialogDescription>{t("statsClearConfirm")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowClearDialog(false)}>
              {t("cancel")}
            </Button>
            <Button variant="destructive" onClick={handleClear} disabled={clearing}>
              {clearing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("statsClear")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
