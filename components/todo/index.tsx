"use client";

import { AI } from "remotestorage-module-ai-wallet";
import { useState, useEffect, Suspense, useRef } from "react";
import { useRemoteStorage } from "@/hooks/use-remote-storage";
import { sortTodos } from "@/lib/utils/todo";

// Feature components
import { TodoHeader, TodoInputBar } from "./components";
import { TodoSkeleton } from "./TodoSkeleton";
import { TodoList } from "./TodoList";
import { EmptyState } from "./EmptyState";
import { LoadingState } from "./LoadingState";

// Feature hooks
import {
  useClientHydration,
  useDatesWithTodos,
  useTodoActions,
} from "./hooks";

export default function Todo() {
  console.time("Time to todos");

  // UI State
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [apiKey, setApiKey] = useState<string>("");

  // Refs
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Custom hooks
  const isClientLoaded = useClientHydration();

  // RemoteStorage for both AI wallet and Todonna
  const remoteStorage = useRemoteStorage({
    modules: [AI],
    accessClaims: { "ai-wallet": "rw", "todonna": "rw" },
    apiKeys: { googledrive: "" },
  });

  // Fetch API key from RemoteStorage when available
  useEffect(() => {
    (remoteStorage as any)?.aiWallet
      .getConfig()
      .then((config: any) => {
        console.log({ config });
        if (config && config.apiKey) {
          setApiKey(config.apiKey);
        }
      })
      .catch((error: any) => {
        console.error("Failed to fetch API key from RemoteStorage:", error);
      });
  }, [remoteStorage]);

  // Unified todo actions hook (includes Todonna integration)
  const {
    todos,
    isLoadingTodonna,
    isLoading,
    sortBy,
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
    handleDeleteTodo,
  } = useTodoActions({
    remoteStorage,
    selectedDate,
    apiKey,
  });

  // Get dates with todos for calendar highlighting
  const datesWithTodos = useDatesWithTodos(todos);

  // Handler that receives both text and emoji from TodoInputBar
  const handleActionWithEmoji = (text: string, emoji: string) => {
    handleAction(text, emoji);
  };

  const focusInput = () => {
    inputRef.current?.focus();
  };

  // Filter and sort todos for display
  const filteredTodos = isClientLoaded
    ? todos.filter((todo) => {
        const todoDate = new Date(todo.date);
        return (
          todoDate.toDateString() === selectedDate.toDateString() &&
          !todo.removed
        );
      })
    : [];

  const sortedTodos = isClientLoaded ? sortTodos(filteredTodos, sortBy) : [];

  return (
    <div className="max-w-md w-full mx-auto p-4 space-y-4 pb-24 flex flex-col">
      <TodoHeader
        selectedDate={selectedDate}
        todos={todos}
        datesWithTodos={datesWithTodos}
        onDateChange={setSelectedDate}
      />

      <div className="-mx-4">
        <Suspense fallback={<TodoSkeleton />}>
          {!isClientLoaded || isLoadingTodonna ? (
            <LoadingState />
          ) : sortedTodos.length === 0 && isLoading ? (
            <LoadingState />
          ) : sortedTodos.length === 0 && !isLoading ? (
            <EmptyState selectedDate={selectedDate} focusInput={focusInput} />
          ) : (
            <TodoList
              todos={sortedTodos}
              onToggle={toggleTodo}
              onDelete={handleDeleteTodo}
              onEdit={startEditing}
              editingTodoId={editingTodoId}
              editText={editText}
              editEmoji={editEmoji}
              setEditText={setEditText}
              setEditEmoji={setEditEmoji}
              handleEditTodo={handleEditTodo}
              cancelEditing={cancelEditing}
            />
          )}
        </Suspense>
      </div>

      <TodoInputBar
        isLoading={isLoading}
        apiKey={apiKey}
        onAction={handleActionWithEmoji}
        inputRef={inputRef}
      />
    </div>
  );
}
