import { X, FileText, Calendar, Info, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserContext } from "@/lib/types";
import { format } from "date-fns";

interface SecondaryHeaderProps {
  userContext?: UserContext;
  onRemoveContext?: (key: keyof UserContext) => void;
  promptSummary?: string;
}

export default function SecondaryHeader({ userContext, onRemoveContext, promptSummary }: SecondaryHeaderProps) {
  const formatValue = (key: string, value: string) => {
    if (key === 'deadline') {
      try {
        const date = new Date(value);
        return format(date, 'MMM dd, yyyy');
      } catch {
        return value;
      }
    }
    return value;
  };

  const contextPills = userContext ? [
    { key: 'visaType' as const, icon: FileText, value: userContext.visaType },
    { key: 'deadline' as const, icon: Calendar, value: userContext.deadline },
    { key: 'currentStatus' as const, icon: Info, value: userContext.currentStatus },
    { key: 'location' as const, icon: MapPin, value: userContext.location },
  ].filter(pill => pill.value) : [];

  if (contextPills.length === 0 && !promptSummary) return null;

  return (
    <div className="sticky top-14 z-40 bg-background border-b border-border">
      <div className="px-6 py-3 flex items-center gap-4 flex-wrap">
        {/* Prompt Summary */}
        {promptSummary && (
          <div className="flex-shrink-0">
            <p className="text-sm font-semibold text-foreground">
              {promptSummary}
            </p>
          </div>
        )}
        
        {/* Context Pills */}
        {contextPills.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            {contextPills.map((pill) => {
              const Icon = pill.icon;
              return (
                <Badge
                  key={pill.key}
                  variant="secondary"
                  className="flex items-center gap-2 px-3 py-2.5 bg-muted hover:bg-muted/80 transition-colors rounded-lg border-0 text-muted-foreground"
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="text-xs font-medium whitespace-nowrap">
                    {formatValue(pill.key, pill.value)}
                  </span>
                  {onRemoveContext && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4 hover:bg-transparent p-0 flex-shrink-0"
                      onClick={() => onRemoveContext(pill.key)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  )}
                </Badge>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
