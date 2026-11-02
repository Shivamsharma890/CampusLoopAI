import { useEffect, useState } from "react";
import { Check, ClipboardList, RefreshCw, RotateCcw, X } from "lucide-react";
import { Link } from "react-router-dom";
import { endpoints } from "../services/api.js";
import { Badge, Empty, ErrorBox, Loading } from "../components/UI.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export function MyRequests() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(null);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const d = await endpoints.myRequests();
      const allRequests = Array.isArray(d) ? d : d?.requests || [];
      setRows(
        allRequests.filter((r) => String(r.borrower_id) === String(user?.id)),
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);
  const ret = async (r) => {
    const id = r.id ?? r.request_id;
    if (!confirm("Send a return request?")) return;
    setBusy(id);
    try {
      await endpoints.returnRequest(id);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(null);
    }
  };
  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-indigo-600">
            Your activity
          </p>
          <h1 className="mt-2 text-3xl font-black">My borrow requests</h1>
          <p className="mt-2 text-sm text-slate-500">
            From the first ask to the final return.
          </p>
        </div>
        <button
          onClick={load}
          className="inline-flex items-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-600"
        >
          <RefreshCw size={16} /> Refresh
        </button>
      </div>
      <ErrorBox>{error}</ErrorBox>
      {loading ? (
        <Loading />
      ) : rows.length ? (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
          <div className="hidden grid-cols-[1.4fr_.7fr_.6fr_.8fr] gap-4 bg-slate-50 px-6 py-4 text-[11px] font-black uppercase tracking-wider text-slate-400 md:grid">
            <span>Item / Request</span>
            <span>Duration</span>
            <span>Status</span>
            <span className="text-right">Action</span>
          </div>
          <div className="divide-y divide-slate-100">
            {rows.map((r, i) => {
              const id = r.id ?? r.request_id,
                s = String(r.status || "pending").toLowerCase();
              return (
                <div
                  key={id ?? i}
                  className="grid gap-4 px-5 py-5 md:grid-cols-[1.4fr_.7fr_.6fr_.8fr] md:items-center md:px-6"
                >
                  <div className="flex items-center gap-3">
                    <div className="grid h-12 w-12 place-items-center rounded-2xl bg-indigo-50 text-indigo-600">
                      <ClipboardList size={21} />
                    </div>
                    <div>
                      <p className="font-extrabold">
                        {r.item_name ||
                          r.item?.name ||
                          `Request #${id ?? i + 1}`}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {r.created_at
                          ? new Date(r.created_at).toLocaleDateString()
                          : "Borrow request"}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 md:hidden">Duration</p>
                    <p className="text-sm font-semibold">
                      {r.requested_days ? `${r.requested_days} days` : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="mb-1 text-xs text-slate-400 md:hidden">
                      Status
                    </p>
                    <Badge status={s} />
                  </div>
                  <div className="flex md:justify-end">
                    {s === "approved" ? (
                      <button
                        disabled={busy === id}
                        onClick={() => ret(r)}
                        className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-3.5 py-2.5 text-xs font-bold text-white disabled:opacity-50"
                      >
                        <RotateCcw size={14} />
                        {busy === id ? "Sending..." : "Request return"}
                      </button>
                    ) : (
                      <span className="text-xs text-slate-400">
                        {s === "returned" ? "All done" : "No action needed"}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <Empty
          title="No requests yet"
          desc="When you request an item from the marketplace, you'll see its status here."
        >
          <Link
            to="/app/marketplace"
            className="inline-flex rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white"
          >
            Explore marketplace
          </Link>
        </Empty>
      )}
    </div>
  );
}

export function IncomingRequests() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(null);
  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const d = await endpoints.myRequests();
      const allRequests = Array.isArray(d) ? d : d?.requests || [];

      setRows(
        allRequests.filter((r) => String(r.owner_id) === String(user?.id)),
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);
  const act = async (r, decision) => {
    const id = r.id ?? r.request_id;
    if (
      !confirm(`${decision === "approve" ? "Approve" : "Reject"} this request?`)
    )
      return;
    setBusy(id);
    try {
      await endpoints.decide(id, decision);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(null);
    }
  };
  const ret = async (r) => {
    const id = r.id ?? r.request_id;
    if (!confirm("Confirm that the item has been returned?")) return;
    setBusy(id);
    try {
      await endpoints.confirmReturn(id);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(null);
    }
  };
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-black uppercase tracking-widest text-indigo-600">
          Your shared items
        </p>
        <h1 className="mt-2 text-3xl font-black">Incoming requests</h1>
        <p className="mt-2 text-sm text-slate-500">
          Review borrowing requests and confirm returns.
        </p>
      </div>
      <ErrorBox>{error}</ErrorBox>
      {loading ? (
        <Loading />
      ) : rows.length ? (
        <div className="space-y-3">
          {rows.map((r, i) => {
            const id = r.id ?? r.request_id,
              s = String(r.status || "pending").toLowerCase();
            return (
              <div
                key={id ?? i}
                className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:p-6"
              >
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-indigo-50 text-indigo-600">
                  <ClipboardList size={22} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-extrabold">
                      {r.item_name || r.item?.name || `Request #${id ?? i + 1}`}
                    </h3>
                    <Badge status={s} />
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    {r.borrower_name ||
                      r.borrower?.full_name ||
                      r.borrower_email ||
                      "Campus member"}{" "}
                    {r.requested_days ? `· ${r.requested_days} days` : ""}
                  </p>
                  <p className="mt-2 text-xs text-slate-400">
                    {r.note || "No additional note was provided."}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {s === "pending" ? (
                    <>
                      <button
                        disabled={busy === id}
                        onClick={() => act(r, "approve")}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2.5 text-xs font-bold text-white"
                      >
                        <Check size={15} /> Approve
                      </button>
                      <button
                        disabled={busy === id}
                        onClick={() => act(r, "reject")}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-bold text-rose-700"
                      >
                        <X size={15} /> Reject
                      </button>
                    </>
                  ) : ["return_requested", "return requested"].includes(s) ? (
                    <button
                      disabled={busy === id}
                      onClick={() => ret(r)}
                      className="rounded-xl bg-indigo-600 px-3.5 py-2.5 text-xs font-bold text-white"
                    >
                      Confirm return
                    </button>
                  ) : (
                    <span className="self-center text-xs text-slate-400">
                      No action needed
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <Empty
          title="Nothing to review yet"
          desc="When someone requests an item you shared, it will show up here."
        />
      )}
    </div>
  );
}
