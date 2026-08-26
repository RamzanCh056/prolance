import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Props {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}
export default function EmptyState({ icon, title, description, action, className }: Props) {
  return (
    <div className={cn("flex flex-col items-center justify-center text-center py-12 px-6 animate-fade-in", className)}>
      <div className="h-16 w-16 rounded-2xl bg-gradient-soft grid place-items-center text-primary mb-4">
        {icon}
      </div>
      <h3 className="font-display font-semibold text-lg">{title}</h3>
      <p className="text-sm text-muted-foreground mt-1 max-w-[260px]">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
