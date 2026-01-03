'use client';

import { Calendar, Download, CheckCircle, ExternalLink, Clock, Check, BadgeCheck, Globe2, DollarSign, FileText, Building2, MapPin, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Step, Workstream, AgentPlan } from "@/lib/types";
import { format } from "date-fns";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState, useRef, useEffect, useMemo } from "react";
import type { ComponentType } from "react";
import { useTextSelection } from "@/hooks/useTextSelection";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { getScenarioById } from "@/lib/data/scenario-config";

const SCENARIO_BADGE_CLASSES: Record<string, string> = {
  "usa-to-australia-skilled-worker": "bg-orange-50 text-orange-700 border-orange-200",
  "brazil-to-berlin-residence": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "us-graduate-visa-uk": "bg-indigo-50 text-indigo-700 border-indigo-200",
};

const SCENARIO_ACCENT_CLASSES: Record<string, string> = {
  "usa-to-australia-skilled-worker": "text-orange-600",
  "brazil-to-berlin-residence": "text-emerald-600",
  "us-graduate-visa-uk": "text-indigo-600",
};

const DEFAULT_SCENARIO_BADGE = "bg-slate-100 text-slate-700 border-slate-200";
const DEFAULT_SCENARIO_ACCENT = "text-slate-600";

type HighlightChip = {
  id: string;
  label: string;
  value: string;
  Icon: ComponentType<{ className?: string }>;
};

function formatHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url.replace(/^https?:\/\//, "");
  }
}

interface StepDetailsProps {
  step: Step;
  workstream?: Workstream;
  plan?: AgentPlan;
  onAskFurther?: (query: string) => void;
  onStepStatusUpdate?: (workstreamId: string, stepId: string, instructionIndex: number, status: string) => void;
}

export default function StepDetails({
  step,
  workstream,
  plan,
  onAskFurther,
  onStepStatusUpdate
}: StepDetailsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { selectedText, position, clearSelection } = useTextSelection(containerRef);
  const [completionStatus, setCompletionStatus] = useState<Record<number, string>>(() => {
    const existing = (step as any).instructionCompletions || {};
    const initial = step.instructions?.reduce((acc, _, index) => ({ ...acc, [index]: 'incomplete' }), {}) || {};
    return { ...initial, ...existing };
  });
  const [emailStatus, setEmailStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [userEmail, setUserEmail] = useState('');
  const [gate22Status, setGate22Status] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [calendarStatus, setCalendarStatus] = useState<'idle' | 'generating' | 'success' | 'error'>('idle');
  const [calendarDialogOpen, setCalendarDialogOpen] = useState(false);

  // Update local state when step prop changes (when workstream state updates)
  useEffect(() => {
    const existing = (step as any).instructionCompletions || {};
    const initial = step.instructions?.reduce((acc, _, index) => ({ ...acc, [index]: 'incomplete' }), {}) || {};
    setCompletionStatus({ ...initial, ...existing });
  }, [step]);

  const allComplete = step.instructions 
    ? Object.values(completionStatus).every(status => status === 'complete')
    : false;

  const handleStatusChange = (index: number, status: string) => {
    setCompletionStatus(prev => ({ ...prev, [index]: status }));
    
    // Update the workstream data through the parent
    if (onStepStatusUpdate && workstream && step.id) {
      onStepStatusUpdate(workstream.id, step.id, index, status);
    }
  };

  const handleEmailReport = async () => {
    if (!plan) {
      return;
    }

    if (!userEmail) {
      setEmailDialogOpen(true);
      return;
    }

    await sendEmailReport();
  };

  const sendEmailReport = async () => {
    if (!userEmail || !plan) return;

    setEmailStatus('sending');
    setEmailDialogOpen(false);

    try {
      const response = await fetch('/api/email-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          plan,
          userEmail: userEmail,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || 'Failed to send email');
      }

      setEmailStatus('sent');
      // Reset after 3 seconds
      setTimeout(() => setEmailStatus('idle'), 3000);
    } catch (error) {
      console.error('Email error:', error);
      setEmailStatus('error');
      
      // Show user-friendly error message
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (errorMessage.includes('OAuth') || errorMessage.includes('authorization') || errorMessage.includes('403')) {
        alert('Gmail authorization required. Please re-authorize Gmail access in your Gate.22 dashboard and try again.');
      } else {
        alert(`Email sending failed: ${errorMessage}`);
      }
      
      // Reset after 5 seconds
      setTimeout(() => setEmailStatus('idle'), 5000);
    }
  };

  const handleAddToCalendar = async () => {
    if (!plan) {
      return;
    }

    setCalendarDialogOpen(true);
  };

  const generateCalendarEvents = async () => {
    if (!plan) return;

    setCalendarStatus('generating');
    setCalendarDialogOpen(false);

    try {
      const response = await fetch('/api/calendar-events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ plan }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || 'Failed to generate calendar events');
      }

      const result = await response.json();
      setCalendarStatus('success');

      // Open calendar URLs in new tabs/windows
      if (result.events && result.events.length > 0) {
        const successfulEvents = result.events.filter((event: any) => event.url && !event.error);
        
        if (successfulEvents.length > 0) {
          // Ask user before opening multiple tabs
          const shouldOpen = confirm(`Generated ${result.totalEvents} calendar events. Open ${successfulEvents.length} calendar links to add them to your Google Calendar?`);
          
          if (shouldOpen) {
            successfulEvents.forEach((event: any, index: number) => {
              // Stagger the opening to prevent popup blocking
              setTimeout(() => {
                window.open(event.url, '_blank');
              }, index * 500); // 500ms delay between each
            });
          }
        } else {
          alert('Calendar events generated but no valid links were created.');
        }
      }

      // Reset after 3 seconds
      setTimeout(() => setCalendarStatus('idle'), 3000);
    } catch (error) {
      console.error('Calendar error:', error);
      setCalendarStatus('error');
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Calendar generation failed: ${errorMessage}`);
      
      // Reset after 5 seconds
      setTimeout(() => setCalendarStatus('idle'), 5000);
    }
  };

  const testGate22Connection = async () => {
    setGate22Status('testing');
    
    try {
      const response = await fetch('/api/test-gate22');
      const result = await response.json();
      
      if (result.success) {
        setGate22Status('success');
        alert(`Gate.22 Connection Success!\n\nFound ${result.toolCount} tools:\n${result.availableTools.map((t: any) => `• ${t.name}`).join('\n')}\n\nEmail tools: ${result.emailTools.length > 0 ? result.emailTools.map((t: any) => t.name).join(', ') : 'None found'}`);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      setGate22Status('error');
      alert(`Gate.22 Connection Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'complete': return 'text-green-600 bg-green-50 border-[0.8px] border-green-700';
      case 'pending': return 'text-yellow-600 bg-yellow-50 border-[0.8px] border-yellow-600';
      default: return 'text-gray-600 bg-gray-50 border-[0.8px] border-gray-300';
    }
  };

  const scenarioDefinition = useMemo(() => {
    const scenarioId = step.sources?.find((source) => source.scenarioId)?.scenarioId;
    if (!scenarioId) return undefined;
    return getScenarioById(scenarioId);
  }, [step.sources]);

  const scenarioBadgeClass = scenarioDefinition
    ? SCENARIO_BADGE_CLASSES[scenarioDefinition.id] ?? DEFAULT_SCENARIO_BADGE
    : DEFAULT_SCENARIO_BADGE;

  const scenarioAccentClass = scenarioDefinition
    ? SCENARIO_ACCENT_CLASSES[scenarioDefinition.id] ?? DEFAULT_SCENARIO_ACCENT
    : DEFAULT_SCENARIO_ACCENT;

  const aggregatedDetails = useMemo(() => {
    const fees = new Set<string>();
    const processingTimes = new Set<string>();
    const forms = new Set<string>();
    const officeHours = new Set<string>();
    const websites = new Set<string>();

    (step.sources ?? []).forEach((source) => {
      if (source.fees) {
        source.fees
          .split(/[,;]+/)
          .map((item) => item.trim())
          .filter(Boolean)
          .forEach((item) => fees.add(item));
      }

      if (source.processingTime) {
        processingTimes.add(source.processingTime.trim());
      }

      if (source.formNumbers) {
        source.formNumbers.filter(Boolean).forEach((form) => forms.add(form));
      }

      if (source.officeHours) {
        source.officeHours
          .split('|')
          .map((item) => item.trim())
          .filter(Boolean)
          .forEach((item) => officeHours.add(item));
      }

      if (source.officialWebsite) {
        websites.add(source.officialWebsite);
      }
    });

    return {
      fees: Array.from(fees),
      processingTimes: Array.from(processingTimes),
      forms: Array.from(forms),
      officeHours: Array.from(officeHours),
      websites: Array.from(websites),
    };
  }, [step.sources]);

  const highlightChips = useMemo<HighlightChip[]>(() => {
    const chips: HighlightChip[] = [];

    if (aggregatedDetails.fees.length > 0) {
      chips.push({
        id: 'fees',
        label: 'Fees',
        value: aggregatedDetails.fees.slice(0, 2).join(' · '),
        Icon: DollarSign,
      });
    }

    if (aggregatedDetails.processingTimes.length > 0) {
      chips.push({
        id: 'processing',
        label: 'Processing',
        value: aggregatedDetails.processingTimes.slice(0, 2).join(' · '),
        Icon: Clock,
      });
    }

    if (aggregatedDetails.forms.length > 0) {
      chips.push({
        id: 'forms',
        label: 'Forms',
        value: aggregatedDetails.forms.slice(0, 3).join(', '),
        Icon: FileText,
      });
    }

    if (aggregatedDetails.officeHours.length > 0) {
      chips.push({
        id: 'hours',
        label: 'Office hours',
        value: aggregatedDetails.officeHours.slice(0, 2).join(' · '),
        Icon: Building2,
      });
    }

    return chips;
  }, [aggregatedDetails]);

  const summaryText = useMemo(() => {
    if (step.description && step.description.trim().length > 0) {
      return step.description.trim();
    }

    const excerpt = step.sources?.find((source) => source.excerpt)?.excerpt?.trim();
    if (excerpt) {
      return excerpt.length > 240 ? `${excerpt.slice(0, 237)}...` : excerpt;
    }

    const fallbackLine = step.sources
      ?.flatMap((source) =>
        ((source.excerpt ?? source.title ?? '') as string)
          .split(/\n+/)
          .map((line) => line.trim())
          .filter(Boolean)
      )
      .find((line) => line.length > 40);

    if (fallbackLine) {
      return fallbackLine.length > 240 ? `${fallbackLine.slice(0, 237)}...` : fallbackLine;
    }

    return 'Follow the instructions below using the curated guidance we assembled for this scenario.';
  }, [step.description, step.sources]);

  return <div ref={containerRef} className="flex-1 p-8 bg-background overflow-y-auto relative">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="space-y-4">
          <h1 className="text-3xl font-semibold">{workstream?.title || step.name}</h1>
          {step.description && (
            <p className="text-base text-muted-foreground leading-relaxed">
              {step.description}
            </p>
          )}
          
          <div className="flex flex-wrap items-center gap-6 text-sm pt-2">
            {step.deadline && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>
                  Due: {(() => {
                    const date = new Date(step.deadline as string);
                    return Number.isNaN(date.getTime()) ? step.deadline : format(date, 'MMM dd, yyyy');
                  })()}
                </span>
              </div>
            )}
            {step.estimatedTime && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>Est. time: {step.estimatedTime}</span>
              </div>
            )}
          </div>
        </div>

        {/* Instructions Section */}
        {step.instructions && step.instructions.length > 0 && (
          <div className="space-y-6 pt-4">
            <h2 className="text-xl font-semibold">What you need to do</h2>
            <Accordion type="single" collapsible className="w-full">
              {step.instructions.map((instruction, index) => (
                <AccordionItem key={index} value={`item-${index}`}>
                  <AccordionTrigger className="text-base hover:no-underline">
                    <div className="flex items-center justify-between w-full pr-2">
                      <div className="flex items-center gap-3 flex-1">
                        <span className="flex-shrink-0 w-7 h-7 rounded-full bg-foreground text-background flex items-center justify-center text-sm font-medium">
                          {index + 1}
                        </span>
                        <span className="text-left">{instruction}</span>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className={`gap-2 ${getStatusColor(completionStatus[index] || 'incomplete')}`}
                          >
                            <Check className="w-4 h-4" />
                            <span className="capitalize">{completionStatus[index] || 'incomplete'}</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-background z-50">
                          <DropdownMenuItem 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStatusChange(index, 'incomplete');
                            }}
                            className="cursor-pointer"
                          >
                            Incomplete
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStatusChange(index, 'pending');
                            }}
                            className="cursor-pointer"
                          >
                            Pending
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStatusChange(index, 'complete');
                            }}
                            className="cursor-pointer"
                          >
                            Complete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-4 pl-10">
                    <div className="space-y-5">
                      <div className="rounded-xl border border-border bg-gradient-to-br from-background to-muted/40 p-4">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                          <div className="space-y-3">
                            {scenarioDefinition && (
                              <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${scenarioBadgeClass}`}>
                                <Globe2 className="h-3.5 w-3.5" />
                                {scenarioDefinition.label}
                              </span>
                            )}
                            <p className="text-sm leading-relaxed text-muted-foreground">
                              {summaryText}
                            </p>
                          </div>
                          <div className="hidden min-w-[180px] flex-col gap-2 rounded-lg border border-dashed border-muted-foreground/40 bg-white/60 px-4 py-3 sm:flex">
                            <BadgeCheck className={`h-4 w-4 ${scenarioAccentClass}`} />
                            <p className="text-sm font-medium text-foreground">{step.name}</p>
                            <span className="text-xs text-muted-foreground">Curated guidance from official sources</span>
                          </div>
                        </div>
                        {highlightChips.length > 0 && (
                          <div className="mt-4 flex flex-wrap gap-2">
                            {highlightChips.map(({ id, label, value, Icon }) => (
                              <span
                                key={id}
                                className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs"
                              >
                                <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="font-medium text-foreground">{label}:</span>
                                <span className="text-muted-foreground">{value}</span>
                              </span>
                            ))}
                          </div>
                        )}
                        {aggregatedDetails.websites.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {aggregatedDetails.websites.slice(0, 2).map((website) => (
                              <a
                                key={website}
                                href={website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 transition-colors hover:border-blue-300 hover:text-blue-800"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                                <span>Visit {formatHostname(website)}</span>
                              </a>
                            ))}
                          </div>
                        )}
                      </div>

                      {step.sources && step.sources.length > 0 && (
                        <div className="space-y-3">
                          {step.sources.map((source, sourceIndex) => {
                            const excerptSummary = (source.excerpt || '')
                              .split(/\s+/)
                              .slice(0, 80)
                              .join(' ')
                              .trim();

                            const contentFallback = (
                              (source.excerpt ?? source.title ?? '')
                                .split(/\n+/)
                                .map((line) => line.trim())
                                .filter(Boolean)
                            ).find((line) => line.length > 40);

                            const summary = excerptSummary || (contentFallback ? (contentFallback.length > 220 ? `${contentFallback.slice(0, 217)}...` : contentFallback) : '');

                            const officeHoursValue = source.officeHours
                              ? source.officeHours
                                  .split('|')
                                  .map((item) => item.trim())
                                  .filter(Boolean)
                                  .join(' · ')
                              : '';

                            const metadataChips: Array<{ id: string; label: string; value: string; Icon: ComponentType<{ className?: string }> }> = [];

                            if (source.fees) {
                              metadataChips.push({
                                id: `fee-${sourceIndex}`,
                                label: 'Fees',
                                value: source.fees,
                                Icon: DollarSign,
                              });
                            }

                            if (source.processingTime) {
                              metadataChips.push({
                                id: `processing-${sourceIndex}`,
                                label: 'Processing',
                                value: source.processingTime,
                                Icon: Clock,
                              });
                            }

                            if (source.formNumbers && source.formNumbers.length > 0) {
                              metadataChips.push({
                                id: `forms-${sourceIndex}`,
                                label: 'Forms',
                                value: source.formNumbers.slice(0, 4).join(', '),
                                Icon: FileText,
                              });
                            }

                            if (officeHoursValue) {
                              metadataChips.push({
                                id: `hours-${sourceIndex}`,
                                label: 'Office hours',
                                value: officeHoursValue,
                                Icon: Building2,
                              });
                            }

                            return (
                              <div
                                key={sourceIndex}
                                className="rounded-xl border border-border bg-white px-4 py-3 shadow-sm"
                              >
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                  <div className="flex-1 space-y-2">
                                    <a
                                      href={source.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-800"
                                    >
                                      <ExternalLink className="h-4 w-4" />
                                      <span className="break-words leading-snug">{source.title}</span>
                                    </a>
                                    {summary && (
                                      <p className="text-sm leading-relaxed text-muted-foreground">
                                        {summary}
                                      </p>
                                    )}
                                  </div>
                                  {source.type && (
                                    <span className="hidden rounded-full border px-2 py-0.5 text-xs font-medium uppercase tracking-wide text-muted-foreground sm:inline-flex">
                                      {source.type.replace(/[-_]/g, ' ')}
                                    </span>
                                  )}
                                </div>

                                {metadataChips.length > 0 && (
                                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                                    {metadataChips.map(({ id, label, value, Icon }) => (
                                      <span
                                        key={id}
                                        className="inline-flex items-center gap-1 rounded-full border border-muted-foreground/30 bg-muted/40 px-2 py-1 text-muted-foreground"
                                      >
                                        <Icon className="h-3 w-3 text-muted-foreground" />
                                        <span className="font-medium text-foreground">{label}:</span>
                                        <span>{value}</span>
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {step.officeAddress && (
                        <div className="rounded-xl border border-dashed border-border/60 bg-muted/40 px-4 py-3">
                          <h4 className="flex items-center gap-2 text-sm font-medium text-foreground">
                            <MapPin className="h-4 w-4" />
                            Where to go
                          </h4>
                          <div className="mt-2 text-sm text-muted-foreground">
                            <span>{step.officeAddress}</span>
                            <a
                              href={`https://maps.google.com/?q=${encodeURIComponent(step.officeAddress)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ml-2 inline-flex items-center gap-1 text-blue-600 hover:underline"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                              View on Google Maps
                            </a>
                          </div>
                        </div>
                      )}

                      {step.visualCaption && (
                        <p className="text-sm text-muted-foreground">{step.visualCaption}</p>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        )}

        {/* Actions Section */}
        <div className="flex flex-wrap gap-3 pt-4">
          <Dialog open={calendarDialogOpen} onOpenChange={setCalendarDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                variant="secondary" 
                className="gap-2"
                onClick={handleAddToCalendar}
                disabled={calendarStatus === 'generating' || !plan}
              >
                <Calendar className="w-4 h-4" />
                {calendarStatus === 'generating' ? 'Generating...' : 
                 calendarStatus === 'success' ? 'Generated' : 
                 calendarStatus === 'error' ? 'Error' :
                 'Add to Calendar'}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[400px]">
              <DialogHeader>
                <DialogTitle className="text-lg font-medium text-gray-900">
                  Add to Calendar
                </DialogTitle>
                <DialogDescription className="text-sm text-gray-600">
                  Generate calendar events for all your immigration deadlines and steps.
                </DialogDescription>
              </DialogHeader>
              <div className="py-6">
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Events to be created:</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• Main visa deadline</li>
                      <li>• Step deadlines ({(plan?.workstreams || []).reduce((acc, ws) => acc + (ws.steps || []).filter(s => s.deadline).length, 0)} events)</li>
                      <li>• Timeline milestones ({(plan?.timeline || []).length} events)</li>
                    </ul>
                  </div>
                  <div className="text-xs text-gray-500">
                    Calendar events will open in new tabs. Click "Save" in Google Calendar to add them to your calendar.
                  </div>
                </div>
              </div>
              <DialogFooter className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => setCalendarDialogOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={generateCalendarEvents}
                  disabled={calendarStatus === 'generating'}
                  className="flex-1 bg-black hover:bg-gray-800 text-white"
                >
                  {calendarStatus === 'generating' ? 'Generating...' : 'Generate Events'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                variant="secondary" 
                className="gap-2"
                onClick={handleEmailReport}
                disabled={emailStatus === 'sending' || !plan}
              >
                <Mail className="w-4 h-4" />
                {emailStatus === 'sending' ? 'Sending...' : 
                 emailStatus === 'sent' ? 'Sent' : 
                 emailStatus === 'error' ? 'Error' :
                 'Email Report'}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[400px]">
              <DialogHeader>
                <DialogTitle className="text-lg font-medium text-gray-900">
                  Email Report
                </DialogTitle>
                <DialogDescription className="text-sm text-gray-600">
                  Send your complete immigration plan to your email address.
                </DialogDescription>
              </DialogHeader>
              <div className="py-6">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                    Email address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && userEmail && emailStatus !== 'sending') {
                        sendEmailReport();
                      }
                    }}
                    className="w-full"
                    autoFocus
                  />
                </div>
              </div>
              <DialogFooter className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => setEmailDialogOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={sendEmailReport}
                  disabled={!userEmail || emailStatus === 'sending'}
                  className="flex-1 bg-black hover:bg-gray-800 text-white"
                >
                  {emailStatus === 'sending' ? 'Sending...' : 'Send'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button 
            className="gap-2" 
            disabled={!allComplete}
            variant={allComplete ? "default" : "secondary"}
          >
            <CheckCircle className="w-4 h-4" />
            Mark Complete
          </Button>
        </div>

        {/* Sources Section - REMOVED */}
      </div>

      {/* Text Selection Popover */}
      {selectedText && position && (
        <div
          className="fixed z-50"
          style={{
            left: `${position.x}px`,
            top: `${position.y}px`,
            transform: "translate(-50%, -100%)",
          }}
        >
          <div className="bg-foreground text-background px-4 py-2 rounded-lg shadow-lg">
            <button
              onClick={() => {
                onAskFurther?.(selectedText);
                clearSelection();
              }}
              className="text-sm font-medium hover:opacity-80 transition-opacity"
            >
              Ask Further
            </button>
          </div>
        </div>
      )}
    </div>;
}
