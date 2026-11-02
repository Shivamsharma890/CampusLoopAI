import { useEffect, useState } from "react";
import {
  ArrowRight,
  Bot,
  Boxes,
  Compass,
  Plus,
  RefreshCw,
  Sparkles,
  TrendingUp,
  Users,
  WalletCards,
  Coins,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { endpoints } from "../services/api.js";
import ItemCard from "../components/ItemCard.jsx";
import { Empty, ErrorBox, Loading } from "../components/UI.jsx";
export default function Dashboard() {
  const { user } = useAuth();
  const [credits, setCredits] = useState(0);
  const [items, setItems] = useState([]),
    [requests, setRequests] = useState([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const name =
    user?.full_name || user?.name || user?.email?.split("@")[0] || "there";
  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [a, b, c] = await Promise.all([
        endpoints.items({ available: true }),
        endpoints.myRequests(),
        endpoints.credits(),
      ]);

      setItems((Array.isArray(a) ? a : a?.items || []).slice(0, 3));
      setRequests(Array.isArray(b) ? b : b?.requests || []);
      setCredits(c.credits ?? 0);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);
  const borrow = async (item) => {
    const raw = prompt(`How many days to borrow "${item.name}"?`, "3");
    if (!raw) return;
    const days = Number(raw);
    if (!Number.isInteger(days) || days < 1 || days > 30)
      return alert("Enter a whole number from 1 to 30.");
    try {
      await endpoints.borrow({
        item_id: item.id ?? item.item_id,
        requested_days: days,
        note: "",
      });
      alert("Borrow request sent!");
      load();
    } catch (e) {
      alert(e.message);
    }
  };
  const pending = requests.filter(
    (r) => String(r.status).toLowerCase() === "pending",
  ).length;
  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-indigo-600 via-indigo-600 to-violet-700 p-6 text-white shadow-xl sm:p-9">
        <div className="absolute -right-10 -top-20 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex flex-col justify-between gap-7 md:flex-row md:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold">
              <Sparkles size={14} /> Your community is in motion
            </div>
            <h1 className="mt-5 text-3xl font-black sm:text-4xl">
              Hey, {name}! 👋
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-7 text-indigo-100 sm:text-base">
              Need something for class, a project, or everyday life? Your campus
              community might already have it.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/app/marketplace"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-extrabold text-indigo-700 hover:bg-indigo-50"
              >
                Explore marketplace <ArrowRight size={16} />
              </Link>
              <Link
                to="/app/add-item"
                className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-3 text-sm font-bold hover:bg-white/20"
              >
                <Plus size={16} /> Share an item
              </Link>
            </div>
          </div>
          <div className="hidden h-40 w-40 shrink-0 place-items-center rounded-[2.5rem] border border-white/20 bg-white/10 md:grid">
            <div className="grid h-28 w-28 place-items-center rounded-[2rem] bg-white text-indigo-600">
              <Boxes size={55} />
            </div>
          </div>
        </div>
      </section>

      {/* credit score */}
      <section className="relative overflow-hidden rounded-3xl border border-amber-200 bg-gradient-to-r from-amber-50 via-white to-orange-50 p-6 shadow-sm sm:p-7">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-amber-100 text-amber-700">
              <Coins size={28} />
            </div>

            <div>
              <p className="text-sm font-bold text-slate-500">
                My Credit Wallet
              </p>

              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900">
                  {loading ? "..." : credits}
                </span>
                <span className="text-sm font-semibold text-amber-700">
                  credits
                </span>
              </div>

              <p className="mt-1 text-xs text-slate-500">
                Earn 10 credits when you confirm an item return.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-amber-100 bg-white/80 px-4 py-3">
            <p className="text-xs font-semibold text-slate-500">Keep sharing</p>
            <p className="mt-1 text-sm font-extrabold text-slate-800">
              Every return counts ✨
            </p>
          </div>
        </div>
      </section>

      <ErrorBox>{error}</ErrorBox>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Available items",
            value: loading ? "—" : items.length,
            sub: "Ready to be discovered",
            Icon: Boxes,
            color: "bg-blue-50 text-blue-600",
          },
          {
            label: "Your requests",
            value: loading ? "—" : requests.length,
            sub: "Borrowing activity",
            Icon: WalletCards,
            color: "bg-violet-50 text-violet-600",
          },
          {
            label: "Awaiting response",
            value: loading ? "—" : pending,
            sub: "Requests in progress",
            Icon: TrendingUp,
            color: "bg-amber-50 text-amber-600",
          },
          {
            label: "Community impact",
            value: "∞",
            sub: "Every share makes a difference",
            Icon: Users,
            color: "bg-emerald-50 text-emerald-600",
          },
        ].map((x) => (
          <div
            key={x.label}
            className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm"
          >
            <div className="flex justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-500">
                  {x.label}
                </p>
                <p className="mt-3 text-3xl font-black">{x.value}</p>
              </div>
              <div
                className={`grid h-11 w-11 place-items-center rounded-2xl ${x.color}`}
              >
                <x.Icon size={21} />
              </div>
            </div>
            <p className="mt-3 text-xs text-slate-400">{x.sub}</p>
          </div>
        ))}
      </section>
      <section>
        <div className="mb-5 flex items-end justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[.18em] text-indigo-600">
              Handpicked for you
            </p>
            <h2 className="mt-2 text-2xl font-black">
              Explore available items
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Useful things shared by your campus community.
            </p>
          </div>
          <button
            onClick={load}
            aria-label="Refresh"
            className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-500 hover:text-indigo-600"
          >
            <RefreshCw size={17} />
          </button>
        </div>
        {loading ? (
          <Loading />
        ) : items.length ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {items.map((item, i) => (
              <ItemCard
                key={item.id ?? item.item_id ?? i}
                item={item}
                index={i}
                onBorrow={borrow}
              />
            ))}
          </div>
        ) : (
          <Empty
            title="Your marketplace is waiting"
            desc="No available items found yet. Be the first to share something useful."
          >
            <Link
              to="/app/add-item"
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white"
            >
              Share an item <ArrowRight size={15} />
            </Link>
          </Empty>
        )}
        <div className="mt-5 text-center">
          <Link
            to="/app/marketplace"
            className="text-sm font-extrabold text-indigo-600"
          >
            View full marketplace →
          </Link>
        </div>
      </section>
      <section className="grid gap-5 lg:grid-cols-2">
        <Link
          to="/app/assistant"
          className="group flex items-center gap-5 rounded-3xl border border-violet-100 bg-gradient-to-br from-violet-50 to-indigo-50 p-6 hover:shadow-lg"
        >
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white text-violet-600">
            <Bot size={27} />
          </div>
          <div className="flex-1">
            <p className="text-xs font-black uppercase tracking-widest text-violet-600">
              Meet your AI helper
            </p>
            <h3 className="mt-1 text-lg font-extrabold">
              Not sure what you need?
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Tell CampusLoop AI what you're looking for.
            </p>
          </div>
          <ArrowRight className="text-violet-500 group-hover:translate-x-1" />
        </Link>
        <Link
          to="/app/my-requests"
          className="group flex items-center gap-5 rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-teal-50 p-6 hover:shadow-lg"
        >
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white text-emerald-600">
            <Compass size={27} />
          </div>
          <div className="flex-1">
            <p className="text-xs font-black uppercase tracking-widest text-emerald-600">
              Stay in the loop
            </p>
            <h3 className="mt-1 text-lg font-extrabold">Track your requests</h3>
            <p className="mt-1 text-sm text-slate-500">
              See status updates and manage returns.
            </p>
          </div>
          <ArrowRight className="text-emerald-500 group-hover:translate-x-1" />
        </Link>
      </section>
    </div>
  );
}
