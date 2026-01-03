import { Card } from "@/components/ui/card";
import { Workstream } from "@/lib/types";
import * as LucideIcons from "lucide-react";

interface WorkstreamCardProps {
  workstream: Workstream;
  isSelected: boolean;
  onClick: () => void;
}

export default function WorkstreamCard({ workstream, isSelected, onClick }: WorkstreamCardProps) {
  const IconComponent = (LucideIcons as any)[workstream.icon] || LucideIcons.FileText;
  
  // Number of dots matches number of steps
  const totalDots = workstream.steps.length;

  return (
    <div
      className={`p-4 mb-3 cursor-pointer transition-all rounded-lg border ${
        isSelected ? 'bg-card border-border shadow-sm' : 'bg-transparent border-border hover:bg-card/50 hover:shadow-sm'
      }`}
      onClick={onClick}
    >
      <div className="relative">
        {/* Progress Circle - Top Right */}
        <div className="absolute top-0 right-0 w-12 h-12">
          <svg className="transform -rotate-90 w-12 h-12" viewBox="0 0 48 48">
            <circle
              cx="24"
              cy="24"
              r="20"
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
              className="text-border"
            />
            <circle
              cx="24"
              cy="24"
              r="20"
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
              strokeDasharray={`${2 * Math.PI * 20}`}
              strokeDashoffset={`${2 * Math.PI * 20 * (1 - workstream.progress / 100)}`}
              className="text-foreground transition-all duration-500"
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-semibold leading-none">
              {workstream.progress}%
            </span>
          </div>
        </div>

        {/* Icon and Title */}
        <div className="pr-12 space-y-3">
          <IconComponent className="w-5 h-5" />
          
          <h3 className="font-medium text-sm leading-tight">
            {workstream.title}
          </h3>

          {/* Progress Dots */}
          <div className="flex items-center gap-1.5">
            {workstream.steps.map((step, index) => (
              <div
                key={index}
                className={`w-1.5 h-1.5 rounded-full ${
                  step.status === 'complete' ? 'bg-foreground' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
