'use client';

import { useMemo, useState, useEffect } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AgentPlan, Step, UserContext, Workstream } from "@/lib/types";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import StepDetails from "@/components/dashboard/StepDetails";
import Header from "@/components/shared/Header";
import SecondaryHeader from "@/components/shared/SecondaryHeader";
import ChatPanel from "@/components/dashboard/ChatPanel";
import { PanelGroup, Panel, PanelResizeHandle } from "react-resizable-panels";

interface DashboardProps {
  plan: AgentPlan;
}

export default function Dashboard({ plan }: DashboardProps) {
  const [workstreams, setWorkstreams] = useState<Workstream[]>(plan.workstreams);
  const [selectedWorkstream, setSelectedWorkstream] = useState<string | null>(
    plan.workstreams.length > 0 ? plan.workstreams[0].id : null
  );
  const [selectedStep, setSelectedStep] = useState<Step | null>(null);
  const [context, setContext] = useState<UserContext>(plan.userContext);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatQuery, setChatQuery] = useState<string>("");
  const [isLarge, setIsLarge] = useState<boolean>(false);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const update = () => setIsLarge(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  const promptSummary = useMemo(() => plan.planSummary.headline || plan.userContext.initialPrompt, [plan]);

  // Initialize selected step when component mounts
  useMemo(() => {
    if (selectedWorkstream && !selectedStep && workstreams.length > 0) {
      const firstWorkstream = workstreams.find(w => w.id === selectedWorkstream);
      if (firstWorkstream && firstWorkstream.steps.length > 0) {
        const firstActiveStep = firstWorkstream.steps.find(
          s => s.status === 'in-progress' || s.status === 'pending'
        ) || firstWorkstream.steps[0];
        setSelectedStep(firstActiveStep);
      }
    }
  }, [selectedWorkstream, selectedStep, workstreams]);

  const handleRemoveContext = (key: keyof UserContext) => {
    setContext((prev) => ({
      ...prev,
      [key]: '',
    }));
  };


  const handleSelectWorkstream = (id: string) => {
    setSelectedWorkstream(id);
    const workstream = workstreams.find(w => w.id === id);
    if (workstream) {
      // Auto-select the first in-progress or pending step
      const firstActiveStep = workstream.steps.find(
        s => s.status === 'in-progress' || s.status === 'pending'
      ) || workstream.steps[0];
      setSelectedStep(firstActiveStep);
    }
    setSidebarOpen(false);
  };

  const handleAskFurther = (query: string) => {
    console.log('🔍 handleAskFurther called with query:', JSON.stringify(query));
    console.log('🔍 Query length:', query.length);
    console.log('🔍 Query lines:', query.split('\n'));
    setChatQuery(query);
    setChatOpen(true);
  };

  const handleStepStatusUpdate = (workstreamId: string, stepId: string, instructionIndex: number, status: string) => {
    setWorkstreams(prev => prev.map(workstream => {
      if (workstream.id !== workstreamId) return workstream;
      
      const updatedSteps = workstream.steps.map(step => {
        if (step.id !== stepId) return step;
        
        // Update instruction completion status
        const currentCompletions = (step as any).instructionCompletions || {};
        const newCompletions = { ...currentCompletions, [instructionIndex]: status };
        
        // Check if all instructions for this step are complete
        const totalInstructions = step.instructions?.length || 0;
        const completedInstructions = Object.values(newCompletions).filter(s => s === 'complete').length;
        const allInstructionsComplete = totalInstructions > 0 && completedInstructions === totalInstructions;
        
        // Update step status based on instruction completion
        const newStepStatus = allInstructionsComplete ? 'complete' : 
                             completedInstructions > 0 ? 'in-progress' : 'pending';
        
        return { 
          ...step, 
          instructionCompletions: newCompletions,
          status: newStepStatus as any
        };
      });
      
      // Calculate progress based on completed tasks/instructions, not just steps
      const totalTasks = updatedSteps.reduce((sum, step) => sum + (step.instructions?.length || 0), 0);
      const completedTasks = updatedSteps.reduce((sum, step) => {
        const completions = (step as any).instructionCompletions || {};
        return sum + Object.values(completions).filter(s => s === 'complete').length;
      }, 0);
      
      const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
      
      console.log(`🔧 Progress calculation for ${workstream.title}:`, {
        totalTasks,
        completedTasks,
        progress,
        breakdown: updatedSteps.map(s => ({
          name: s.name,
          totalInstructions: s.instructions?.length || 0,
          completedInstructions: Object.values((s as any).instructionCompletions || {}).filter(status => status === 'complete').length,
          stepStatus: s.status
        }))
      });
      
      return { ...workstream, steps: updatedSteps, progress };
    }));
  };

  const sidebarContent = (
    <DashboardSidebar
      workstreams={workstreams}
      selectedWorkstream={selectedWorkstream}
      onSelectWorkstream={handleSelectWorkstream}
    />
  );

  const selectedWorkstreamData = workstreams.find(w => w.id === selectedWorkstream);
  
  // Keep selected step in sync with workstream updates
  const currentSelectedStep = selectedWorkstreamData?.steps.find(s => s.id === selectedStep?.id) || selectedStep;

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <Header />
        
        {/* Secondary Header */}
        <SecondaryHeader 
          userContext={context}
          onRemoveContext={handleRemoveContext}
          promptSummary={promptSummary}
        />


        {plan.hitl?.required && plan.hitl.message && (
          <div className="mx-6 mt-4">
            <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 shadow-sm">
              <p className="text-sm font-medium text-amber-900">Human review requested</p>
              <p className="text-sm text-amber-800 mt-1 leading-relaxed">
                {plan.hitl.message}
              </p>
              {plan.hitl.missingFacts && plan.hitl.missingFacts.length > 0 && (
                <ul className="mt-2 text-sm text-amber-800 list-disc list-inside space-y-1">
                  {plan.hitl.missingFacts.map((fact) => (
                    <li key={fact}>{fact}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {/* Mobile Sidebar Trigger */}
        <div className="lg:hidden fixed top-20 left-4 z-40">
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="shadow-md">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-80">
              {sidebarContent}
            </SheetContent>
          </Sheet>
        </div>

        {/* Desktop Resizable Layout */}
        <PanelGroup direction="horizontal" className="hidden lg:flex" style={{ height: 'calc(100vh - 128px)' }}>
          {/* Left Sidebar Panel */}
          <Panel defaultSize={20} minSize={15} maxSize={30}>
            <aside className="h-full overflow-hidden" style={{ backgroundColor: 'hsl(var(--sidebar-background))' }}>
              {sidebarContent}
            </aside>
          </Panel>

          {/* Resize Handle */}
          <PanelResizeHandle className="w-1 bg-border hover:bg-primary/20 transition-colors cursor-col-resize" />

          {/* Main Content Panel */}
          <Panel defaultSize={chatOpen ? 55 : 80} minSize={30}>
            <main className="h-full overflow-y-auto">
              {selectedWorkstream && currentSelectedStep ? (
                <StepDetails 
                  step={currentSelectedStep} 
                  workstream={selectedWorkstreamData}
                  plan={plan}
                  onAskFurther={handleAskFurther}
                  onStepStatusUpdate={handleStepStatusUpdate}
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-muted-foreground">Select a workstream to get started</p>
                </div>
              )}
            </main>
          </Panel>

          {/* Chat Panel with Resize Handle */}
          {chatOpen && (
            <>
              <PanelResizeHandle className="w-1 bg-border hover:bg-primary/20 transition-colors cursor-col-resize" />
              <Panel defaultSize={25} minSize={20} maxSize={40}>
                <ChatPanel 
                  isOpen={chatOpen} 
                  onClose={() => setChatOpen(false)}
                  initialQuery={isLarge ? chatQuery : ""}
                />
              </Panel>
            </>
          )}
        </PanelGroup>

        {/* Mobile Layout (overlay chat) */}
        <div className="lg:hidden flex relative" style={{ height: 'calc(100vh - 128px)' }}>
          <main className="flex-1 overflow-y-auto min-w-0">
            {selectedWorkstream && currentSelectedStep ? (
              <StepDetails 
                step={currentSelectedStep} 
                workstream={selectedWorkstreamData}
                plan={plan}
                onAskFurther={handleAskFurther}
                onStepStatusUpdate={handleStepStatusUpdate}
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">Select a workstream to get started</p>
              </div>
            )}
          </main>
          {chatOpen && (
            <div className="absolute inset-y-0 right-0 z-40 w-[85vw] max-w-sm">
              <ChatPanel 
                isOpen={chatOpen} 
                onClose={() => setChatOpen(false)}
                initialQuery={!isLarge ? chatQuery : ""}
              />
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
