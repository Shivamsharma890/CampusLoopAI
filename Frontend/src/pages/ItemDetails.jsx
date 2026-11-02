import { useEffect, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Package,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { endpoints } from "../services/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { Badge, ErrorBox, Loading } from "../components/UI.jsx";
export default function ItemDetails() {
  const { itemId } = useParams();
  const { user } = useAuth();
  const [item, setItem] = useState(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    let live = true;
    endpoints
      .item(itemId)
      .then((d) => {
        if (live) setItem(d?.item || d);
      })
      .catch((e) => setError(e.message))
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [itemId]);
  const borrow = async () => {
    const raw = prompt(
      "How many days would you like to borrow this item?",
      "3",
    );
    if (!raw) return;
    const days = Number(raw);
    if (!Number.isInteger(days) || days < 1 || days > 30)
      return alert("Enter a whole number from 1 to 30.");
    setBusy(true);
    try {
      await endpoints.borrow({
        item_id: item.id ?? item.item_id,
        requested_days: days,
        note: "",
      });
      alert("Borrow request sent!");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  if (loading) return <Loading />;
  if (!item)
    return (
      <>
        <Link
          to="/app/marketplace"
          className="text-sm font-bold text-indigo-600"
        >
          ← Marketplace
        </Link>
        <ErrorBox>{error || "Item not found."}</ErrorBox>
      </>
    );
  const available = item.is_available ?? item.available ?? true;
  const ownerId = item.owner_id ?? item.owner?.id;

  const isOwner =
    user?.id != null && ownerId != null && String(user.id) === String(ownerId);
  return (
    <div className="mx-auto max-w-5xl">
      <Link
        to="/app/marketplace"
        className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-indigo-600"
      >
        <ArrowLeft size={16} /> Back to marketplace
      </Link>
      <ErrorBox>{error}</ErrorBox>
      <div className="grid overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm lg:grid-cols-[.9fr_1.1fr]">
        <div className="flex min-h-72 items-center justify-center overflow-hidden bg-gradient-to-br from-indigo-100 via-violet-100 to-blue-100 p-6 sm:p-10">
          {item.image_url ? (
            <img
              src={item.image_url}
              alt={item.name}
              className="max-h-[420px] w-full rounded-2xl object-contain"
            />
          ) : (
            <div className="grid h-36 w-36 place-items-center rounded-[2.5rem] bg-white/80 text-indigo-700 shadow-xl">
              <Package size={66} strokeWidth={1.3} />
            </div>
          )}
        </div>
        <div className="p-6 sm:p-9">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700">
              {item.category || "Essentials"}
            </span>
            <Badge status={available ? "available" : "unavailable"} />
          </div>
          <h1 className="mt-5 text-3xl font-black sm:text-4xl">{item.name}</h1>
          <p className="mt-4 text-sm leading-7 text-slate-500">
            {item.description || "No description has been added yet."}
          </p>
          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4">
              <Sparkles className="text-indigo-600" />
              <div>
                <p className="text-xs text-slate-400">Condition</p>
                <p className="mt-1 text-sm font-extrabold">
                  {item.condition || "Not specified"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4">
              <Clock3 className="text-emerald-600" />
              <div>
                <p className="text-xs text-slate-400">Availability</p>
                <p className="mt-1 text-sm font-extrabold">
                  {available ? "Ready to request" : "Unavailable"}
                </p>
              </div>
            </div>
          </div>
          {!isOwner && (
            <button
              disabled={!available || busy}
              onClick={borrow}
              className="mt-7 flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 py-4 text-sm font-extrabold text-white hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-500"
            >
              {busy ? "Sending..." : "Request to borrow"}
              <CheckCircle2 size={17} />
            </button>
          )}

          {isOwner && (
            <p className="mt-7 rounded-2xl bg-indigo-50 px-5 py-4 text-center text-sm font-bold text-indigo-700">
              This is your item — you cannot borrow it.
            </p>
          )}
          <p className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-400">
            <ShieldCheck size={14} /> Be respectful and return items on time.
          </p>
        </div>
      </div>
    </div>
  );
}
