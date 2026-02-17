// hooks/use-analytics.ts
"use client";

import { useState, useEffect, useCallback } from "react";

interface AnalyticsData {
  totalSessions: number;
  totalMinutes: number;
  totalHours: number;
  averageFocus: number;
  completionRate: number;
  streak: number;
  todayFocus: number;
  perfectSessions: number;
  perfectRate: number;
  totalDistractions: number;
  avgDistractionPerSession: number;
  dailyData?: any[];
  hourlyDistribution?: any[];
  peakHours?: any[];
  topTags?: any[];
  sessionTypes?: any[];
  bestDays?: any[];
  insights?: string[];
  bestSessionMinutes?: number;
  recentSessionTimeline?: any[];
}

export function useAnalytics(period: "week" | "month" | "year" = "week") {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/analytics?period=${period}&includeCharts=true&includeInsights=true`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch analytics");
      }

      const data = await response.json();
      setAnalytics(data.analytics);
    } catch (err: any) {
      setError(err.message);
      console.error("Analytics fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const refetch = useCallback(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return {
    analytics,
    loading,
    error,
    refetch,
  };
}
