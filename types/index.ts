export interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
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
