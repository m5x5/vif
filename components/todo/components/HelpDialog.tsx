import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Question, X } from "@phosphor-icons/react";
import { FaqContent } from "../FaqContent";

export interface HelpDialogProps {
  isMobile: boolean;
  showFaqDialog: boolean;
  isLoading: boolean;
  isProcessingSpeech: boolean;
  onFaqDialogChange: (open: boolean) => void;
}

export function HelpDialog({
  isMobile,
  showFaqDialog,
  isLoading,
  isProcessingSpeech,
  onFaqDialogChange,
}: HelpDialogProps) {
  if (isMobile) {
    return (
      <Drawer open={showFaqDialog} onOpenChange={onFaqDialogChange}>
        <DrawerTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 h-11 w-11 rounded-lg hover:bg-muted"
            disabled={isLoading || isProcessingSpeech}
          >
            <Question
              className="w-5 h-5 text-muted-foreground"
              weight="bold"
            />
          </Button>
        </DrawerTrigger>
        <DrawerContent className="px-4 [&>div:first-child]:hidden">
          <DrawerHeader className="text-center pb-1">
            <div className="mx-auto w-12 h-1 bg-muted-foreground/20 rounded-full mb-4" />
            <DrawerTitle className="text-xl font-semibold">
              Help & FAQ
            </DrawerTitle>
            <DrawerDescription className="text-muted-foreground text-sm">
              Frequently asked questions about Vif
            </DrawerDescription>
          </DrawerHeader>

          <div className="overflow-auto max-h-[calc(80vh-140px)] rounded-xl border border-muted p-1 bg-background scrollbar-hide">
            <FaqContent />
          </div>

          <DrawerFooter className="mt-2 pb-6">
            <div className="flex justify-end">
              <DrawerClose asChild>
                <Button
                  variant="secondary"
                  className="rounded-full px-6 h-9 w-full"
                >
                  Done
                </Button>
              </DrawerClose>
            </div>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={showFaqDialog} onOpenChange={onFaqDialogChange}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 h-11 w-11 rounded-lg hover:bg-muted"
          disabled={isLoading || isProcessingSpeech}
        >
          <Question
            className="w-5 h-5 text-muted-foreground"
            weight="bold"
          />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md rounded-2xl border shadow-lg gap-2 p-3 [&>button]:hidden">
        <div className="absolute right-4 top-4">
          <DialogClose asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-full bg-muted hover:bg-muted/80 focus:ring-0"
            >
              <X className="w-3.5 h-3.5" weight="bold" />
              <span className="sr-only">Close</span>
            </Button>
          </DialogClose>
        </div>

        <DialogHeader className="pb-1 space-y-1">
          <DialogTitle className="text-lg font-semibold">
            Help & FAQ
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm">
            Frequently asked questions about Vif
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-auto max-h-[calc(80vh-140px)] my-3 pr-1 rounded-xl border border-muted/50 p-1 bg-background/50 scrollbar-hide">
          <FaqContent />
        </div>

        <DialogFooter className="flex items-center justify-end !mt-0 !pt-0">
          <DialogClose asChild>
            <Button
              variant="secondary"
              className="rounded-full px-5 h-9 w-full"
            >
              Done
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
