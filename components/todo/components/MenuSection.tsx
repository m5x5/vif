export interface MenuSectionProps {
  title: string;
  children: React.ReactNode;
}

export const MenuSection = ({ title, children }: MenuSectionProps) => (
  <div className="space-y-0.5">
    <div className="px-2 py-1 text-xs font-medium text-muted-foreground/70">
      {title}
    </div>
    {children}
  </div>
);
