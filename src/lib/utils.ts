export function formatCurrency(amount: number, currency: string = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDateTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return isoString;
  }
}

export function getStatusBadgeClass(status: string): string {
  switch (status) {
    case "READY_FOR_ANALYSIS":
    case "VALIDATED":
      return "bg-emerald-950/80 text-emerald-400 border-emerald-800/80";
    case "INVALID":
      return "bg-rose-950/80 text-rose-400 border-rose-800/80";
    case "UNDER_REVIEW":
    case "INVESTIGATION_CANDIDATE":
      return "bg-amber-950/80 text-amber-400 border-amber-800/80";
    default:
      return "bg-zinc-800 text-zinc-300 border-zinc-700";
  }
}

export function getGraphBadgeClass(status: string): string {
  switch (status) {
    case "SYNCED":
      return "text-cyan-400";
    case "PENDING":
      return "text-amber-400";
    case "FAILED":
      return "text-rose-400";
    default:
      return "text-zinc-500";
  }
}
