"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Header } from "@/components/header"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  ArrowRight, 
  Brain, 
  Target, 
  TrendingUp, 
  Shield, 
  Users, 
  Zap,
  Play,
  CheckCircle,
  Star,
  Activity
} from "lucide-react"
import { useEffect } from "react"

export default function HomePage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    // If user is logged in, redirect to dashboard
    if (status === "authenticated") {
      router.push("/dashboard")
    }
  }, [status, router])

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />

      {/* Hero Section with Animated Background */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background" />
        <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:50px_50px]" />
        
        <div className="container mx-auto px-4 py-24 text-center relative">
          <Badge className="mb-4" variant="secondary">
            <Star className="h-3 w-3 mr-1" />
            Trusted by 10,000+ users
          </Badge>
          
          <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent mb-6 animate-fade-in">
            Master Your Focus
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto animate-fade-in-delay">
            Unlock peak productivity with AI-powered focus tracking, smart analytics, 
            and personalized insights that help you work smarter, not harder.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4 animate-fade-in-delay-2">
            <Link href="/auth/signup">
              <Button size="lg" className="gap-2 px-8">
                Start Free Trial
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>

            <Link href="/auth/signin">
              <Button size="lg" variant="outline" className="gap-2 px-8">
                <Play className="h-4 w-4" />
                Sign In
              </Button>
            </Link>
          </div>

          <p className="text-sm text-muted-foreground mt-4">
            No credit card required • Free forever plan available
          </p>
        </div>
      </section>

      {/* Stats Section */}
      <section className="border-y bg-muted/30">
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-primary">98%</div>
              <div className="text-sm text-muted-foreground">Focus Improvement</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary">2.5x</div>
              <div className="text-sm text-muted-foreground">Productivity Boost</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary">45min</div>
              <div className="text-sm text-muted-foreground">Average Focus Time</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary">10k+</div>
              <div className="text-sm text-muted-foreground">Active Users</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Everything You Need to Stay Focused
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Powerful features designed to help you maintain deep focus and achieve your goals
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {[
            { 
              icon: Brain, 
              title: "AI Focus Detection", 
              desc: "Real-time camera tracking detects when you're distracted and helps you refocus",
              badge: "Advanced AI"
            },
            { 
              icon: Target, 
              title: "Smart Goals", 
              desc: "Set daily targets and track your progress with intelligent recommendations",
              badge: "Personalized"
            },
            { 
              icon: TrendingUp, 
              title: "Deep Analytics", 
              desc: "Detailed insights into your focus patterns and productivity trends",
              badge: "Data-Driven"
            },
            { 
              icon: Zap, 
              title: "Pomodoro Pro", 
              desc: "Advanced timer with customizable intervals and automatic break reminders",
              badge: "Proven Method"
            },
            { 
              icon: Shield, 
              title: "100% Private", 
              desc: "All processing happens locally. Your data never leaves your device",
              badge: "Secure"
            },
            { 
              icon: Users, 
              title: "Gamification", 
              desc: "Earn achievements, build streaks, and compete with friends",
              badge: "Motivating"
            },
          ].map(({ icon: Icon, title, desc, badge }, i) => (
            <Card 
              key={i} 
              className="group relative border-2 hover:border-primary/60 transition-all hover:shadow-xl"
            >
              <div className="absolute -top-3 right-4">
                <Badge variant="secondary" className="text-xs">
                  {badge}
                </Badge>
              </div>
              <CardHeader>
                <div className="p-3 bg-primary/10 rounded-lg w-fit mb-4 group-hover:bg-primary/20 transition-colors">
                  <Icon className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-xl">{title}</CardTitle>
                <CardDescription className="text-sm">{desc}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="container mx-auto px-4 py-20 bg-muted/30 rounded-3xl">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
          Start Focusing in 3 Simple Steps
        </h2>
        
        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {[
            { step: "1", title: "Sign Up", desc: "Create your free account in seconds" },
            { step: "2", title: "Set Your Goals", desc: "Customize your focus sessions and targets" },
            { step: "3", title: "Start Focusing", desc: "Begin tracking and improving your productivity" }
          ].map(({ step, title, desc }) => (
            <div key={step} className="text-center">
              <div className="w-16 h-16 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                {step}
              </div>
              <h3 className="font-semibold text-lg mb-2">{title}</h3>
              <p className="text-muted-foreground text-sm">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="container mx-auto px-4 py-20">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
          Loved by Productive People
        </h2>
        
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {[
            { 
              name: "Sarah Chen", 
              role: "Software Engineer", 
              text: "FocusFlow helped me increase my deep work sessions by 3x. The AI detection is incredibly accurate!" 
            },
            { 
              name: "Michael Roberts", 
              role: "Product Designer", 
              text: "The analytics showed me exactly when I'm most productive. Game-changer for my workflow!" 
            },
            { 
              name: "Emma Wilson", 
              role: "PhD Student", 
              text: "Finally, a focus app that actually keeps me accountable. The streak feature is super motivating!" 
            }
          ].map(({ name, role, text }, i) => (
            <Card key={i} className="border-2">
              <CardContent className="pt-6">
                <div className="flex mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                  ))}
                </div>
                <p className="text-sm mb-4 italic">"{text}"</p>
                <div>
                  <p className="font-semibold text-sm">{name}</p>
                  <p className="text-xs text-muted-foreground">{role}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <Card className="max-w-4xl mx-auto bg-gradient-to-br from-primary/20 to-primary/5 border-primary/20">
          <CardContent className="py-12 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to 10x Your Productivity?
            </h2>
            <p className="text-muted-foreground mb-8 max-w-2xl mx-auto text-lg">
              Join thousands of professionals who use FocusFlow to achieve deep focus and accomplish more every day.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
              <Link href="/auth/signup">
                <Button size="lg" className="gap-2 px-8">
                  Get Started for Free
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/demo">
                <Button size="lg" variant="outline" className="gap-2 px-8">
                  <Activity className="h-4 w-4" />
                  Live Demo
                </Button>
              </Link>
            </div>
            
            <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Free forever plan
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle className="h-4 w-4 text-green-500" />
                No credit card required
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Cancel anytime
              </span>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t mt-20">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              <span className="font-semibold">FocusFlow</span>
            </div>
            
            <div className="flex gap-6 text-sm text-muted-foreground">
              <Link href="/privacy" className="hover:text-foreground">Privacy</Link>
              <Link href="/terms" className="hover:text-foreground">Terms</Link>
              <Link href="/support" className="hover:text-foreground">Support</Link>
              <Link href="/blog" className="hover:text-foreground">Blog</Link>
            </div>
            
            <p className="text-sm text-muted-foreground">
              © 2024 FocusFlow. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}