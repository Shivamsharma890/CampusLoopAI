import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  Repeat2,
  UserRound,
  Sparkles,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import Logo from "../components/Logo.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { ErrorBox } from "../components/UI.jsx";
export function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const { login } = useAuth();
  const nav = useNavigate();
  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await login(form);
      nav("/app", { replace: true });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <AuthShell mode="login">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-indigo-50 text-indigo-600">
        <Repeat2 size={27} />
      </div>
      <h2 className="mt-6 text-3xl font-black tracking-tight">Welcome back</h2>
      <p className="mt-2 text-sm leading-6 text-slate-500">
        Sign in to pick up where your campus community left off.
      </p>
      <form onSubmit={submit} className="mt-8 space-y-5">
        <ErrorBox>{error}</ErrorBox>
        <Field label="Email address" icon={Mail}>
          <input
            required
            type="email"
            autoComplete="email"
            placeholder="you@college.edu"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className={input}
          />
        </Field>
        <Field label="Password" icon={LockKeyhole}>
          <div className="relative">
            <input
              required
              type={show ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Enter your password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className={`${input} pr-12`}
            />
            <button
              type="button"
              onClick={() => setShow(!show)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-slate-400"
            >
              {show ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
        </Field>
        <button
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 py-4 text-sm font-extrabold text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 disabled:opacity-60"
        >
          {busy ? "Signing in..." : "Sign in to CampusLoop"}{" "}
          {!busy && <ArrowRight size={17} />}
        </button>
      </form>
      <p className="mt-7 text-center text-sm text-slate-500">
        New to CampusLoop?{" "}
        <Link to="/register" className="font-extrabold text-indigo-600">
          Create an account
        </Link>
      </p>
    </AuthShell>
  );
}
export function Register() {
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const { register } = useAuth();
  const nav = useNavigate();
  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (form.password.length < 8)
      return setError("Password should be at least 8 characters.");
    if (form.password !== form.confirmPassword)
      return setError("Passwords do not match.");
    setBusy(true);
    try {
      await register({
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        password: form.password,
      });
      nav("/login", { replace: true, state: { registered: true } });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  return (
    <AuthShell mode="register">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-indigo-50 text-indigo-600">
        <Repeat2 size={27} />
      </div>
      <h2 className="mt-6 text-3xl font-black tracking-tight">
        Create your account
      </h2>
      <p className="mt-2 text-sm leading-6 text-slate-500">
        Your next useful campus connection starts here.
      </p>
      <form onSubmit={submit} className="mt-7 space-y-4">
        <ErrorBox>{error}</ErrorBox>
        <Field label="Full name" icon={UserRound}>
          <input
            required
            name="full_name"
            autoComplete="name"
            placeholder="Your name"
            value={form.full_name}
            onChange={change}
            className={input}
          />
        </Field>
        <Field label="College email" icon={Mail}>
          <input
            required
            type="email"
            name="email"
            autoComplete="email"
            placeholder="you@college.edu"
            value={form.email}
            onChange={change}
            className={input}
          />
        </Field>
        <Field label="Password" icon={LockKeyhole}>
          <div className="relative">
            <input
              required
              minLength={8}
              name="password"
              type={show ? "text" : "password"}
              autoComplete="new-password"
              placeholder="At least 8 characters"
              value={form.password}
              onChange={change}
              className={`${input} pr-12`}
            />
            <button
              type="button"
              onClick={() => setShow(!show)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-slate-400"
            >
              {show ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
        </Field>
        <Field label="Confirm password" icon={LockKeyhole}>
          <input
            required
            name="confirmPassword"
            type={show ? "text" : "password"}
            autoComplete="new-password"
            placeholder="Enter password again"
            value={form.confirmPassword}
            onChange={change}
            className={input}
          />
        </Field>
        <button
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 py-4 text-sm font-extrabold text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 disabled:opacity-60"
        >
          {busy ? "Creating account..." : "Create account"}{" "}
          <ArrowRight size={17} />
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-500">
        Already have an account?{" "}
        <Link to="/login" className="font-extrabold text-indigo-600">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
const input =
  "w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-500/10";
function Field({ label, icon: Icon, children }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-slate-700">
        {label}
      </span>
      <span className="relative block">
        <Icon
          className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
          size={18}
        />
        {children}
      </span>
    </label>
  );
}
function AuthShell({ children, mode }) {
  return (
    <div className="grid min-h-screen bg-white lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-slate-950 p-12 text-white lg:flex lg:flex-col lg:justify-between xl:p-16">
        <div className="absolute -right-32 top-20 h-96 w-96 rounded-full bg-indigo-600/30 blur-3xl" />
        <div className="relative">
          <Logo light />
        </div>
        <div className="relative max-w-xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-indigo-200">
            <Sparkles size={14} /> Your campus, connected
          </div>
          <h1 className="mt-7 text-5xl font-black leading-tight tracking-tight xl:text-6xl">
            {mode === "login"
              ? "Good things are better when"
              : "Make campus life"}{" "}
            <span className="text-indigo-300">
              {mode === "login" ? "shared." : "work together."}
            </span>
          </h1>
          <p className="mt-6 max-w-md text-base leading-8 text-slate-400">
            Borrow the things you need, share the things you don't, and make
            student life a little easier — together.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            {["Borrow smarter", "Share easily", "AI-powered help"].map((x) => (
              <span
                key={x}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-300"
              >
                {x}
              </span>
            ))}
          </div>
        </div>
        <p className="relative text-xs text-slate-500">
          A community built on trust and sharing.
        </p>
      </div>
      <div className="flex items-center justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center justify-between lg:hidden">
            <Logo />
            <Link to="/" className="text-sm font-semibold text-slate-500">
              Home
            </Link>
          </div>
          <Link
            to="/"
            className="mb-8 hidden items-center gap-2 text-sm font-semibold text-slate-400 hover:text-slate-800 lg:inline-flex"
          >
            <ArrowLeft size={16} /> Back to home
          </Link>
          {children}
        </div>
      </div>
    </div>
  );
}
