import { AlertCircle, LoaderCircle } from "lucide-react";
export function ErrorBox({ children }) {
  return children ? (
    <div
      role="alert"
      className="mb-4 flex gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm font-medium text-rose-700"
    >
      <AlertCircle size={18} />
      {children}
    </div>
  ) : null;
}
export function Loading() {
  return (
    <div className="flex justify-center gap-2 py-12 text-sm font-semibold text-slate-500">
      <LoaderCircle className="animate-spin text-indigo-600" /> Loading...
    </div>
  );
}
export function Empty({ title, desc, children }) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
      <h3 className="text-lg font-extrabold">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
        {desc}
      </p>
      <div className="mt-5">{children}</div>
    </div>
  );
}
export function Badge({ status }) {
  let s = String(status || "pending")
    .toLowerCase()
    .replaceAll("_", " ");
  let c =
    s.includes("approve") || s === "returned" || s === "available"
      ? "bg-emerald-50 text-emerald-700"
      : s.includes("reject")
        ? "bg-rose-50 text-rose-700"
        : s.includes("return")
          ? "bg-violet-50 text-violet-700"
          : "bg-amber-50 text-amber-700";
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-bold capitalize ${c}`}
    >
      {s}
    </span>
  );
}
