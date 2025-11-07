import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  EmojiPicker,
  EmojiPickerContent,
  EmojiPickerFooter,
  EmojiPickerSearch,
} from "@/components/ui/emoji-picker";
import { Smiley } from "@phosphor-icons/react";

export interface EmojiSelectorProps {
  selectedEmoji: string;
  isLoading: boolean;
  onEmojiSelect: (emoji: string) => void;
}

export function EmojiSelector({
  selectedEmoji,
  isLoading,
  onEmojiSelect,
}: EmojiSelectorProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-11 w-11 shrink-0 rounded-none hover:bg-muted-foreground/10"
          disabled={isLoading}
        >
          {selectedEmoji ? (
            <span className="text-lg">{selectedEmoji}</span>
          ) : (
            <Smiley
              className="w-5 h-5 text-muted-foreground"
              weight="fill"
            />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[280px] p-0 rounded-lg"
        side="top"
        align="start"
        sideOffset={12}
      >
        <div className="flex h-[300px] w-full items-center justify-center p-0">
          <EmojiPicker
            onEmojiSelect={(emoji: any) => {
              onEmojiSelect(emoji.emoji);
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
  );
}
