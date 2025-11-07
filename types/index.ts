export type TodoItemStatus = "pending" | "done" | "archived";

export interface TodoItem {
  id: string;
  todo_item_id?: string; // Filename format: '${id}.json' (for compatibility with other programs)
  text: string;
  todo_item_status: TodoItemStatus;
  emoji?: string;
  date: Date;
  time?: string; // Optional time in HH:mm format
  removed?: boolean; // Mark as removed instead of deleting
}

export type SortOption = "newest" | "oldest" | "alphabetical" | "completed";

export interface CircularProgressProps {
  progress: number;
  size?: number;
}

export interface TodoListProps {
  todos: TodoItem[];
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onUnarchive?: (id: string) => void;
  onEdit: (id: string, text: string, emoji?: string) => void;
  handleEditTodo: (todo: TodoItem) => void;
  cancelEditing: () => void;
}

export interface FaqContentProps {
  // Empty interface for now, can be extended if needed
}

export interface MicButtonProps {
  isRecording: boolean;
  isProcessingSpeech: boolean;
  micPermission: "checking" | "granted" | "denied" | "prompt";
  startRecording: () => void;
  stopRecording: () => void;
  hasText: boolean;
  onSend: () => void;
}

export interface CircleCheckboxProps {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  className?: string;
} 
