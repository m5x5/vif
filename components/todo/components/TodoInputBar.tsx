import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { InputLoadingIndicator } from "../InputLoadingIndicator";
import { MicButton } from "../MicButton";
import { MenuDropdown } from "./MenuDropdown";
import { EmojiSelector } from "./EmojiSelector";
import { HelpDialog } from "./HelpDialog";
import { useMicrophonePermission } from "@/hooks/use-microphone-permission";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { useMobileDetection, useStandaloneDetection } from "../hooks";

export interface TodoInputBarProps {
  isLoading: boolean;
  apiKey: string;
  onAction: (text: string, emoji: string) => void;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
}

export function TodoInputBar({
  isLoading,
  apiKey,
  onAction,
  inputRef,
}: TodoInputBarProps) {
  // Internal state
  const [newTodo, setNewTodo] = useState("");
  const [selectedEmoji, setSelectedEmoji] = useState<string>("😊");
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [showFaqDialog, setShowFaqDialog] = useState(false);

  // Device detection
  const isMobile = useMobileDetection();
  const isStandalone = useStandaloneDetection();

  // Microphone and speech recognition
  const micPermission = useMicrophonePermission();
  const { isRecording, isProcessingSpeech, startRecording, stopRecording } =
    useSpeechRecognition(apiKey);

  // Event handlers
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !isLoading) {
      e.preventDefault();
      onAction(newTodo, selectedEmoji);
      setNewTodo("");
    }
  };

  const handleSpeechResult = async () => {
    if (isRecording) {
      const text = await stopRecording();
      if (text) {
        setNewTodo(text);
      }
    }
  };

  const handleSendAction = () => {
    onAction(newTodo, selectedEmoji);
    setNewTodo("");
  };

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 p-4 bg-background border-t transition-all duration-200 ease-in-out",
        isStandalone && "pb-8",
        isInputFocused && "pb-4"
      )}
    >
      <div className="max-w-md mx-auto flex items-center space-x-2">
        <MenuDropdown />

        <div className="flex-1 flex items-start bg-muted/80 rounded-lg overflow-hidden">
          <EmojiSelector
            selectedEmoji={selectedEmoji}
            isLoading={isLoading}
            onEmojiSelect={setSelectedEmoji}
          />

          <Textarea
            ref={inputRef}
            placeholder={
              isLoading ? "Processing..." : "insert or send action"
            }
            value={newTodo}
            onChange={(e) => setNewTodo(e.target.value)}
            onKeyDown={handleInputKeyDown}
            onFocus={() => setIsInputFocused(true)}
            onBlur={() => setIsInputFocused(false)}
            autoResize
            rows={1}
            className={cn(
              "flex-1 border-0 !bg-transparent focus:!outline-none focus:!ring-0 focus-visible:!ring-0 focus-visible:!ring-offset-0 min-h-[60px] max-h-[200px] rounded-none shadow-none px-2 py-2.5",
              isLoading && "text-muted-foreground"
            )}
            disabled={isLoading || isProcessingSpeech}
          />

          {isLoading && <InputLoadingIndicator showText={true} />}
          {isProcessingSpeech && <InputLoadingIndicator />}

          <MicButton
            isRecording={isRecording}
            isProcessingSpeech={isProcessingSpeech}
            micPermission={micPermission}
            startRecording={startRecording}
            stopRecording={handleSpeechResult}
            hasText={!!newTodo.trim()}
            onSend={handleSendAction}
          />
        </div>

        <HelpDialog
          isMobile={isMobile}
          showFaqDialog={showFaqDialog}
          isLoading={isLoading}
          isProcessingSpeech={isProcessingSpeech}
          onFaqDialogChange={setShowFaqDialog}
        />
      </div>
    </div>
  );
}
