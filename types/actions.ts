import { TodoItem } from ".";
import { Model } from "@/lib/models";

export type DetermineActionResponse = {
    actions: Array<{
        action: "add" | "delete" | "mark" | "sort" | "edit" | "clear";
        text?: string;
        todoId?: string;
        emoji?: string;
        targetDate?: string;
        time?: string; // Optional time in HH:mm format
        sortBy?: "newest" | "oldest" | "alphabetical" | "completed";
        status?: "done" | "pending" | "archived";
        listToClear?: "all" | "done" | "pending";
    }>;
};

export type DetermineActionFn = (
    text: string,
    emoji?: string,
    todos?: TodoItem[],
    model?: Model,
    timezone?: string,
    apiKey?: string
) => Promise<DetermineActionResponse>; 