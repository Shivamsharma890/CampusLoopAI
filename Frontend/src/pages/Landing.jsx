import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Bot,
  Boxes,
  CheckCircle2,
  HeartHandshake,
  Laptop,
  ShieldCheck,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import { Link } from "react-router-dom";
import Logo from "../components/Logo.jsx";
const feats = [
  {
    Icon: HeartHandshake,
    title: "A campus that shares",
    desc: "Borrow what you need from people around you. Save money and help a fellow student.",
  },
  {
    Icon: ShieldCheck,
    title: "Trust built in",
    desc: "Clear requests and return tracking keep the sharing experience organized.",
  },
  {
    Icon: Bot,
    title: "AI-powered help",
    desc: "Get help finding the right item and navigating your campus-sharing journey.",
  },
];
export default function Landing() {
  return (
    <div className="min-h-screen overflow-hidden bg-white text-slate-900">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
        <Logo />
        <div className="hidden gap-7 md:flex">
          <a
            href="#how"
            className="text-sm font-semibold text-slate-600 hover:text-indigo-600"
          >
            How it works
          </a>
          <a
            href="#why"
            className="text-sm font-semibold text-slate-600 hover:text-indigo-600"
          >
            Why CampusLoop
          </a>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/login"
            className="rounded-xl px-3 py-2.5 text-sm font-bold hover:bg-slate-100"
          >
            Log in
          </Link>
          <Link
            to="/register"
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-700"
          >
            Get started <ArrowRight size={16} />
          </Link>
        </div>
      </nav>
      <section className="relative">
        <div className="absolute -right-32 -top-12 h-[450px] w-[450px] rounded-full bg-violet-200/60 blur-3xl" />
        <div className="absolute -left-40 top-32 h-[340px] w-[340px] rounded-full bg-blue-100 blur-3xl" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 pb-20 pt-12 sm:px-8 sm:pt-20 lg:grid-cols-2 lg:pb-28">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-white/80 px-3.5 py-2 text-xs font-bold text-indigo-700 shadow-sm">
              <Sparkles size={15} /> The smarter way to share on campus
            </div>
            <h1 className="mt-7 max-w-2xl text-5xl font-black leading-[1.04] tracking-[-.055em] sm:text-6xl xl:text-[68px]">
              Your campus has it.{" "}
              <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-blue-500 bg-clip-text text-transparent">
                Just loop it in.
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-8 text-slate-600 sm:text-lg">
              Borrow the things you need, lend the things you don't, and make
              student life a little easier — together.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/register"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-6 py-4 text-sm font-extrabold text-white shadow-xl shadow-indigo-600/25 hover:-translate-y-0.5 hover:bg-indigo-700"
              >
                Start sharing for free <ArrowRight size={17} />
              </Link>
              <a
                href="#how"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-4 text-sm font-extrabold text-slate-700 hover:text-indigo-600"
              >
                See how it works <ArrowUpRight size={16} />
              </a>
            </div>
            <div className="mt-9 flex flex-wrap gap-x-5 gap-y-3 text-xs font-semibold text-slate-500">
              <span className="inline-flex items-center gap-2">
                <CheckCircle2 size={15} className="text-emerald-500" />{" "}
                Student-first community
              </span>
              <span className="inline-flex items-center gap-2">
                <CheckCircle2 size={15} className="text-emerald-500" /> Simple
                borrowing
              </span>
              <span className="inline-flex items-center gap-2">
                <CheckCircle2 size={15} className="text-emerald-500" /> AI
                assistance
              </span>
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-xl">
            <div className="absolute -inset-5 rounded-[2.5rem] bg-gradient-to-br from-indigo-200/70 via-violet-100 to-blue-100 blur-xl" />
            <div className="relative rounded-[2rem] border border-white bg-white/90 p-4 shadow-2xl shadow-indigo-900/10 backdrop-blur sm:p-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <p className="text-xs font-bold text-indigo-600">
                    CAMPUS MARKETPLACE
                  </p>
                  <h3 className="mt-1 text-xl font-extrabold">
                    Find your next essential
                  </h3>
                </div>
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
                  <Boxes size={20} />
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
                  <div className="flex h-24 items-center justify-center">
                    <BookOpen
                      size={53}
                      className="text-indigo-600"
                      strokeWidth={1.2}
                    />
                  </div>
                  <p className="mt-2 text-sm font-extrabold">Semester notes</p>
                  <p className="mt-1 text-xs text-slate-500">Books & notes</p>
                  <span className="mt-3 inline-flex rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-emerald-700">
                    Available
                  </span>
                </div>
                <div className="rounded-2xl bg-gradient-to-br from-violet-50 to-fuchsia-100 p-4">
                  <div className="flex h-24 items-center justify-center">
                    <Laptop
                      size={53}
                      className="text-violet-600"
                      strokeWidth={1.2}
                    />
                  </div>
                  <p className="mt-2 text-sm font-extrabold">Laptop stand</p>
                  <p className="mt-1 text-xs text-slate-500">Tech & gadgets</p>
                  <span className="mt-3 inline-flex rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-emerald-700">
                    Available
                  </span>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-3 rounded-2xl bg-slate-50 p-4">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-amber-100 text-amber-700">
                  <Zap size={20} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-extrabold">
                    Need a recommendation?
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Ask your AI campus assistant.
                  </p>
                </div>
                <ArrowUpRight size={17} className="text-slate-500" />
              </div>
            </div>
            <div className="absolute -left-6 top-28 hidden items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3.5 shadow-xl sm:flex">
              <ShieldCheck className="text-emerald-600" size={22} />
              <div>
                <p className="text-xs font-extrabold">Easy to request</p>
                <p className="mt-1 text-[10px] text-slate-500">
                  A few clicks, that's it
                </p>
              </div>
            </div>
            <div className="absolute -right-4 bottom-16 hidden items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3.5 shadow-xl sm:flex">
              <Users className="text-violet-600" size={22} />
              <div>
                <p className="text-xs font-extrabold">Community first</p>
                <p className="mt-1 text-[10px] text-slate-500">
                  Better together
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="border-y border-slate-100 bg-slate-50/70">
        <div className="mx-auto grid max-w-7xl gap-6 px-5 py-8 sm:grid-cols-3 sm:px-8">
          {[
            ["01", "Discover", "Browse campus essentials"],
            ["02", "Request", "Ask to borrow in a few clicks"],
            ["03", "Return & repeat", "Keep the good things going"],
          ].map((x) => (
            <div key={x[0]} className="flex items-center gap-4">
              <span className="text-3xl font-black text-indigo-200">
                {x[0]}
              </span>
              <div>
                <p className="font-extrabold">{x[1]}</p>
                <p className="mt-1 text-sm text-slate-500">{x[2]}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
      <section
        id="how"
        className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-28"
      >
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-black uppercase tracking-[.22em] text-indigo-600">
            Made for student life
          </span>
          <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">
            Less buying. More belonging.
          </h2>
          <p className="mt-5 leading-7 text-slate-500">
            CampusLoop helps your campus put what it already has to better use.
          </p>
        </div>
        <div className="mt-12 grid gap-5 sm:grid-cols-3">
          {[
            {
              Icon: BookOpen,
              title: "Books & notes",
              color: "bg-blue-50 text-blue-600",
            },
            {
              Icon: Laptop,
              title: "Tech & gadgets",
              color: "bg-violet-50 text-violet-600",
            },
            {
              Icon: Boxes,
              title: "Everyday essentials",
              color: "bg-amber-50 text-amber-600",
            },
          ].map(({ Icon, title, color }) => (
            <div
              key={title}
              className="group rounded-3xl border border-slate-200 bg-white p-6 transition hover:-translate-y-1 hover:border-indigo-200 hover:shadow-xl"
            >
              <div
                className={`grid h-14 w-14 place-items-center rounded-2xl ${color}`}
              >
                <Icon size={26} />
              </div>
              <h3 className="mt-5 text-lg font-extrabold">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Find useful things from your campus community, when you need
                them.
              </p>
              <div className="mt-5 flex items-center gap-2 text-sm font-bold text-indigo-600">
                Explore items <ArrowRight size={15} />
              </div>
            </div>
          ))}
        </div>
      </section>
      <section id="why" className="bg-slate-950 py-20 text-white lg:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="grid gap-12 lg:grid-cols-[.8fr_1.2fr] lg:items-center">
            <div>
              <span className="text-xs font-black uppercase tracking-[.22em] text-indigo-300">
                Why CampusLoop
              </span>
              <h2 className="mt-4 text-3xl font-black sm:text-5xl">
                A better way to do campus.
              </h2>
              <p className="mt-5 max-w-lg leading-7 text-slate-400">
                Your community is already full of resources. CampusLoop makes it
                easier to connect them.
              </p>
              <Link
                to="/register"
                className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3.5 text-sm font-extrabold text-slate-950 hover:bg-indigo-50"
              >
                Join CampusLoop <ArrowRight size={16} />
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {feats.map(({ Icon, title, desc }) => (
                <div
                  key={title}
                  className="rounded-3xl border border-white/10 bg-white/[.04] p-6"
                >
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-indigo-500/15 text-indigo-300">
                    <Icon size={23} />
                  </div>
                  <h3 className="mt-5 text-lg font-extrabold">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    {desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-16 flex flex-col justify-between gap-4 border-t border-white/10 pt-6 text-xs text-slate-500 sm:flex-row sm:items-center">
            <Logo light />
            <p>
              © {new Date().getFullYear()} CampusLoop AI. Made for campus
              communities.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
