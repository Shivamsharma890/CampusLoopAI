import { Link } from "react-router-dom";
import { Repeat2 } from "lucide-react";
export default function Logo({ light = false }) {
  return (
    <Link to="/" className="inline-flex items-center gap-2.5">
      <span className="grid h-10 w-10 place-items-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/20">
        <Repeat2 size={22} />
      </span>
      <span
        className={`text-xl font-black tracking-tight ${light ? "text-white" : "text-slate-950"}`}
      >
        CampusLoop<span className="text-indigo-500">.</span>
      </span>
    </Link>
  );
}
