"use client";

import {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  Fragment,
} from "react";
import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Eye,
  Download,
  Calendar,
  MoreHorizontal,
  Pencil,
  Archive,
  ArchiveRestore,
  Trash2,
  Loader2,
  Sparkles,
  Clock,
  Target,
  TrendingUp,
  Filter,
  Search,
  X,
  LucideIcon,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Session {
  _id: string;
  startTime: string; // ISO
  endTime?: string; // ISO
  duration: number; // seconds
  focusPercentage: number; // 0-100
  distractionCount: number;
  sessionType: "focus" | "break" | "pomodoro";
  task: string;
  isArchived: boolean;
}

type Period = "week" | "month" | "quarter" | "year";

type TimelineSample = {
  t: number; // seconds since session start
  focused: boolean; // isLooking
  confidence?: number;
};

export function HistoryInterface() {
  const [selectedPeriod, setSelectedPeriod] = useState<Period>("week");
  const [sessions, setSessions] = useState<Session[]>([]);
  const [filtered, setFiltered] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Inline details (no dialog)
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);

  // AI / timeline
  const [aiInsight, setAiInsight] = useState("");
  const [isGeneratingInsight, setIsGeneratingInsight] = useState(false);
  const [timeline, setTimeline] = useState<TimelineSample[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);

  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTaskName, setEditingTaskName] = useState("");

  const [showArchived, setShowArchived] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const abortRef = useRef<AbortController | null>(null);

  // FIX 1: Wrap fetchHistoricalData in useCallback to prevent infinite loops
  const fetchHistoricalData = useCallback(async () => {
    setIsLoading(true);
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    try {
      const response = await fetch(
        `/api/sessions?period=${selectedPeriod}&archived=${
          showArchived ? "true" : "false"
        }`,
        { signal: ac.signal, cache: "no-store" }
      );
      if (!response.ok) throw new Error("Failed to fetch sessions");
      const data = await response.json();

      const sorted = data.sessions.sort(
        (a: Session, b: Session) =>
          new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
      );

      const normalized = sorted.map((s: Session) => ({
        ...s,
        task: s.task && s.task.trim().length ? s.task : "(No Task)",
      }));

      setSessions(normalized);
      setFiltered(normalized);
    } catch (error: any) {
      if (error.name !== "AbortError") {
        console.error("Failed to fetch history:", error);
        toast({
          title: "Failed to load session history",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [selectedPeriod, showArchived]); // FIX 2: Added proper dependencies

  // Load list for period + archived toggle
  useEffect(() => {
    fetchHistoricalData();
    return () => abortRef.current?.abort();
  }, [fetchHistoricalData]); // FIX 3: Now using the memoized function

  // Apply search filter when query changes
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFiltered(sessions);
      return;
    }
    const q = searchQuery.toLowerCase();
    setFiltered(
      sessions.filter(
        (s) =>
          (s.task || "").toLowerCase().includes(q) ||
          new Date(s.startTime).toLocaleString().toLowerCase().includes(q)
      )
    );
  }, [searchQuery, sessions]);

  // Stats
  const stats = useMemo(() => {
    if (!filtered.length)
      return {
        totalSessions: 0,
        totalMinutes: 0,
        avgFocus: 0,
        bestFocusedMin: 0,
      };
    const mins = filtered.reduce((sum, s) => sum + s.duration / 60, 0);
    const avg = Math.round(
      filtered.reduce((sum, s) => sum + (s.focusPercentage || 0), 0) /
        filtered.length
    );
    const best = filtered.reduce((best, s) => {
      const fm = (s.duration * (s.focusPercentage / 100)) / 60;
      return fm > best ? fm : best;
    }, 0);
    return {
      totalSessions: filtered.length,
      totalMinutes: Math.round(mins),
      avgFocus: avg,
      bestFocusedMin: Math.round(best),
    };
  }, [filtered]);

  // Export CSV
  const handleExport = async () => {
    try {
      const res = await fetch(`/api/export?period=${selectedPeriod}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `focusflow-history-${selectedPeriod}.csv`;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast({ title: "History exported successfully!" });
    } catch {
      toast({ title: "Failed to export history", variant: "destructive" });
    }
  };

  // AI insight
  const fetchAiInsight = useCallback(
    async (session: Session) => {
      setIsGeneratingInsight(true);
      setAiInsight("");
      try {
        const resp = await fetch(`/api/sessions/${session._id}/insight`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ period: selectedPeriod }),
        });
        if (resp.ok) {
          const data = await resp.json();
          setAiInsight(data.insight || "No insight generated.");
        } else {
          setAiInsight(fallbackInsight(session));
        }
      } catch {
        setAiInsight(fallbackInsight(session));
      } finally {
        setIsGeneratingInsight(false);
      }
    },
    [selectedPeriod]
  );

  // Timeline
  const fetchTimeline = useCallback(async (sessionId: string) => {
    setTimeline([]);
    setTimelineLoading(true);
    try {
      const response = await fetch(`/api/sessions/${sessionId}/timeline`, {
        cache: "no-store",
      });
      if (!response.ok) {
        if (response.status === 404) {
          console.warn("Timeline API not found, falling back to empty array.");
          setTimeline([]);
          return;
        }
        throw new Error("Failed to fetch timeline");
      }
      const data = await response.json();
      setTimeline(Array.isArray(data.timeline) ? data.timeline : []);
    } catch (error) {
      console.error(error);
      setTimeline([]);
    } finally {
      setTimelineLoading(false);
    }
  }, []);

  // Expand/collapse details
  const handleToggleDetails = (session: Session) => {
    const isSame = expandedId === session._id;
    if (isSame) {
      setExpandedId(null);
      setSelectedSession(null);
      setAiInsight("");
      setTimeline([]);
      return;
    }
    setExpandedId(session._id);
    setSelectedSession(session);
    fetchAiInsight(session);
    fetchTimeline(session._id);
  };

  // FIX 4: Add missing handleEditClick function
  const handleEditClick = (session: Session) => {
    setEditingSessionId(session._id);
    setEditingTaskName(session.task);
  };

  // FIX 5: Add missing handleSaveTask function
  const handleSaveTask = async (sessionId: string, shouldSave: boolean) => {
    if (!shouldSave) {
      setEditingSessionId(null);
      setEditingTaskName("");
      return;
    }

    const taskName = editingTaskName.trim() || "(No Task)";
    const original = [...sessions];

    // Optimistic update
    const updated = sessions.map((s) =>
      s._id === sessionId ? { ...s, task: taskName } : s
    );
    setSessions(updated);
    setFiltered(updated);

    try {
      const resp = await fetch(`/api/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task: taskName }),
      });

      if (!resp.ok) throw new Error("Failed to update task");

      toast({ title: "Task updated" });
    } catch (e) {
      // Rollback on error
      setSessions(original);
      setFiltered(original);
      toast({ title: "Failed to update task", variant: "destructive" });
    } finally {
      setEditingSessionId(null);
      setEditingTaskName("");
    }
  };

  // Archive / Unarchive (toggle) with optimistic UI + refetch
  const handleArchiveToggle = async (session: Session) => {
    const toArchived = !session.isArchived;
    const original = [...sessions];

    // FIX 6: Improved optimistic update logic
    const optimistic = sessions.map((s) =>
      s._id === session._id ? { ...s, isArchived: toArchived } : s
    );

    setSessions(optimistic);

    // Apply current filter
    const filtered = optimistic.filter((s) =>
      showArchived ? s.isArchived : !s.isArchived
    );
    setFiltered(filtered);

    // Close details if the session is being removed from current view
    if (expandedId === session._id && toArchived !== showArchived) {
      setExpandedId(null);
      setSelectedSession(null);
      setAiInsight("");
      setTimeline([]);
    }

    try {
      const resp = await fetch(`/api/sessions/${session._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isArchived: toArchived }),
      });
      if (!resp.ok) throw new Error("Failed to update archive state");

      toast({ title: toArchived ? "Session archived" : "Session unarchived" });

      // Final sync with server
      fetchHistoricalData();
    } catch (e) {
      // rollback
      setSessions(original);
      setFiltered(original);
      toast({ title: "Failed to update session", variant: "destructive" });
    }
  };

  // Delete session with confirm + optimistic UI
  const handleDelete = async (session: Session) => {
    if (
      !confirm("Delete this session permanently? This action cannot be undone.")
    )
      return;

    const original = [...sessions];
    // Optimistic removal
    const remaining = sessions.filter((s) => s._id !== session._id);
    setSessions(remaining);
    setFiltered(remaining);
    if (expandedId === session._id) {
      setExpandedId(null);
      setSelectedSession(null);
      setAiInsight("");
      setTimeline([]);
    }

    try {
      const resp = await fetch(`/api/sessions/${session._id}`, {
        method: "DELETE",
      });
      if (!resp.ok) throw new Error("Failed to delete");
      toast({ title: "Session deleted" });
    } catch (e) {
      setSessions(original);
      setFiltered(original);
      toast({ title: "Failed to delete session", variant: "destructive" });
    }
  };

  // Helpers
  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return s ? `${m}m ${s}s` : `${m}m`;
  };

  const getFocusBadgeVariant = (
    score: number
  ): "default" | "secondary" | "destructive" => {
    if (score >= 80) return "default";
    if (score >= 60) return "secondary";
    return "destructive";
  };

  const periodLabel = useMemo(() => {
    const map: Record<Period, string> = {
      week: "this week",
      month: "this month",
      quarter: "this quarter",
      year: "this year",
    };
    return map[selectedPeriod];
  }, [selectedPeriod]);

  return (
    <div className="space-y-6">
      {/* Controls */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3"
      >
        <div className="flex items-center gap-3 flex-wrap">
          <Tabs
            value={selectedPeriod}
            onValueChange={(v) => setSelectedPeriod(v as Period)}
          >
            <TabsList>
              <TabsTrigger value="week">Week</TabsTrigger>
              <TabsTrigger value="month">Month</TabsTrigger>
              <TabsTrigger value="quarter">Quarter</TabsTrigger>
              <TabsTrigger value="year">Year</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by task or date…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-9 w-56"
            />
          </div>

          <Button
            variant={showArchived ? "default" : "outline"}
            size="sm"
            className="gap-2"
            onClick={() => setShowArchived((s) => !s)}
          >
            <Filter className="w-4 h-4" />
            {showArchived ? "Show Unarchived" : "Show Archived"}
          </Button>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={handleExport}
        >
          <Download className="w-4 h-4" />
          Export
        </Button>
      </motion.div>

      {/* Quick Stats */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        <StatMini label="Total Sessions" value={stats.totalSessions} />
        <StatMini
          label="Focus Time"
          value={`${Math.floor(stats.totalMinutes / 60)}h ${
            stats.totalMinutes % 60
          }m`}
        />
        <StatMini label="Avg Focus" value={`${stats.avgFocus}%`} />
      </motion.div>

      {/* Session Log + inline details */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Session Log</CardTitle>
            <CardDescription>All sessions {periodLabel}.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="font-medium text-muted-foreground">
                  No sessions found
                </p>
                <p className="text-sm text-muted-foreground">
                  Start a focus session to see your history here.
                </p>
              </div>
            ) : (
              <>
                {/* Mobile Cards */}
                <div className="block md:hidden space-y-3">
                  {filtered.map((session) => {
                    const isExpanded = expandedId === session._id;
                    return (
                      <Card
                        key={session._id}
                        className={cn(session.isArchived && "opacity-70")}
                      >
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex-1">
                              <div className="text-sm text-muted-foreground mb-1">
                                {new Date(session.startTime).toLocaleString(
                                  "en-US",
                                  {
                                    month: "short",
                                    day: "numeric",
                                    hour: "numeric",
                                    minute: "2-digit",
                                    hour12: true,
                                  }
                                )}
                              </div>
                              {editingSessionId === session._id ? (
                                <Input
                                  value={editingTaskName}
                                  onChange={(e) =>
                                    setEditingTaskName(e.target.value)
                                  }
                                  className="h-8 mb-2"
                                  autoFocus
                                  onBlur={() =>
                                    handleSaveTask(session._id, true)
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter")
                                      handleSaveTask(session._id, true);
                                    if (e.key === "Escape")
                                      handleSaveTask(session._id, false);
                                  }}
                                />
                              ) : (
                                <p className="font-medium line-clamp-2 mb-2">
                                  {session.task}
                                </p>
                              )}
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => handleToggleDetails(session)}
                                >
                                  <Eye className="mr-2 h-4 w-4" />
                                  {isExpanded ? "Hide details" : "View details"}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleEditClick(session)}
                                >
                                  <Pencil className="mr-2 h-4 w-4" /> Edit Task
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleArchiveToggle(session)}
                                >
                                  {session.isArchived ? (
                                    <>
                                      <ArchiveRestore className="mr-2 h-4 w-4" />{" "}
                                      Unarchive
                                    </>
                                  ) : (
                                    <>
                                      <Archive className="mr-2 h-4 w-4" />{" "}
                                      Archive
                                    </>
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-red-500"
                                  onClick={() => handleDelete(session)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>

                          {/* Quick Stats */}
                          <div className="flex gap-4 text-sm">
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-muted-foreground" />
                              <span>{formatDuration(session.duration)}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Badge
                                variant={getFocusBadgeVariant(
                                  session.focusPercentage
                                )}
                              >
                                {session.focusPercentage.toFixed(2)}%
                              </Badge>
                            </div>
                            <div className="flex items-center gap-1">
                              <Target className="w-3 h-3 text-muted-foreground" />
                              <span>
                                {session.distractionCount} distractions
                              </span>
                            </div>
                          </div>

                          {/* Expanded */}
                          {isExpanded && selectedSession && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              className="mt-4 pt-4 border-t"
                            >
                              <div className="bg-muted p-3 rounded-lg mb-3">
                                <h3 className="font-semibold mb-2 flex items-center text-sm">
                                  <Sparkles className="w-4 h-4 mr-2 text-primary" />
                                  AI Coach's Insight
                                </h3>
                                {isGeneratingInsight ? (
                                  <div className="flex items-center text-sm text-muted-foreground">
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />{" "}
                                    Analyzing...
                                  </div>
                                ) : (
                                  <p className="text-sm">
                                    {aiInsight || "No insight available."}
                                  </p>
                                )}
                              </div>

                              <div className="grid grid-cols-2 gap-3 mb-3">
                                <MiniStat
                                  icon={Clock}
                                  label="Duration"
                                  value={formatDuration(
                                    selectedSession.duration
                                  )}
                                />
                                <MiniStat
                                  icon={Eye}
                                  label="Focus"
                                  value={`${selectedSession.focusPercentage.toFixed(
                                    2
                                  )}%`}
                                  color="text-blue-500"
                                />
                                <MiniStat
                                  icon={TrendingUp}
                                  label="Focused Time"
                                  value={formatDuration(
                                    Math.round(
                                      selectedSession.duration *
                                        (selectedSession.focusPercentage / 100)
                                    )
                                  )}
                                  color="text-green-500"
                                />
                                <MiniStat
                                  icon={Target}
                                  label="Distractions"
                                  value={selectedSession.distractionCount}
                                  color="text-amber-500"
                                />
                              </div>

                              <div>
                                <h3 className="font-semibold mb-2 text-sm">
                                  Session Timeline
                                </h3>
                                {timelineLoading ? (
                                  <Skeleton className="h-16 w-full" />
                                ) : timeline.length > 0 ? (
                                  <TimelineBar
                                    samples={timeline}
                                    duration={selectedSession.duration}
                                  />
                                ) : (
                                  <div className="h-16 w-full bg-muted rounded-md flex items-center justify-center text-xs text-muted-foreground">
                                    No timeline available
                                  </div>
                                )}
                              </div>

                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  handleToggleDetails(selectedSession)
                                }
                                className="w-full mt-3"
                              >
                                Close Details
                              </Button>
                            </motion.div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date & Time</TableHead>
                        <TableHead>Task</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Focus</TableHead>
                        <TableHead>Distractions</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((session) => {
                        const isExpanded = expandedId === session._id;
                        return (
                          <Fragment key={session._id}>
                            <TableRow
                              className={cn(session.isArchived && "opacity-70")}
                            >
                              <TableCell>
                                {new Date(session.startTime).toLocaleString(
                                  "en-US",
                                  {
                                    month: "short",
                                    day: "numeric",
                                    hour: "numeric",
                                    minute: "2-digit",
                                    hour12: true,
                                  }
                                )}
                              </TableCell>
                              <TableCell className="max-w-[320px]">
                                {editingSessionId === session._id ? (
                                  <Input
                                    value={editingTaskName}
                                    onChange={(e) =>
                                      setEditingTaskName(e.target.value)
                                    }
                                    className="h-8"
                                    autoFocus
                                    onBlur={() =>
                                      handleSaveTask(session._id, true)
                                    }
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter")
                                        handleSaveTask(session._id, true);
                                      if (e.key === "Escape")
                                        handleSaveTask(session._id, false);
                                    }}
                                  />
                                ) : (
                                  <span className="font-medium line-clamp-1">
                                    {session.task}
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>
                                {formatDuration(session.duration)}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={getFocusBadgeVariant(
                                    session.focusPercentage
                                  )}
                                >
                                  {session.focusPercentage.toFixed(2)}%
                                </Badge>
                              </TableCell>
                              <TableCell>{session.distractionCount}</TableCell>
                              <TableCell className="text-right">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      aria-expanded={isExpanded}
                                    >
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                      onClick={() =>
                                        handleToggleDetails(session)
                                      }
                                    >
                                      <Eye className="mr-2 h-4 w-4" />
                                      {isExpanded
                                        ? "Hide details"
                                        : "View details"}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => handleEditClick(session)}
                                    >
                                      <Pencil className="mr-2 h-4 w-4" /> Edit
                                      Task
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() =>
                                        handleArchiveToggle(session)
                                      }
                                    >
                                      {session.isArchived ? (
                                        <>
                                          <ArchiveRestore className="mr-2 h-4 w-4" />{" "}
                                          Unarchive
                                        </>
                                      ) : (
                                        <>
                                          <Archive className="mr-2 h-4 w-4" />{" "}
                                          Archive
                                        </>
                                      )}
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      className="text-red-500"
                                      onClick={() => handleDelete(session)}
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" /> Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>

                            {/* Expanded details row - Desktop */}
                            {isExpanded && selectedSession && (
                              <TableRow>
                                <TableCell colSpan={6} className="p-0">
                                  <motion.div
                                    initial={{ opacity: 0, y: -4 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -4 }}
                                    className="p-4 bg-muted/30 border-t border-border"
                                  >
                                    <div className="flex items-center justify-between mb-3">
                                      <div className="text-sm text-muted-foreground">
                                        {new Date(
                                          selectedSession.startTime
                                        ).toLocaleString("en-US", {
                                          dateStyle: "full",
                                          timeStyle: "short",
                                        })}
                                      </div>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                          handleToggleDetails(selectedSession)
                                        }
                                        className="gap-1"
                                      >
                                        <X className="w-4 h-4" />
                                        Close
                                      </Button>
                                    </div>

                                    {/* AI Coaching Insight */}
                                    <div className="bg-muted p-4 rounded-lg mb-4">
                                      <h3 className="font-semibold mb-2 flex items-center">
                                        <Sparkles className="w-4 h-4 mr-2 text-primary" />
                                        AI Coach's Insight
                                      </h3>
                                      {isGeneratingInsight ? (
                                        <div className="flex items-center text-sm text-muted-foreground">
                                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                          Analyzing your session...
                                        </div>
                                      ) : (
                                        <p className="text-sm">
                                          {aiInsight || "No insight available."}
                                        </p>
                                      )}
                                    </div>

                                    {/* Key Metrics */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                      <MiniStat
                                        icon={Clock}
                                        label="Duration"
                                        value={formatDuration(
                                          selectedSession.duration
                                        )}
                                      />
                                      <MiniStat
                                        icon={Eye}
                                        label="Focus Score"
                                        value={`${selectedSession.focusPercentage.toFixed(
                                          2
                                        )}%`}
                                        color="text-blue-500"
                                      />
                                      <MiniStat
                                        icon={TrendingUp}
                                        label="Focused Time"
                                        value={formatDuration(
                                          Math.round(
                                            selectedSession.duration *
                                              (selectedSession.focusPercentage /
                                                100)
                                          )
                                        )}
                                        color="text-green-500"
                                      />
                                      <MiniStat
                                        icon={Target}
                                        label="Distractions"
                                        value={selectedSession.distractionCount}
                                        color="text-amber-500"
                                      />
                                    </div>

                                    {/* Timeline */}
                                    <div>
                                      <h3 className="font-semibold mb-2">
                                        Session Timeline
                                      </h3>
                                      {timelineLoading ? (
                                        <Skeleton className="h-20 w-full" />
                                      ) : timeline.length > 0 ? (
                                        <TimelineBar
                                          samples={timeline}
                                          duration={selectedSession.duration}
                                        />
                                      ) : (
                                        <div className="h-20 w-full bg-muted rounded-md flex items-center justify-center text-muted-foreground">
                                          No timeline available for this session
                                        </div>
                                      )}
                                    </div>

                                    {/* Task */}
                                    {selectedSession.task !== "(No Task)" && (
                                      <div className="p-4 rounded-lg border border-border mt-4">
                                        <p className="text-sm font-medium mb-1">
                                          Session Task
                                        </p>
                                        <p className="text-muted-foreground">
                                          {selectedSession.task}
                                        </p>
                                      </div>
                                    )}
                                  </motion.div>
                                </TableCell>
                              </TableRow>
                            )}
                          </Fragment>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

// FIX 7: Removed unused badgeVariant prop
function StatMini({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className="mt-1 text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}

// FIX 8: Proper typing for icon prop
function MiniStat({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <div className="text-center p-3 rounded-lg bg-muted/50">
      <Icon className={cn("w-5 h-5 mx-auto mb-1", color || "text-primary")} />
      <div className="text-lg font-bold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

/* Simple block timeline */
function TimelineBar({
  samples,
  duration,
}: {
  samples: TimelineSample[];
  duration: number;
}) {
  if (samples.length === 0 || duration <= 0) return null;
  const segments = Math.min(60, Math.max(10, Math.round(duration / 10)));
  const blockWidth = 100 / segments;

  const segFocused = Array(segments).fill(0);
  const segCount = Array(segments).fill(0);
  for (const s of samples) {
    const idx = Math.min(segments - 1, Math.floor((s.t / duration) * segments));
    segCount[idx] += 1;
    segFocused[idx] += s.focused ? 1 : 0;
  }

  return (
    <div className="h-20 w-full bg-muted rounded-md overflow-hidden">
      <div className="flex h-full">
        {segCount.map((c, i) => {
          const ratio = c ? segFocused[i] / c : 0;
          const color =
            ratio > 0.7
              ? "bg-green-500"
              : ratio > 0.3
              ? "bg-amber-500"
              : "bg-red-500";
          return (
            <div
              key={i}
              className={cn("h-full", color)}
              style={{ width: `${blockWidth}%` }}
              title={`${Math.round(ratio * 100)}% focused`}
            />
          );
        })}
      </div>
      <div className="flex justify-between text-[10px] px-1 text-muted-foreground mt-1">
        <span>Start</span>
        <span>End</span>
      </div>
    </div>
  );
}

/* Simple fallback AI rule if API fails */
function fallbackInsight(session: Session) {
  const focus = session.focusPercentage || 0;
  const d = session.distractionCount || 0;
  if (focus < 50)
    return `This session struggled (focus ${focus}%). Try a shorter block and eliminate obvious distractions (phone out of reach).`;
  if (d >= 6)
    return `Focus was decent (${focus}%), but ${d} distractions broke flow. Identify and remove the top trigger.`;
  if (focus >= 85)
    return `Excellent session (${focus}%). Whatever you did here, repeat it — same environment and time of day.`;
  return `Solid session (${focus}%). Aim to trim small distractions to push above 80%.`;
}
