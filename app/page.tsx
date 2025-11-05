"use client";
import Spline from "@splinetool/react-spline/next";
import { Suspense, useEffect } from "react";
import Link from "next/link";
import { motion, useMotionValue, useTransform } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Activity,
  Brain,
  Target,
  TrendingUp,
  Zap,
  Shield,
  Users,
  Clock,
  Eye,
  Flame,
} from "lucide-react";

export default function Index() {
  // Parallax effect
  const mx = useMotionValue(0);
  const my = useMotionValue(0);

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      const { innerWidth, innerHeight } = window;
      const x = (e.clientX - innerWidth / 2) / (innerWidth / 2);
      const y = (e.clientY - innerHeight / 2) / (innerHeight / 2);
      mx.set(x * 20);
      my.set(y * 20);
    };
    window.addEventListener("mousemove", handleMove);
    return () => window.removeEventListener("mousemove", handleMove);
  }, [mx, my]);

  return (
    <main className="relative min-h-screen bg-background text-foreground overflow-hidden">
      {/* 💡 FIX 2: Changed to-background/50 to to-background/30 for maximum transparency */}
      <div className="fixed inset-0 -z-10 bg-gradient-to-b from-background/40 via-background/60 **to-background/30**" />
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,rgba(0,198,255,0.1),transparent_20%)]" />

      {/* Floating Glow Orbs */}
      <AuroraLayer />

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-background/40 border-b border-border/30">
        <div className="container mx-auto px-6 py-3 flex items-center justify-between">
          <motion.div
            className="flex items-center gap-3"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Animated 3D-style Floating Icon */}
            <motion.div
              className="relative"
              animate={{
                rotateY: [0, 360],
                rotateX: [0, 15, 0],
              }}
              transition={{
                duration: 8,
                repeat: Infinity,
                ease: "linear",
              }}
              style={{ transformStyle: "preserve-3d" }}
            >
              <div className="relative w-9 h-9">
                {/* Floating cube effect */}
                <motion.div
                  className="absolute inset-0 rounded-lg bg-gradient-to-br from-primary via-cyan-500 to-blue-600 shadow-[0_0_20px_rgba(0,198,255,0.4)]"
                  animate={{
                    boxShadow: [
                      "0 0 20px rgba(0,198,255,0.4)",
                      "0 0 30px rgba(0,198,255,0.6)",
                      "0 0 20px rgba(0,198,255,0.4)",
                    ],
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Activity className="h-4 w-4 text-white relative z-10" />
                </div>
              </div>
            </motion.div>

            <div className="flex flex-col">
              <span className="text-sm font-bold tracking-wide bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent">
                FocusFlow
              </span>
              <span className="text-[10px] text-muted-foreground/70 tracking-widest uppercase">
                AI Focus Tracker
              </span>
            </div>
          </motion.div>
          <div className="flex gap-2">
            <motion.div
              className="flex gap-1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <Link href="/auth/signin">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors h-8 px-3"
                >
                  Sign In
                </Button>
              </Link>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.05, y: -1 }}
              whileTap={{ scale: 0.95 }}
            >
              <Link href="/auth/signup">
                <Button
                  size="sm"
                  className="text-xs bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_15px_rgba(0,198,255,0.3)] hover:shadow-[0_0_25px_rgba(0,198,255,0.5)] transition-all h-8 px-4"
                >
                  Start Free
                  <Zap className="w-3 h-3 ml-1" />
                </Button>
              </Link>
            </motion.div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center px-6 pt-20">
        <div className="flex flex-col ">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            style={{ x: mx, y: my }}
            className="relative z-10 text-center max-w-5xl mx-auto"
          >
            <h1 className="text-6xl md:text-8xl font-black tracking-tight pt-4 mb-6">
              <span className="block bg-gradient-accent bg-clip-text  animate-shimmer bg-[length:200%_100%]">
                Master
              </span>
              <span className="block text-foreground">Your Focus</span>
            </h1>

            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
              Real-time attention tracking meets beautiful analytics.
              <span className="block mt-2 text-primary">
                Transform distraction into deep work.
              </span>
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <motion.div
                whileHover={{ scale: 1.04, y: -2 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  size="lg"
                  className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-6 text-lg shadow-[0_0_30px_rgba(0,198,255,0.4)] hover:shadow-[0_0_40px_rgba(0,198,255,0.6)] transition-all"
                >
                  <Zap className="w-5 h-5 mr-2" />
                  Start Tracking
                </Button>
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.04, y: -2 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  size="lg"
                  variant="outline"
                  className="px-8 py-6 text-lg border-border/50 hover:border-primary/50 hover:bg-secondary/50"
                >
                  Watch Demo
                </Button>
              </motion.div>
            </div>
          </motion.div>
        </div>

        {/* Hero Glow Effect */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] animate-glow-pulse" />
        </div>

        {/* Scroll Hint */}
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            repeatType: "reverse",
          }}
          className="absolute bottom-8 text-xs text-muted-foreground"
        >
          Scroll to explore
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-6">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Everything you need to
              <span className="block text-primary">stay in flow</span>
            </h2>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { icon: Brain, label: "AI Focus", desc: "Smart detection" },
              { icon: Target, label: "Goals", desc: "Track progress" },
              { icon: TrendingUp, label: "Analytics", desc: "Deep insights" },
              { icon: Zap, label: "Pomodoro", desc: "Time blocks" },
              { icon: Shield, label: "Private", desc: "On-device" },
              { icon: Users, label: "Gamify", desc: "Stay motivated" },
            ].map((feature, i) => (
              <motion.div
                key={feature.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -8, scale: 1.02 }}
                className="group"
              >
                <Card className="bg-card/50 backdrop-blur-sm border-border/50 hover:border-primary/50 transition-all h-full">
                  <CardContent className="p-6 flex flex-col items-center text-center gap-3">
                    <div className="p-4 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                      <feature.icon className="w-7 h-7 text-primary" />
                    </div>
                    <div>
                      <div className="font-semibold text-foreground mb-1">
                        {feature.label}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {feature.desc}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Analytics Section */}
      <section className="py-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent" />

        <div className="container mx-auto max-w-6xl relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Analytics that
              <span className="block text-primary">actually matter</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Track what drives your productivity with stunning visualizations
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Activity,
                value: "98%",
                label: "Focus Improvement",
                color: "text-primary",
              },
              {
                icon: Clock,
                value: "45m",
                label: "Avg Deep Work",
                color: "text-cyan-400",
              },
              {
                icon: Eye,
                value: "2.3x",
                label: "Attention Span",
                color: "text-blue-400",
              },
              {
                icon: Flame,
                value: "24",
                label: "Day Streak",
                color: "text-orange-400",
              },
            ].map((metric, i) => (
              <motion.div
                key={metric.label}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <Card className="bg-card/50 backdrop-blur-sm border-border/50 hover:border-primary/50 transition-all group">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div
                        className={`p-3 rounded-lg bg-primary/10 ${metric.color}`}
                      >
                        <metric.icon className="w-6 h-6" />
                      </div>
                      <div className="w-2 h-2 rounded-full bg-primary animate-glow-pulse" />
                    </div>
                    <div className="text-4xl font-bold mb-2 bg-gradient-accent bg-clip-text text-transparent">
                      {metric.value}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {metric.label}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5 }}
            className="mt-12 text-center"
          >
            <Card className="bg-card/30 backdrop-blur-sm border-border/50 max-w-3xl mx-auto">
              <CardContent className="p-8">
                <div className="flex items-center justify-center gap-8 text-sm">
                  <div>
                    <div className="text-2xl font-bold text-primary mb-1">
                      10k+
                    </div>
                    <div className="text-muted-foreground">Active Users</div>
                  </div>
                  <div className="h-12 w-px bg-border/50" />
                  <div>
                    <div className="text-2xl font-bold text-primary mb-1">
                      500k+
                    </div>
                    <div className="text-muted-foreground">Focus Sessions</div>
                  </div>
                  <div className="h-12 w-px bg-border/50" />
                  <div>
                    <div className="text-2xl font-bold text-primary mb-1">
                      4.9/5
                    </div>
                    <div className="text-muted-foreground">User Rating</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-12">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Activity className="h-5 w-5 text-primary" />
                </div>
                <span className="text-lg font-bold bg-gradient-accent bg-clip-text text-transparent">
                  FocusFlow
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                Transform distraction into deep work with AI-powered focus
                tracking.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    Features
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    Pricing
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    FAQ
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    About
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    Blog
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    Careers
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Legal</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    Privacy
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    Terms
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    Security
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-border/50 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            <p>© 2024 FocusFlow. All rights reserved.</p>
            <div className="flex items-center gap-6">
              <a href="#" className="hover:text-primary transition-colors">
                Twitter
              </a>
              <a href="#" className="hover:text-primary transition-colors">
                LinkedIn
              </a>
              <a href="#" className="hover:text-primary transition-colors">
                GitHub
              </a>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}

// Aurora Layer Component
function AuroraLayer() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10">
      <Orb color="rgba(99,102,241,0.35)" size={420} startX="10%" startY="30%" />
      <Orb
        color="rgba(56,189,248,0.25)"
        size={360}
        startX="80%"
        startY="20%"
        reverse
      />
      <Orb
        color="rgba(244,114,182,0.22)"
        size={500}
        startX="60%"
        startY="70%"
      />
    </div>
  );
}

// Animated Orb Component
function Orb({
  color,
  size,
  startX,
  startY,
  reverse,
}: {
  color: string;
  size: number;
  startX: string;
  startY: string;
  reverse?: boolean;
}) {
  return (
    <motion.div
      initial={{ x: "-50%", y: "-50%" }}
      animate={{
        x: reverse ? ["-55%", "-45%", "-55%"] : ["-45%", "-55%", "-45%"],
        y: reverse ? ["-48%", "-52%", "-48%"] : ["-52%", "-48%", "-52%"],
        rotate: reverse ? [0, 8, 0] : [0, -8, 0],
        scale: [1, 1.06, 1],
      }}
      transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      style={{
        left: startX,
        top: startY,
        width: size,
        height: size,
        background: `radial-gradient(circle at 30% 30%, ${color}, transparent 60%)`,
      }}
      className="absolute rounded-full blur-3xl"
    />
  );
}
