import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CaretDown } from "@phosphor-icons/react";
import { CircularProgress } from "../CircularProgress";
import { formatDate, filterTodosByDate, calculateProgress } from "@/lib/utils/todo";
import { TodoItem } from "@/types";

export interface TodoHeaderProps {
  selectedDate: Date;
  todos: TodoItem[];
  datesWithTodos: Set<string>;
  onDateChange: (date: Date) => void;
}

export function TodoHeader({
  selectedDate,
  todos,
  datesWithTodos,
  onDateChange,
}: TodoHeaderProps) {
  // Calculate statistics internally
  const { filteredTodos, progress, remainingCount, completedCount } = useMemo(() => {
    const filtered = filterTodosByDate(todos, selectedDate);
    return {
      filteredTodos: filtered,
      progress: calculateProgress(filtered),
      remainingCount: filtered.filter((todo) => !todo.completed).length,
      completedCount: filtered.filter((todo) => todo.completed).length,
    };
  }, [todos, selectedDate]);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              className="!p-1 font-semibold text-2xl hover:no-underline flex items-center gap-1"
            >
              {formatDate(selectedDate)}
              <CaretDown className="w-4 h-4 text-muted-foreground" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => {
                if (date) {
                  onDateChange(date);
                }
              }}
              datesWithTodos={datesWithTodos}
              initialFocus
            />
          </PopoverContent>
        </Popover>
        <CircularProgress progress={progress} />
      </div>
      <div className="!ml-1.5 text-sm text-muted-foreground flex items-center gap-1">
        <span>{remainingCount} To Dos</span>
        {completedCount > 0 && (
          <>
            <span className="text-muted-foreground/50">•</span>
            <span className="text-muted-foreground/50">
              {completedCount} Completed
            </span>
          </>
        )}
      </div>
    </div>
  );
}
