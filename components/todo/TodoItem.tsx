import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PencilSimple, Check, Smiley, Clock, XIcon, ArrowCounterClockwise } from "@phosphor-icons/react";
import { CircleCheckbox } from "./CircleCheckbox";
import { TodoItem as TodoItemType } from "@/types";
import { useRef, useEffect } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  EmojiPicker,
  EmojiPickerContent,
  EmojiPickerFooter,
  EmojiPickerSearch,
} from "@/components/ui/emoji-picker";
import { TimePicker, formatTimeDisplay } from "./TimePicker";

export interface TodoItemProps {
  todo: TodoItemType;
  isEditing: boolean;
  editText: string;
  editEmoji: string;
  editTime: string;
  isMobile: boolean;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onUnarchive?: (id: string) => void;
  onEdit: (id: string, text: string, emoji?: string) => void;
  setEditText: (text: string) => void;
  setEditEmoji: (emoji: string) => void;
  setEditTime: (time: string) => void;
  handleEditTodo: (todo: TodoItemType) => void;
  cancelEditing: () => void;
}

export function TodoItem({
  todo,
  isEditing,
  editText,
  editEmoji,
  editTime,
  isMobile,
  onToggle,
  onDelete,
  onUnarchive,
  onEdit,
  setEditText,
  setEditEmoji,
  setEditTime,
  handleEditTodo,
  cancelEditing,
}: TodoItemProps) {
  const editInputRef = useRef<HTMLInputElement>(null);

  // Handler for input changes with cursor position preservation
  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const newValue = input.value;
    const newPosition = input.selectionStart;

    setEditText(newValue);
    // Schedule cursor position update after state change
    requestAnimationFrame(() => {
      if (input && newPosition !== null) {
        input.setSelectionRange(newPosition, newPosition);
      }
    });
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(todo.id);
  };

  const handleUnarchive = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onUnarchive) {
      onUnarchive(todo.id);
    }
  };

  return (
    <div
      className={cn(
        "group flex items-start px-4 py-2.5 gap-3",
        todo.completed ? "text-muted-foreground/50" : "hover:bg-muted/50",
        isEditing && "bg-muted/80 rounded-lg",
        !isEditing && "cursor-pointer",
        "transition-colors"
      )}
      onClick={(e: React.MouseEvent) => {
        if (!isEditing && e.target === e.currentTarget) {
          onToggle(todo.id);
        }
      }}
    >
      {isEditing ? (
        <>
          <div className="flex-1 flex items-center gap-2 py-0.5">
            <div className="flex items-center gap-2 rounded-lg bg-background p-1 flex-1 border shadow-sm">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 rounded-md hover:bg-muted"
                  >
                    {editEmoji ? (
                      <span className="text-base">{editEmoji}</span>
                    ) : (
                      <Smiley
                        className="w-4 h-4 text-muted-foreground"
                        weight="fill"
                      />
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-[280px] p-0 rounded-xl"
                  side="top"
                  align="start"
                  sideOffset={12}
                >
                  <div className="flex h-[300px] w-full items-center justify-center p-0">
                    <EmojiPicker
                      onEmojiSelect={(emoji: any) => {
                        setEditEmoji(emoji.emoji);
                      }}
                      className="h-full"
                    >
                      <EmojiPickerSearch placeholder="Search emoji..." />
                      <EmojiPickerContent className="h-[220px]" />
                      <EmojiPickerFooter className="border-t-0 p-1.5" />
                    </EmojiPicker>
                  </div>
                </PopoverContent>
              </Popover>

              <Input
                ref={editInputRef}
                value={editText}
                onChange={handleEditInputChange}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleEditTodo({
                      ...todo,
                      text: editText,
                      emoji: editEmoji,
                      time: editTime,
                    });
                  } else if (e.key === "Escape") {
                    cancelEditing();
                  }
                }}
                autoFocus
                className="flex-1 h-8 py-0 text-sm bg-transparent border-0 shadow-none focus-visible:ring-0 px-2 rounded-none"
                placeholder="Edit todo..."
              />

              <TimePicker time={editTime} onChange={setEditTime} />
            </div>

            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive rounded-md hover:bg-muted"
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  cancelEditing();
                }}
              >
                <XIcon className="w-4 h-4" weight="bold" />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                className="h-8 w-8 shrink-0 rounded-md"
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  const updatedTodo = {
                    ...todo,
                    text: editText,
                    emoji: editEmoji,
                    time: editTime,
                  };
                  handleEditTodo(updatedTodo);
                }}
              >
                <Check className="w-4 h-4" weight="bold" />
              </Button>
            </div>
          </div>
        </>
      ) : (
        <>
          <div onClick={(e: React.MouseEvent) => e.stopPropagation()} className="mt-0.5">
            <CircleCheckbox
              checked={todo.completed}
              onCheckedChange={() => onToggle(todo.id)}
              className={cn(
                todo.completed
                  ? "border-muted-foreground/50 bg-muted-foreground/20"
                  : "hover:border-muted-foreground/70"
              )}
            />
          </div>
          <div
            className="flex-1 flex items-start min-w-0 cursor-pointer"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              onToggle(todo.id);
            }}
          >
            {todo.emoji && (
              <span className="mr-2 text-base flex-shrink-0 mt-0.5">
                {todo.emoji}
              </span>
            )}
            <div className="flex flex-col min-w-0">
              <span
                className={cn(
                  todo.text.length > 50
                    ? "text-xs leading-relaxed"
                    : todo.text.length > 30
                    ? "text-sm leading-relaxed"
                    : "text-[15px] leading-relaxed",
                  todo.completed && "line-through"
                )}
              >
                {todo.text}
              </span>
              {todo.time && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                  <Clock className="w-3 h-3" weight="fill" />
                  <span>{formatTimeDisplay(todo.time)}</span>
                </div>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-7 w-7 text-muted-foreground hover:text-foreground",
              isMobile
                ? "opacity-100"
                : "opacity-0 group-hover:opacity-100 transition-opacity"
            )}
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              onEdit(todo.id, todo.text, todo.emoji);
            }}
          >
            <PencilSimple className="w-4 h-4" weight="bold" />
          </Button>
          {onUnarchive && todo.removed && (
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-7 w-7 text-muted-foreground hover:text-primary",
                isMobile
                  ? "opacity-100"
                  : "opacity-0 group-hover:opacity-100 transition-opacity"
              )}
              onClick={handleUnarchive}
              title="Unarchive"
            >
              <ArrowCounterClockwise className="w-4 h-4" weight="bold" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-7 w-7 text-muted-foreground hover:text-destructive",
              isMobile
                ? "opacity-100"
                : "opacity-0 group-hover:opacity-100 transition-opacity"
            )}
            onClick={handleDelete}
          >
            <XIcon className="w-4 h-4" weight="bold" />
          </Button>
        </>
      )}
    </div>
  );
}
