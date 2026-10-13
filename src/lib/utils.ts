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
    });
  } catch {
    return isoString;
  }
}

export function getStatusBadgeClass(status: string): string {
  switch (status) {
    case "VALIDATED":
      return "bg-emerald-50 text-emerald-700 border-emerald-200/80";
    case "FLAGGED":
      return "bg-rose-50 text-rose-700 border-rose-200/80";
    case "INVALID":
      return "bg-slate-100 text-slate-700 border-slate-300";
    case "RECEIVED":
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
}

export function getGraphBadgeClass(status: string): string {
  switch (status) {
    case "SYNCED":
      return "text-teal-600 bg-teal-50 border-teal-200";
    case "PENDING":
      return "text-amber-600 bg-amber-50 border-amber-200";
    case "FAILED":
      return "text-rose-600 bg-rose-50 border-rose-200";
    default:
      return "text-slate-500 bg-slate-50 border-slate-200";
  }
}
