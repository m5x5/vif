import { TodoListProps } from "@/types";
import { useState, useEffect } from "react";
import { TodoItem } from "./TodoItem";
import { useUIStore } from "@/stores/use-ui-store";

export function TodoList({
  todos,
  onToggle,
  onDelete,
  onEdit,
  handleEditTodo,
  cancelEditing,
}: TodoListProps) {
  const [isMobile, setIsMobile] = useState(false);

  // Get edit state from Zustand store
  const editingTodoId = useUIStore((state) => state.editingTodoId);
  const editText = useUIStore((state) => state.editText);
  const editEmoji = useUIStore((state) => state.editEmoji);
  const editTime = useUIStore((state) => state.editTime);
  const setEditText = useUIStore((state) => state.setEditText);
  const setEditEmoji = useUIStore((state) => state.setEditEmoji);
  const setEditTime = useUIStore((state) => state.setEditTime);

  // Effect to detect mobile screens
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkIfMobile();
    window.addEventListener("resize", checkIfMobile);
    return () => window.removeEventListener("resize", checkIfMobile);
  }, []);

  // Initialize edit time when starting to edit
  useEffect(() => {
    if (editingTodoId) {
      const todo = todos.find((t) => t.id === editingTodoId);
      setEditTime(todo?.time || "");
    }
  }, [editingTodoId, todos, setEditTime]);

  return (
    <>
      {todos.map((todo) => (
        <TodoItem
          key={todo.id}
          todo={todo}
          isEditing={editingTodoId === todo.id}
          editText={editText}
          editEmoji={editEmoji}
          editTime={editTime}
          isMobile={isMobile}
          onToggle={onToggle}
          onDelete={onDelete}
          onEdit={onEdit}
          setEditText={setEditText}
          setEditEmoji={setEditEmoji}
          setEditTime={setEditTime}
          handleEditTodo={handleEditTodo}
          cancelEditing={cancelEditing}
        />
      ))}
    </>
  );
}
