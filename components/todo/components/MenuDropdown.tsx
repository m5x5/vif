import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { List, Bug } from "@phosphor-icons/react";
import AIConfig from "@/components/ai-config";
import { ThemeToggleButton } from "@/components/theme-toggle";
import { DebugConsole } from "@/components/debug-console";
import { MenuItem, MenuSection } from "./";

export function MenuDropdown() {
  const [showDebugConsole, setShowDebugConsole] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          asChild
          className="outline-0! ring-0! focus:outline-0! focus:ring-0!"
        >
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 h-11 w-11 rounded-lg hover:bg-muted"
          >
            <List className="w-5 h-5 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="w-80 rounded-xl p-1"
          align="start"
          sideOffset={8}
        >
          <MenuSection title="Appearance">
            <div className="px-2 py-1 flex justify-start">
              <ThemeToggleButton />
            </div>
          </MenuSection>

          <DropdownMenuSeparator className="my-1" />

          <MenuSection title="Tools">
            <MenuItem
              icon={Bug}
              label="Debug Console"
              onClick={() => setShowDebugConsole(true)}
            />
          </MenuSection>

          <DropdownMenuSeparator className="my-1" />

          <AIConfig />
        </DropdownMenuContent>
      </DropdownMenu>

      <DebugConsole
        isOpen={showDebugConsole}
        onOpenChange={setShowDebugConsole}
      />
    </>
  );
}
