import { BookOpen, Laptop, Package, ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function ItemCard({ item, index = 0, onBorrow, busy = false }) {
  const { user } = useAuth();

  const id = item.id ?? item.item_id;
  const ownerId = item.owner_id ?? item.owner?.id;
  const isOwner =
    user?.id != null && ownerId != null && String(user.id) === String(ownerId);

  const available = item.is_available ?? item.available ?? true;
  const Icon = /book/i.test(item.category || "")
    ? BookOpen
    : /tech|elect|laptop/i.test(item.category || "")
      ? Laptop
      : Package;
  const bg = [
    "from-indigo-100 to-violet-100",
    "from-cyan-100 to-blue-100",
    "from-amber-100 to-orange-100",
    "from-emerald-100 to-teal-100",
  ][index % 4];
  return (
    <article className="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:border-indigo-200 hover:shadow-xl">
      <div
        className={`relative flex h-40 items-center justify-center overflow-hidden bg-gradient-to-br ${bg}`}
      >
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.name || "Item image"}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="grid h-24 w-24 place-items-center rounded-[2rem] bg-white/70 text-slate-700">
            <Icon size={43} strokeWidth={1.4} />
          </div>
        )}

        <span
          className={`absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1.5 text-xs font-bold ${
            available ? "text-emerald-700" : "text-slate-500"
          }`}
        >
          {available ? "Available now" : "Unavailable"}
        </span>
      </div>

      <div className="p-5">
        <div className="flex justify-between gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
            {item.category || "Essentials"}
          </span>
          <span className="text-xs text-slate-400">
            {item.condition || "Good"}
          </span>
        </div>
        <h3 className="mt-2 line-clamp-1 text-lg font-extrabold">
          {item.name || "Untitled item"}
        </h3>
        <p className="mt-2 line-clamp-2 min-h-10 text-sm leading-6 text-slate-500">
          {item.description ||
            "A useful campus essential, shared by your community."}
        </p>
        <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
          <Link
            to={`/items/${id}`}
            className="inline-flex items-center gap-1 text-sm font-bold text-slate-600 hover:text-indigo-600"
          >
            Details <ArrowUpRight size={15} />
          </Link>
          {!isOwner && (
            <button
              disabled={!available || busy}
              onClick={() => onBorrow?.(item)}
              className="rounded-xl bg-indigo-600 px-3.5 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-500"
            >
              {busy ? "Sending..." : "Request borrow"}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
