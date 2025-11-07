"use client";

import { Archive as ArchiveIcon } from "@phosphor-icons/react";
import { TodoList } from "./TodoList";
import { TodoItem } from "@/types";

export interface ArchiveViewProps {
  todos: TodoItem[];
  sortBy: "newest" | "oldest" | "alphabetical" | "completed";
  selectedDate: Date;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onUnarchive: (id: string) => void;
  onEdit: (id: string, text: string, emoji?: string) => void;
  handleEditTodo: (todo: TodoItem) => void;
  cancelEditing: () => void;
}

export function ArchiveView({
  todos,
  sortBy,
  selectedDate,
  onToggle,
  onDelete,
  onUnarchive,
  onEdit,
  handleEditTodo,
  cancelEditing,
}: ArchiveViewProps) {
  // Get the 50 most recent archived todos from all time
  // The todos are already filtered and sorted by getArchivedTodos()
  const archivedTodos = todos;

  if (archivedTodos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] px-4">
        <div className="relative mb-6">
          <div className="w-16 h-16 rounded-full bg-muted/50 border border-border flex items-center justify-center">
            <ArchiveIcon className="w-8 h-8 text-muted-foreground" />
          </div>
        </div>
        <h3 className="text-lg font-medium text-foreground mb-1.5">
          No archived tasks
        </h3>
        <p className="text-sm text-muted-foreground text-center max-w-[260px]">
          There are no archived tasks. Deleted tasks will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="text-sm text-muted-foreground mb-2">
        Showing {archivedTodos.length} most recent archived {archivedTodos.length === 1 ? "task" : "tasks"}
      </div>
      <TodoList
        todos={archivedTodos}
        onToggle={onToggle}
        onDelete={onDelete}
        onUnarchive={onUnarchive}
        onEdit={onEdit}
        handleEditTodo={handleEditTodo}
        cancelEditing={cancelEditing}
      />
    </div>
  );
}

