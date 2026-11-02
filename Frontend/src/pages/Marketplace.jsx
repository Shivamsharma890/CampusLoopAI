import { useEffect, useState } from "react";
import { Search, RefreshCw, X } from "lucide-react";
import { endpoints } from "../services/api.js";
import ItemCard from "../components/ItemCard.jsx";
import { Empty, ErrorBox, Loading } from "../components/UI.jsx";
const cats = [
  "All categories",
  "Books",
  "Electronics",
  "Stationery",
  "Clothing",
  "Sports",
  "Other",
];
export default function Marketplace() {
  const [items, setItems] = useState([]),
    [search, setSearch] = useState(""),
    [category, setCategory] = useState(""),
    [available, setAvailable] = useState(true),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(null);
  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const d = await endpoints.items({
        q: search.trim() || undefined,
        category: category || undefined,
        available: available ? true : undefined,
      });
      setItems(Array.isArray(d) ? d : d?.items || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [search, category, available]);
  const borrow = async (item) => {
    const raw = prompt(`How many days to borrow "${item.name}"?`, "3");
    if (!raw) return;
    const days = Number(raw);
    if (!Number.isInteger(days) || days < 1 || days > 30)
      return alert("Enter a whole number from 1 to 30.");
    setBusy(item.id ?? item.item_id);
    try {
      await endpoints.borrow({
        item_id: item.id ?? item.item_id,
        requested_days: days,
        note: "",
      });
      alert("Borrow request sent!");
      await load();
    } catch (e) {
      alert(e.message);
    } finally {
      setBusy(null);
    }
  };
  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-950 via-indigo-950 to-indigo-800 p-6 text-white sm:p-8">
        <div className="absolute -right-10 -top-20 h-64 w-64 rounded-full bg-indigo-400/20 blur-3xl" />
        <div className="relative">
          <p className="text-xs font-black uppercase tracking-[.2em] text-indigo-300">
            The sharing shelf
          </p>
          <h1 className="mt-3 text-3xl font-black sm:text-4xl">
            Find something useful.
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">
            Explore books, gadgets, and everyday essentials from students in
            your campus community.
          </p>
          <div className="mt-6 flex max-w-2xl items-center gap-3 rounded-2xl border border-white/10 bg-white/10 p-2">
            <Search size={19} className="ml-2 text-indigo-200" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search books, calculators, lab coats..."
              className="min-w-0 flex-1 bg-transparent px-1 py-2 text-sm text-white outline-none placeholder:text-slate-400"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                aria-label="Clear search"
                className="p-2"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>
      </section>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-black">Marketplace</h2>
          <p className="mt-1 text-sm text-slate-500">
            {loading ? "Finding items..." : `${items.length} items to explore`}
          </p>
        </div>
        <label className="flex items-center gap-3 self-start rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-600">
          <input
            type="checkbox"
            checked={available}
            onChange={(e) => setAvailable(e.target.checked)}
            className="h-4 w-4 accent-indigo-600"
          />{" "}
          Available only
        </label>
      </div>
      <div className="flex flex-wrap gap-2">
        {cats.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c === "All categories" ? "" : c)}
            className={`rounded-xl px-4 py-2.5 text-xs font-bold ${(!category && c === "All categories") || category === c ? "bg-indigo-600 text-white" : "border border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:text-indigo-600"}`}
          >
            {c}
          </button>
        ))}
      </div>
      <ErrorBox>{error}</ErrorBox>
      {loading ? (
        <Loading />
      ) : items.length ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item, i) => (
            <ItemCard
              key={item.id ?? item.item_id ?? i}
              item={item}
              index={i}
              onBorrow={borrow}
              busy={busy === (item.id ?? item.item_id)}
            />
          ))}
        </div>
      ) : (
        <Empty
          title="No items match just yet"
          desc="Try another search or category, or share an item to get the community started."
        >
          <button
            onClick={() => {
              setSearch("");
              setCategory("");
              setAvailable(false);
            }}
            className="rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white"
          >
            Clear filters
          </button>
        </Empty>
      )}
    </div>
  );
}
