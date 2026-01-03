import { UserContext, Workstream } from "@/lib/types";
import WorkstreamCard from "./WorkstreamCard";

interface DashboardSidebarProps {
  workstreams: Workstream[];
  selectedWorkstream: string | null;
  onSelectWorkstream: (id: string) => void;
}

export default function DashboardSidebar({
  workstreams,
  selectedWorkstream,
  onSelectWorkstream,
}: DashboardSidebarProps) {

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: 'hsl(var(--sidebar-background))' }}>
      {/* Workstreams */}
      <div className="flex-1 overflow-y-auto px-6 pt-6">
        <h3 className="text-xs text-muted-foreground uppercase tracking-wider mb-5 font-medium">
          Workstreams
        </h3>
        
        
        <div>
          {workstreams.map((workstream) => (
            <WorkstreamCard
              key={workstream.id}
              workstream={workstream}
              isSelected={selectedWorkstream === workstream.id}
              onClick={() => onSelectWorkstream(workstream.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
