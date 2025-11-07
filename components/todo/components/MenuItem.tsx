import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export interface MenuItemProps {
  icon: React.ElementType;
  label: string;
  onClick?: () => void;
  selected?: boolean;
  variant?: "default" | "danger";
  endIcon?: React.ReactNode;
}

export const MenuItem = ({
  icon: Icon,
  label,
  onClick,
  selected,
  variant = "default",
  endIcon,
}: MenuItemProps) => (
  <DropdownMenuItem
    onClick={onClick}
    className={cn(
      "rounded-lg cursor-pointer flex items-center group h-8 px-2",
      selected && "bg-muted",
      variant === "danger" &&
        "text-red-600 focus:text-red-600 focus:bg-red-100 dark:hover:bg-red-900/50 dark:hover:text-red-400 hover:text-red-600"
    )}
  >
    <Icon
      className={cn(
        "w-3.5 h-3.5 mr-2",
        variant === "danger" &&
          "group-hover:text-red-600 dark:group-hover:text-red-400"
      )}
    />
    <span className="text-sm">{label}</span>
    {endIcon && (
      <span
        className={cn(
          "ml-auto",
          typeof selected === "boolean" &&
            !selected &&
            "text-muted-foreground/50",
          variant === "danger" &&
            "group-hover:text-red-600 dark:group-hover:text-red-400"
        )}
      >
        {endIcon}
      </span>
    )}
  </DropdownMenuItem>
);
