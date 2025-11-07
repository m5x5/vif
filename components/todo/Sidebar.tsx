"use client";

import { List, Archive, CaretLeft, CaretRight } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ViewMode } from "@/stores/use-todo-store";

export interface SidebarProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export function Sidebar({ viewMode, onViewModeChange, isCollapsed, onToggleCollapse }: SidebarProps) {
  return (
    <div className={cn(
      "flex flex-col gap-1 p-2 border-r border-border bg-background transition-all duration-200",
      isCollapsed ? "w-14" : "w-48"
    )}>
      <div className="flex flex-col gap-1 flex-1">
        <Button
          variant={viewMode === 'daily' ? 'secondary' : 'ghost'}
          className={cn(
            "w-full gap-2",
            isCollapsed ? "justify-center px-2" : "justify-start",
            viewMode === 'daily' && "bg-secondary"
          )}
          onClick={() => onViewModeChange('daily')}
          title={isCollapsed ? "Daily Tasks" : undefined}
        >
          <List className="w-5 h-5 flex-shrink-0" />
          {!isCollapsed && <span>Daily Tasks</span>}
        </Button>
        
        <Button
          variant={viewMode === 'archive' ? 'secondary' : 'ghost'}
          className={cn(
            "w-full gap-2",
            isCollapsed ? "justify-center px-2" : "justify-start",
            viewMode === 'archive' && "bg-secondary"
          )}
          onClick={() => onViewModeChange('archive')}
          title={isCollapsed ? "Archive" : undefined}
        >
          <Archive className="w-5 h-5 flex-shrink-0" />
          {!isCollapsed && <span>Archive</span>}
        </Button>
      </div>

      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "w-full mt-auto",
          isCollapsed ? "justify-center px-2" : "justify-start"
        )}
        onClick={onToggleCollapse}
        title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {isCollapsed ? (
          <CaretRight className="w-4 h-4" />
        ) : (
          <>
            <CaretLeft className="w-4 h-4" />
            <span className="ml-2 text-xs">Collapse</span>
          </>
        )}
      </Button>
    </div>
  );
}

