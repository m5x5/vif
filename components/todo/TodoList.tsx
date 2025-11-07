import { TodoListProps } from "@/types";
import { useState, useEffect } from "react";
import { TodoItem } from "./TodoItem";

export function TodoList({
  todos,
  onToggle,
  onDelete,
  onEdit,
  editingTodoId,
  editText,
  editEmoji,
  setEditText,
  setEditEmoji,
  handleEditTodo,
  cancelEditing,
}: TodoListProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [editTime, setEditTime] = useState<string>("");

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
  }, [editingTodoId, todos]);

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
