import { format } from "date-fns";
import { TodoItem } from "@/types";

/**
 * Utility hook to get dates that have todos for calendar highlighting
 */
export function useDatesWithTodos(todos: TodoItem[]) {
  const dateSet = new Set<string>();
  todos.forEach((todo) => {
    if (!todo.removed) {
      const dateString = format(todo.date, "yyyy-MM-dd");
      dateSet.add(dateString);
    }
  });
  return dateSet;
}
