"use client";

import { AI } from "remotestorage-module-ai-wallet";
import { useEffect, Suspense, useRef } from "react";
import { format } from "date-fns";
import { useRemoteStorage } from "@/hooks/use-remote-storage";
import { sortTodos } from "@/lib/utils/todo";

// Feature components
import { TodoHeader, TodoInputBar } from "./components";
import { TodoSkeleton } from "./TodoSkeleton";
import { TodoList } from "./TodoList";
import { EmptyState } from "./EmptyState";
import { LoadingState } from "./LoadingState";
import { Sidebar } from "./Sidebar";
import { ArchiveView } from "./ArchiveView";

// Feature hooks
import { useClientHydration } from "./hooks";

// Stores
import { useTodoStore, type ViewMode } from "@/stores/use-todo-store";
import { useUIStore } from "@/stores/use-ui-store";

export default function Todo() {
  // Refs
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Custom hooks
  const isClientLoaded = useClientHydration();

  // RemoteStorage for both AI wallet, Todonna, and Logs
  const remoteStorage = useRemoteStorage({
    modules: [AI],
    accessClaims: { "ai-wallet": "rw", "todonna": "rw", "logs": "rw" },
    apiKeys: { googledrive: "" },
  });

  // Get state and actions from stores
  const todos = useTodoStore((state) => state.todos);
  const selectedDate = useTodoStore((state) => state.selectedDate);
  const sortBy = useTodoStore((state) => state.sortBy);
  const viewMode = useTodoStore((state) => state.viewMode);
  const setSelectedDate = useTodoStore((state) => state.setSelectedDate);
  const setViewMode = useTodoStore((state) => state.setViewMode);
  const setRemoteStorage = useTodoStore((state) => state.setRemoteStorage);
  const setApiKey = useTodoStore((state) => state.setApiKey);
  const apiKey = useTodoStore((state) => state.apiKey);
  const handleAction = useTodoStore((state) => state.handleAction);
  const toggleTodo = useTodoStore((state) => state.toggleTodo);
  const deleteTodo = useTodoStore((state) => state.deleteTodo);
  const unarchiveTodo = useTodoStore((state) => state.unarchiveTodo);
  const getArchivedTodos = useTodoStore((state) => state.getArchivedTodos);

  const isLoadingTodonna = useUIStore((state) => state.isLoadingTodonna);
  const isLoading = useUIStore((state) => state.isLoading);
  const startEditing = useUIStore((state) => state.startEditing);
  const cancelEditing = useUIStore((state) => state.cancelEditing);

  // Initialize RemoteStorage in store
  useEffect(() => {
    if (remoteStorage) {
      setRemoteStorage(remoteStorage);
    }
  }, [remoteStorage, setRemoteStorage]);

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
  }, [remoteStorage, setApiKey]);

  // Compute values based on reactive state
  const filteredTodos = isClientLoaded
    ? todos.filter((todo) => {
        const todoDate = new Date(todo.date);
        const dateMatches = todoDate.toDateString() === selectedDate.toDateString();
        
        if (viewMode === 'archive') {
          return dateMatches && todo.removed === true;
        }
        
        return dateMatches && !todo.removed;
      })
    : [];

  const sortedTodos = isClientLoaded ? sortTodos(filteredTodos, sortBy) : [];

  const datesWithTodos = new Set(
    todos
      .filter((todo) => !todo.removed)
      .map((todo) => format(new Date(todo.date), 'yyyy-MM-dd'))
  );

  // Handler that receives both text and emoji from TodoInputBar
  const handleActionWithEmoji = (text: string, emoji: string) => {
    handleAction(text, emoji);
  };

  const focusInput = () => {
    inputRef.current?.focus();
  };

  // Handle todo editing
  const handleEditTodo = (updatedTodo: any) => {
    const updateTodo = useTodoStore.getState().updateTodo;
    if (updatedTodo.text.trim()) {
      updateTodo(updatedTodo);
    }
    cancelEditing();
  };

  const handleStartEditing = (id: string, text: string, emoji?: string) => {
    const todo = todos.find((t) => t.id === id);
    startEditing(id, text, emoji || '', todo?.time || '');
  };

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
  };

  const handleDateChange = (date: Date) => {
    setSelectedDate(date);
  };

  const handleUnarchive = (id: string) => {
    unarchiveTodo(id).catch((error) => {
      console.error('Failed to unarchive todo:', error);
    });
  };

  const isSidebarCollapsed = useUIStore((state) => state.isSidebarCollapsed);
  const toggleSidebar = useUIStore((state) => state.toggleSidebar);

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <Sidebar 
        viewMode={viewMode} 
        onViewModeChange={handleViewModeChange}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={toggleSidebar}
      />
      
      {/* Main Content */}
      <div className="flex-1 max-w-md w-full mx-auto p-4 space-y-4 pb-24 flex flex-col">
        <TodoHeader
          selectedDate={selectedDate}
          todos={todos}
          datesWithTodos={datesWithTodos}
          onDateChange={handleDateChange}
        />

        <div className="-mx-4">
          <Suspense fallback={<TodoSkeleton />}>
            {!isClientLoaded || isLoadingTodonna ? (
              <LoadingState />
            ) : viewMode === 'archive' ? (
              <ArchiveView
                todos={getArchivedTodos()}
                sortBy={sortBy}
                selectedDate={selectedDate}
                onToggle={toggleTodo}
                onDelete={deleteTodo}
                onUnarchive={handleUnarchive}
                onEdit={handleStartEditing}
                handleEditTodo={handleEditTodo}
                cancelEditing={cancelEditing}
              />
            ) : sortedTodos.length === 0 && isLoading ? (
              <LoadingState />
            ) : sortedTodos.length === 0 && !isLoading ? (
              <EmptyState selectedDate={selectedDate} focusInput={focusInput} />
            ) : (
              <TodoList
                todos={sortedTodos}
                onToggle={toggleTodo}
                onDelete={deleteTodo}
                onEdit={handleStartEditing}
                handleEditTodo={handleEditTodo}
                cancelEditing={cancelEditing}
              />
            )}
          </Suspense>
        </div>

        {viewMode === 'daily' && (
          <TodoInputBar
            isLoading={isLoading}
            apiKey={apiKey}
            onAction={handleActionWithEmoji}
            inputRef={inputRef}
          />
        )}
      </div>
    </div>
  );
}
