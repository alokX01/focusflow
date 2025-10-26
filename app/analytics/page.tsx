"use client";

import { Suspense } from "react";
import { motion } from "framer-motion";
import { Header } from "@/components/header";
import { AnalyticsDashboard } from "@/components/analytics-dashboard";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import AnalyticsLoading from "./loading";

// Error Boundary Component
function AnalyticsError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-16">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <Card className="max-w-md mx-auto border-destructive/50">
            <CardContent className="pt-6 text-center space-y-4">
              <div className="mx-auto w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <h2 className="text-lg font-semibold mb-1">
                  Failed to Load Analytics
                </h2>
                <p className="text-sm text-muted-foreground">{error.message}</p>
              </div>
              <Button onClick={reset} variant="outline">
                Try Again
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <motion.main
        className="container mx-auto px-4 py-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Suspense fallback={<AnalyticsLoading />}>
          <AnalyticsDashboard />
        </Suspense>
      </motion.main>
    </div>
  );
}
