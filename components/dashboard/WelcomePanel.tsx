import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Workstream } from "@/lib/types";

interface WelcomePanelProps {
  workstreams: Workstream[];
  userName?: string;
  onGetStarted: () => void;
}

export default function WelcomePanel({ workstreams, userName = "there", onGetStarted }: WelcomePanelProps) {
  const totalProgress = workstreams.reduce((acc, w) => acc + w.progress, 0) / workstreams.length;
  const completedWorkstreams = workstreams.filter(w => w.progress === 100).length;

  return (
    <div className="flex items-center justify-center min-h-screen p-8 bg-background">
      <div className="max-w-2xl w-full space-y-10 animate-fade-in">
        {/* Welcome Header */}
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-instrument font-semibold tracking-[-0.02em]">
            Welcome back, {userName}
          </h1>
          <p className="text-lg text-muted-foreground">
            Let&apos;s continue your visa application journey
          </p>
        </div>

        {/* Progress Summary Card */}
        <Card className="p-10 space-y-8 shadow-sm border-0">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Overall Progress</span>
              <span className="text-muted-foreground font-medium">{Math.round(totalProgress)}%</span>
            </div>
            <Progress value={totalProgress} className="h-2.5" />
          </div>

          <div className="grid grid-cols-2 gap-8 pt-6 border-t border-border">
            <div className="space-y-2">
              <div className="text-4xl font-serif font-semibold">{completedWorkstreams}</div>
              <div className="text-sm text-muted-foreground">Completed Workstreams</div>
            </div>
            <div className="space-y-2">
              <div className="text-4xl font-serif font-semibold">{workstreams.length}</div>
              <div className="text-sm text-muted-foreground">Total Workstreams</div>
            </div>
          </div>
        </Card>

        {/* Call to Action */}
        <div className="text-center space-y-5">
          <p className="text-muted-foreground text-base">
            Ready to make progress?
          </p>
          <Button size="lg" onClick={onGetStarted} className="gap-2 h-12 px-8">
            Select a workstream to begin
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
