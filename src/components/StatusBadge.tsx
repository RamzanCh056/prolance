import { cn } from "@/lib/utils";
import type { ClientStatus } from "@/lib/store";

const styles: Record<ClientStatus, string> = {
  Lead: "bg-warning/15 text-warning border-warning/30",
  Active: "bg-primary/15 text-primary border-primary/30",
  Completed: "bg-success/15 text-success border-success/30",
};

export default function StatusBadge({ status, className }: { status: ClientStatus; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full border", styles[status], className)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}
