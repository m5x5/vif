import React from "react";

export function InputLoadingIndicator({
  showText = false,
}: {
  showText?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 w-full">
      <div className="relative flex gap-1">
        <div className="h-2 w-2 rounded-full bg-primary/80 animate-bounce [animation-delay:-0.3s]"></div>
        <div className="h-2 w-2 rounded-full bg-primary/80 animate-bounce [animation-delay:-0.15s]"></div>
        <div className="h-2 w-2 rounded-full bg-primary/80 animate-bounce"></div>
      </div>
      {showText && (
        <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
          vif is thinking...
        </span>
      )}
    </div>
  );
}
