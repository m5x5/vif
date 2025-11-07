import { useState } from "react";
import { format } from "date-fns";
import { determineAction } from "@/app/actions";
import { TodoItem, SortOption } from "@/types";
import { serializeTodo } from "@/lib/utils/todo";

export interface UseTodoActionsProps {
  todos: TodoItem[];
  selectedDate: Date;
  apiKey: string;
  addTodo: (todo: TodoItem) => Promise<void>;
  updateTodo: (todo: TodoItem) => Promise<void>;
  deleteTodo: (id: string) => Promise<void>;
  setAllTodos: (todos: TodoItem[]) => Promise<void>;
}

export function useTodoActions({
  todos,
  selectedDate,
  apiKey,
  addTodo,
  updateTodo,
  deleteTodo,
  setAllTodos,
}: UseTodoActionsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [editingTodoId, setEditingTodoId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [editEmoji, setEditEmoji] = useState("");

  const handleAction = async (text: string, emoji: string) => {
    if (!text.trim()) return;

    setIsLoading(true);

    let newTodos = [...todos];
    let clearActionExecuted = false;

    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      console.log("API Key:", apiKey);

      // Filter todos for the selected date
      const filteredTodos = todos.filter((todo) => {
        const todoDate = new Date(todo.date);
        return (
          todoDate.toDateString() === selectedDate.toDateString() &&
          !todo.removed
        );
      });

      const actions = (
        await determineAction(
          text,
          emoji || "",
          filteredTodos,
          "vif-openai", // Use OpenAI by default
          timezone,
          apiKey
        )
      ).actions;
      actions.forEach((action) => {
        switch (action.action) {
          case "add":
            let todoDate = selectedDate;
            if (action.targetDate) {
              todoDate = new Date(action.targetDate);
            }
            newTodos.push(
              serializeTodo({
                id: Math.random().toString(36).substring(7),
                text: action.text || text,
                completed: false,
                emoji: action.emoji || emoji,
                date: todoDate,
                time: action.time,
              })
            );
            break;

          case "delete":
            if (action.todoId) {
              newTodos = newTodos.map((todo) =>
                todo.id === action.todoId ? { ...todo, removed: true } : todo
              );
            }
            break;

          case "mark":
            if (action.todoId) {
              newTodos = newTodos.map((todo) => {
                if (todo.id === action.todoId) {
                  // If status is provided, set to that specific status
                  if (action.status === "complete") {
                    return { ...todo, completed: true };
                  } else if (action.status === "incomplete") {
                    return { ...todo, completed: false };
                  } else {
                    // If no status provided, toggle the current status
                    return { ...todo, completed: !todo.completed };
                  }
                }
                return todo;
              });
            }
            break;

          case "sort":
            if (action.sortBy) {
              setSortBy(action.sortBy);
            }
            break;

          case "edit":
            if (action.todoId && action.text) {
              console.log("AI editing todo:", {
                todoId: action.todoId,
                newText: action.text,
                newDate: action.targetDate,
                newEmoji: action.emoji,
              });

              newTodos = newTodos.map((todo) => {
                if (todo.id === action.todoId) {
                  const updatedTodo = serializeTodo({
                    ...todo,
                    text: action.text || todo.text,
                    emoji: action.emoji || todo.emoji,
                    date: action.targetDate
                      ? new Date(action.targetDate)
                      : todo.date,
                    time: action.time || todo.time,
                  });
                  console.log("AI updated todo:", updatedTodo);
                  return updatedTodo;
                }
                return todo;
              });
            }
            break;

          case "clear":
            clearActionExecuted = true;
            if (action.listToClear) {
              switch (action.listToClear) {
                case "all":
                  // Clear all todos for the selected date
                  newTodos = todos.filter(
                    (todo) =>
                      format(todo.date, "yyyy-MM-dd") !==
                      format(selectedDate, "yyyy-MM-dd")
                  );
                  break;
                case "completed":
                  // Clear completed todos for the selected date
                  newTodos = todos.filter(
                    (todo) =>
                      !(
                        todo.completed &&
                        format(todo.date, "yyyy-MM-dd") ===
                          format(selectedDate, "yyyy-MM-dd")
                      )
                  );
                  break;
                case "incomplete":
                  // Clear incomplete todos for the selected date
                  newTodos = todos.filter(
                    (todo) =>
                      !(
                        !todo.completed &&
                        format(todo.date, "yyyy-MM-dd") ===
                          format(selectedDate, "yyyy-MM-dd")
                      )
                  );
                  break;
              }
            }
            break;
        }
      });

      await setAllTodos(newTodos);
    } catch (error) {
      console.error("AI Action failed:", error);
      await addTodo(
        serializeTodo({
          id: Math.random().toString(36).substring(7),
          text,
          completed: false,
          emoji: emoji,
          date: selectedDate,
        })
      );
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTodo = (id: string) => {
    const todo = todos.find((t) => t.id === id);
    if (todo) {
      updateTodo({ ...todo, completed: !todo.completed });
    }
  };

  const startEditing = (id: string, text: string, emoji?: string) => {
    setEditingTodoId(id);
    setEditText(text);
    setEditEmoji(emoji || "");
  };

  const cancelEditing = () => {
    setEditingTodoId(null);
    setEditText("");
    setEditEmoji("");
  };

  const handleEditTodo = (updatedTodo: TodoItem) => {
    if (updatedTodo.text.trim()) {
      console.log("Editing todo:", updatedTodo);

      const todo = todos.find((t) => t.id === updatedTodo.id);
      if (todo) {
        const updated = serializeTodo({
          ...todo,
          text: updatedTodo.text,
          emoji: updatedTodo.emoji,
          time: updatedTodo.time,
        });
        console.log("Updated todo:", updated);
        updateTodo(updated);
      }
    }
    setEditingTodoId(null);
    setEditText("");
    setEditEmoji("");
  };

  const clearAllTodos = () => {
    const remaining = todos.filter(
      (todo) =>
        format(todo.date, "yyyy-MM-dd") !== format(selectedDate, "yyyy-MM-dd")
    );
    setAllTodos(remaining);
  };

  const clearCompletedTodos = () => {
    const remaining = todos.filter(
      (todo) =>
        !(
          todo.completed &&
          format(todo.date, "yyyy-MM-dd") ===
            format(selectedDate, "yyyy-MM-dd")
        )
    );
    setAllTodos(remaining);
  };

  const clearIncompleteTodos = () => {
    const remaining = todos.filter(
      (todo) =>
        !(
          !todo.completed &&
          format(todo.date, "yyyy-MM-dd") ===
            format(selectedDate, "yyyy-MM-dd")
        )
    );
    setAllTodos(remaining);
  };

  return {
    isLoading,
    sortBy,
    setSortBy,
    editingTodoId,
    editText,
    editEmoji,
    setEditText,
    setEditEmoji,
    handleAction,
    toggleTodo,
    startEditing,
    cancelEditing,
    handleEditTodo,
    clearAllTodos,
    clearCompletedTodos,
    clearIncompleteTodos,
  };
}
