import { useState, useEffect } from "react";
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
  const [hasUsedApp, setHasUsedApp] = useState(false);

  // Device detection
  const isMobile = useMobileDetection();
  const isStandalone = useStandaloneDetection();

  // Microphone and speech recognition
  const micPermission = useMicrophonePermission();
  const { isRecording, isProcessingSpeech, startRecording, stopRecording } =
    useSpeechRecognition(apiKey);

  // Check if user has used the app before
  useEffect(() => {
    const hasUsed = localStorage.getItem("vif-has-used");
    setHasUsedApp(!!hasUsed);
  }, []);

  // Mark app as used when first action is performed
  const markAppAsUsed = () => {
    if (!hasUsedApp) {
      localStorage.setItem("vif-has-used", "true");
      setHasUsedApp(true);
    }
  };

  // Event handlers
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !isLoading) {
      e.preventDefault();
      const trimmedText = newTodo.trim();
      if (trimmedText) {
        onAction(trimmedText, selectedEmoji);
        setNewTodo("");
        markAppAsUsed();
      }
    }
  };

  const handleSpeechResult = async () => {
    if (isRecording) {
      const text = await stopRecording();
      if (text) {
        // Auto-send after voice recording
        onAction(text, selectedEmoji);
        markAppAsUsed();
      }
    }
  };

  const handleSendAction = () => {
    const trimmedText = newTodo.trim();
    if (trimmedText) {
      onAction(trimmedText, selectedEmoji);
      setNewTodo("");
      markAppAsUsed();
    }
  };

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 p-4 bg-background border-t transition-all duration-200 ease-in-out",
        isStandalone && "pb-8",
        isInputFocused && "pb-4"
      )}
    >
      <div className="max-w-md mx-auto flex items-center gap-2">
        <MenuDropdown />

        <div className="flex-1 flex items-center bg-muted/80 rounded-lg overflow-hidden min-h-[44px]">
          <EmojiSelector
            selectedEmoji={selectedEmoji}
            isLoading={isLoading}
            onEmojiSelect={setSelectedEmoji}
          />

          <div className="flex-1 flex items-center min-h-[44px]">
            {isLoading || isProcessingSpeech ? (
              <InputLoadingIndicator showText={!isProcessingSpeech} />
            ) : (
              <Textarea
                ref={inputRef}
                placeholder="add task or action"
                value={newTodo}
                onChange={(e) => setNewTodo(e.target.value)}
                onKeyDown={handleInputKeyDown}
                onFocus={() => setIsInputFocused(true)}
                onBlur={() => setIsInputFocused(false)}
                autoResize
                rows={1}
                className={cn(
                  "flex-1 border-0 !bg-transparent focus:!outline-none focus:!ring-0 focus-visible:!ring-0 focus-visible:!ring-offset-0 min-h-[44px] max-h-[200px] rounded-none shadow-none px-3 py-2 resize-none leading-normal"
                )}
                disabled={isLoading || isProcessingSpeech}
              />
            )}
          </div>

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

        {!hasUsedApp && (
          <HelpDialog
            isMobile={isMobile}
            showFaqDialog={showFaqDialog}
            isLoading={isLoading}
            isProcessingSpeech={isProcessingSpeech}
            onFaqDialogChange={setShowFaqDialog}
          />
        )}
      </div>
    </div>
  );
}
