import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  PackagePlus,
  Sparkles,
  ImagePlus,
  X,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { endpoints } from "../services/api.js";
import { ErrorBox } from "../components/UI.jsx";
export default function AddItem() {
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [form, setForm] = useState({
      name: "",
      description: "",
      category: "Books",
      condition: "Good",
    }),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const nav = useNavigate();
  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const handleImageChange = (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      setError("Please upload a JPG, PNG, or WebP image.");
      e.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image size must be 5 MB or less.");
      e.target.value = "";
      return;
    }

    setError("");
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const removeImage = () => {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }

    setImageFile(null);
    setImagePreview("");
  };
  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);

    try {
      let imageUrl = null;

      if (imageFile) {
        const uploadResult = await endpoints.uploadImage(imageFile);
        imageUrl = uploadResult.image_url;
      }

      await endpoints.createItem({
        name: form.name.trim(),
        description: form.description.trim(),
        category: form.category,
        condition: form.condition,
        image_url: imageUrl,
      });

      nav("/app/marketplace");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="mx-auto max-w-5xl">
      <Link
        to="/app/marketplace"
        className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-indigo-600"
      >
        <ArrowLeft size={16} /> Back to marketplace
      </Link>
      <div className="grid overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm lg:grid-cols-[.8fr_1.2fr]">
        <div className="bg-gradient-to-br from-indigo-700 to-violet-800 p-7 text-white sm:p-9">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white/15">
            <PackagePlus size={28} />
          </div>
          <p className="mt-8 text-xs font-black uppercase tracking-[.2em] text-indigo-200">
            Pass it forward
          </p>
          <h1 className="mt-3 text-3xl font-black sm:text-4xl">
            Share something good.
          </h1>
          <p className="mt-4 text-sm leading-7 text-indigo-100">
            That calculator you barely use or the book you already finished
            could make someone's day easier.
          </p>
          <div className="mt-10 space-y-4">
            {[
              "Add a useful name and description",
              "Set expectations with the condition",
              "Help build a resourceful campus",
            ].map((x) => (
              <div key={x} className="flex gap-3 text-sm font-semibold">
                <CheckCircle2 size={18} className="shrink-0 text-indigo-200" />
                {x}
              </div>
            ))}
          </div>
          <div className="mt-12 flex items-center gap-2 text-xs text-indigo-200">
            <Sparkles size={14} /> Small acts. Better campus.
          </div>
        </div>
        <div className="p-6 sm:p-9">
          <h2 className="text-2xl font-black">Item details</h2>
          <p className="mt-2 text-sm text-slate-500">
            Help others know what they're requesting.
          </p>
          <form onSubmit={submit} className="mt-7 space-y-5">
            <ErrorBox>{error}</ErrorBox>
            <label className="block">
              <span className="mb-2 block text-sm font-bold">Item name *</span>
              <input
                required
                maxLength={100}
                name="name"
                value={form.name}
                onChange={change}
                placeholder="e.g. Casio scientific calculator"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm outline-none focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-bold">Description</span>
              <textarea
                rows={4}
                maxLength={1000}
                name="description"
                value={form.description}
                onChange={change}
                placeholder="Condition, usage notes, or anything the borrower should know..."
                className="w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm leading-6 outline-none focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
              />
            </label>
            <div>
              <span className="mb-2 block text-sm font-bold">Item photo</span>

              {imagePreview ? (
                <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                  <img
                    src={imagePreview}
                    alt="Item preview"
                    className="h-56 w-full object-contain"
                  />

                  <button
                    type="button"
                    onClick={removeImage}
                    aria-label="Remove selected image"
                    className="absolute right-3 top-3 rounded-full bg-white p-2 text-slate-600 shadow hover:text-rose-600"
                  >
                    <X size={18} />
                  </button>
                </div>
              ) : (
                <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center transition hover:border-indigo-400 hover:bg-indigo-50">
                  <ImagePlus size={30} className="text-indigo-600" />

                  <span className="mt-3 text-sm font-bold text-slate-700">
                    Upload item photo
                  </span>

                  <span className="mt-1 text-xs text-slate-500">
                    JPG, PNG or WebP · Max 5 MB
                  </span>

                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-bold">Category</span>
                <select
                  name="category"
                  value={form.category}
                  onChange={change}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm outline-none focus:border-indigo-400"
                >
                  {[
                    "Books",
                    "Electronics",
                    "Stationery",
                    "Clothing",
                    "Sports",
                    "Lab equipment",
                    "Other",
                  ].map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-bold">Condition</span>
                <select
                  name="condition"
                  value={form.condition}
                  onChange={change}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm outline-none focus:border-indigo-400"
                >
                  {["New", "Like new", "Good", "Fair"].map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </label>
            </div>
            <button
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 py-4 text-sm font-extrabold text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 disabled:opacity-60"
            >
              {busy ? "Publishing..." : "Publish item"} <ArrowRight size={17} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
