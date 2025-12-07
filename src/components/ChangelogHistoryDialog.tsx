import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import ReactMarkdown from "react-markdown";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ChevronDown, ChevronRight, History, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { APP_CONFIG } from "@/config/app.config";
import {
  fetchReleasesWithCache,
  getCacheInfo,
  clearReleasesCache,
} from "@/helpers/github-cache";

interface GitHubRelease {
  id: number;
  tag_name: string;
  name: string;
  body: string;
  published_at: string;
  html_url: string;
}

export function ChangelogHistoryDialog() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [releases, setReleases] = useState<GitHubRelease[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedReleases, setExpandedReleases] = useState<Set<number>>(new Set());
  const [fromCache, setFromCache] = useState(false);
  const [cacheRemainingMs, setCacheRemainingMs] = useState(0);

  // Build GitHub API URL from config
  const githubApiUrl = APP_CONFIG.github?.owner && APP_CONFIG.github?.repo
    ? `https://api.github.com/repos/${APP_CONFIG.github.owner}/${APP_CONFIG.github.repo}/releases`
    : null;

  useEffect(() => {
    if (open && releases.length === 0 && !loading && githubApiUrl) {
      fetchReleases();
    }
  }, [open]);

  // Update cache remaining time
  useEffect(() => {
    if (!fromCache) return;

    const updateCacheTime = () => {
      const info = getCacheInfo();
      if (info) {
        setCacheRemainingMs(info.remainingMs);
      }
    };

    updateCacheTime();
    const interval = setInterval(updateCacheTime, 10000); // Update every 10s

    return () => clearInterval(interval);
  }, [fromCache]);

  const fetchReleases = async (forceRefresh = false) => {
    if (!githubApiUrl) {
      setError(t("changelogNoConfig"));
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await fetchReleasesWithCache(githubApiUrl, {
        forceRefresh,
        ttlMs: 15 * 60 * 1000, // 15 minutes cache
      });

      setReleases(result.releases);
      setFromCache(result.fromCache);

      // Update cache remaining time
      const info = getCacheInfo();
      if (info) {
        setCacheRemainingMs(info.remainingMs);
      }

      // Auto-expand the first (latest) release
      if (result.releases.length > 0) {
        setExpandedReleases(new Set([result.releases[0].id]));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch releases");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    clearReleasesCache();
    fetchReleases(true);
  };

  const formatCacheTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  };

  const toggleRelease = (id: number) => {
    setExpandedReleases((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <History className="h-4 w-4" />
          {t("changelogHistory")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              {t("changelogHistoryTitle")}
            </DialogTitle>
            <div className="mr-6 flex items-center gap-2">
              {fromCache && cacheRemainingMs > 0 && (
                <span className="text-xs text-muted-foreground">
                  {t("changelogCached", { time: formatCacheTime(cacheRemainingMs) })}
                </span>
              )}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={handleRefresh}
                      disabled={loading}
                    >
                      <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>{t("changelogRefresh")}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
          <DialogDescription>{t("changelogHistoryDesc")}</DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[60vh] pr-4">
          {!githubApiUrl && (
            <div className="flex flex-col items-center justify-center gap-2 py-8 text-muted-foreground">
              <AlertCircle className="h-6 w-6" />
              <p className="text-sm text-center">
                {t("changelogNoConfig")}
              </p>
              <p className="text-xs text-center">
                Configure APP_CONFIG.github in src/config/app.config.ts
              </p>
            </div>
          )}

          {githubApiUrl && loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {githubApiUrl && error && (
            <div className="flex flex-col items-center justify-center gap-2 py-8 text-destructive">
              <AlertCircle className="h-6 w-6" />
              <p className="text-sm">{error}</p>
              <Button variant="outline" size="sm" onClick={() => fetchReleases()}>
                {t("changelogRetry")}
              </Button>
            </div>
          )}

          {githubApiUrl && !loading && !error && releases.length === 0 && (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <p className="text-sm">{t("changelogNoReleases")}</p>
            </div>
          )}

          {githubApiUrl && !loading && !error && releases.length > 0 && (
            <div className="space-y-2">
              {releases.map((release, index) => (
                <Collapsible
                  key={release.id}
                  open={expandedReleases.has(release.id)}
                  onOpenChange={() => toggleRelease(release.id)}
                >
                  <div
                    className={`rounded-lg border ${index === 0 ? "border-primary/50 bg-primary/5" : "bg-muted/30"}`}
                  >
                    <CollapsibleTrigger asChild>
                      <button className="flex w-full items-center justify-between rounded-lg p-3 text-left transition-colors hover:bg-muted/50">
                        <div className="flex items-center gap-3">
                          {expandedReleases.has(release.id) ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">
                                {release.name || release.tag_name}
                              </span>
                              {index === 0 && (
                                <span className="rounded bg-primary px-1.5 py-0.5 text-xs text-primary-foreground">
                                  {t("changelogLatest")}
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {formatDate(release.published_at)}
                            </span>
                          </div>
                        </div>
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="border-t px-4 py-3">
                        <div className="prose prose-sm max-w-none dark:prose-invert prose-headings:my-2 prose-headings:font-semibold prose-h1:text-lg prose-h2:text-base prose-h3:text-sm prose-p:my-1 prose-ul:my-1 prose-li:my-0.5 prose-code:rounded prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:text-xs prose-strong:text-foreground">
                          {release.body ? (
                            <ReactMarkdown>{release.body}</ReactMarkdown>
                          ) : (
                            <p className="italic text-muted-foreground">
                              {t("changelogNoNotes")}
                            </p>
                          )}
                        </div>
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
