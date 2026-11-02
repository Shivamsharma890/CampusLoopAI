import { useEffect, useState } from "react";
import {
  Package,
  Plus,
  Pencil,
  Trash2,
  ImagePlus,
  X,
  Loader2,
  CheckCircle2,
  Eye,
} from "lucide-react";
import { Link } from "react-router-dom";
import { endpoints } from "../services/api.js";
import { ErrorBox, Loading } from "../components/UI.jsx";

const emptyForm = {
  name: "",
  description: "",
  category: "Other",
  condition: "Good",
};

export default function MyListings() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const loadItems = async () => {
    setError("");

    try {
      const data = await endpoints.myItems();
      setItems(Array.isArray(data) ? data : data?.items || []);
    } catch (e) {
      setError(e.message || "Could not load your listings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  const startEdit = (item) => {
    setEditing(item);

    setForm({
      name: item.name || "",
      description: item.description || "",
      category: item.category || "Other",
      condition: item.condition || "Good",
    });

    setImageFile(null);
    setImagePreview(item.image_url || "");
    setError("");
  };

  const closeEdit = () => {
    if (imagePreview.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview);
    }

    setEditing(null);
    setImageFile(null);
    setImagePreview("");
    setForm(emptyForm);
  };

  const handleImage = (file) => {
    if (!file) return;

    const allowed = ["image/jpeg", "image/png", "image/webp"];

    if (!allowed.includes(file.type)) {
      setError("Please select a JPG, PNG or WEBP image.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image size must be less than 5 MB.");
      return;
    }

    if (imagePreview.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview);
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setError("");
  };

  const saveChanges = async (e) => {
    e.preventDefault();

    if (!editing) return;

    setSaving(true);
    setError("");

    try {
      let imageUrl = imagePreview || null;

      if (imageFile) {
        const uploaded = await endpoints.uploadImage(imageFile);
        imageUrl = uploaded.image_url;
      }

      await endpoints.updateItem(editing.id ?? editing.item_id, {
        ...form,
        name: form.name.trim(),
        description: form.description.trim(),
        image_url: imageUrl,
      });

      closeEdit();
      await loadItems();
    } catch (e) {
      setError(e.message || "Could not update this item.");
    } finally {
      setSaving(false);
    }
  };

  const deleteItem = async (item) => {
    const confirmed = window.confirm(
      `Delete "${item.name}"? This action cannot be undone.`,
    );

    if (!confirmed) return;

    setDeletingId(item.id ?? item.item_id);
    setError("");

    try {
      await endpoints.deleteItem(item.id ?? item.item_id);
      await loadItems();
    } catch (e) {
      setError(e.message || "Could not delete this item.");
    } finally {
      setDeletingId(null);
    }
  };

  const availableCount = items.filter(
    (item) => item.is_available ?? item.available ?? true,
  ).length;

  if (loading) return <Loading />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="flex flex-col justify-between gap-4 rounded-3xl bg-gradient-to-r from-slate-950 via-indigo-950 to-indigo-800 p-6 text-white sm:flex-row sm:items-center sm:p-8">
        <div>
          <p className="text-xs font-black uppercase tracking-[.2em] text-indigo-300">
            Your sharing shelf
          </p>

          <h1 className="mt-2 text-3xl font-black">My Listings</h1>

          <p className="mt-2 text-sm text-indigo-100">
            Manage the items you have shared with your campus.
          </p>
        </div>

        <Link
          to="/app/add-item"
          className="inline-flex items-center justify-center gap-2 self-start rounded-xl bg-white px-4 py-3 text-sm font-extrabold text-indigo-700 hover:bg-indigo-50"
        >
          <Plus size={17} />
          Share an item
        </Link>
      </section>

      <ErrorBox>{error}</ErrorBox>

      {/* Statistics */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-semibold text-slate-500">Total listings</p>

          <p className="mt-2 text-3xl font-black">{items.length}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-semibold text-slate-500">Available</p>

          <p className="mt-2 text-3xl font-black text-emerald-600">
            {availableCount}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-semibold text-slate-500">Unavailable</p>

          <p className="mt-2 text-3xl font-black text-amber-600">
            {items.length - availableCount}
          </p>
        </div>
      </div>

      {/* Product listings */}
      {items.length ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => {
            const id = item.id ?? item.item_id;

            const available = item.is_available ?? item.available ?? true;

            return (
              <article
                key={id}
                className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
              >
                {/* Product image */}
                <div className="relative flex h-44 items-center justify-center overflow-hidden bg-gradient-to-br from-indigo-100 to-violet-100">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Package size={48} className="text-indigo-500" />
                  )}

                  <span
                    className={`absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1.5 text-xs font-bold ${
                      available ? "text-emerald-700" : "text-slate-500"
                    }`}
                  >
                    {available ? "Available" : "Unavailable"}
                  </span>
                </div>

                {/* Product information */}
                <div className="p-5">
                  <div className="flex justify-between gap-3 text-xs">
                    <span className="font-bold uppercase tracking-wide text-indigo-600">
                      {item.category || "Other"}
                    </span>

                    <span className="text-slate-400">
                      {item.condition || "Good"}
                    </span>
                  </div>

                  <h2 className="mt-2 truncate text-lg font-extrabold">
                    {item.name}
                  </h2>

                  <p className="mt-2 line-clamp-2 min-h-10 text-sm leading-6 text-slate-500">
                    {item.description || "No description added."}
                  </p>

                  {/* Actions */}
                  <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
                    <Link
                      to={`/items/${id}`}
                      className="mr-auto inline-flex items-center gap-1 rounded-lg px-2 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50"
                    >
                      <Eye size={16} />
                      View
                    </Link>

                    <button
                      onClick={() => startEdit(item)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-bold text-slate-700 hover:border-indigo-200 hover:text-indigo-600"
                    >
                      <Pencil size={14} />
                      Edit
                    </button>

                    <button
                      onClick={() => deleteItem(item)}
                      disabled={deletingId === id}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-rose-100 px-3 py-2.5 text-xs font-bold text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                    >
                      {deletingId === id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Trash2 size={14} />
                      )}
                      Delete
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        /* Empty state */
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
          <Package size={38} className="mx-auto text-slate-300" />

          <h2 className="mt-4 text-lg font-extrabold">No listings yet</h2>

          <p className="mt-1 text-sm text-slate-500">
            Items you share with your campus will appear here.
          </p>

          <Link
            to="/app/add-item"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white hover:bg-indigo-700"
          >
            <Plus size={16} />
            Share your first item
          </Link>
        </div>
      )}

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4">
          <form
            onSubmit={saveChanges}
            className="my-8 w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl sm:p-8"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-black">Edit listing</h2>

                <p className="mt-1 text-sm text-slate-500">
                  Update your item details and photo.
                </p>
              </div>

              <button
                type="button"
                onClick={closeEdit}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100"
                aria-label="Close edit form"
              >
                <X size={19} />
              </button>
            </div>

            {/* Item name */}
            <label className="mt-6 block text-sm font-bold text-slate-700">
              Item name
              <input
                required
                minLength={2}
                maxLength={160}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-500"
              />
            </label>

            {/* Description */}
            <label className="mt-4 block text-sm font-bold text-slate-700">
              Description
              <textarea
                maxLength={2000}
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                rows={3}
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-500"
              />
            </label>

            {/* Category and condition */}
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-bold text-slate-700">
                Category
                <select
                  value={form.category}
                  onChange={(e) =>
                    setForm({ ...form, category: e.target.value })
                  }
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
                >
                  {[
                    "Books",
                    "Electronics",
                    "Stationery",
                    "Clothing",
                    "Sports",
                    "Other",
                  ].map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm font-bold text-slate-700">
                Condition
                <select
                  value={form.condition}
                  onChange={(e) =>
                    setForm({ ...form, condition: e.target.value })
                  }
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
                >
                  {["New", "Like New", "Good", "Fair"].map((condition) => (
                    <option key={condition} value={condition}>
                      {condition}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {/* Image upload */}
            <div className="mt-5">
              <p className="text-sm font-bold text-slate-700">Item photo</p>

              <div className="mt-2 flex items-center gap-4">
                <div className="grid h-24 w-28 shrink-0 place-items-center overflow-hidden rounded-xl bg-slate-100">
                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt="Item preview"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <ImagePlus className="text-slate-400" size={25} />
                  )}
                </div>

                <label className="cursor-pointer rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50">
                  {editing.image_url ? "Change photo" : "Upload photo"}

                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => handleImage(e.target.files?.[0])}
                  />
                </label>
                {imagePreview && (
                  <button
                    type="button"
                    onClick={() => {
                      if (imagePreview.startsWith("blob:")) {
                        URL.revokeObjectURL(imagePreview);
                      }

                      setImageFile(null);
                      setImagePreview("");
                      setError("");
                    }}
                    className="ml-2 rounded-xl border border-rose-200 px-4 py-3 text-sm font-bold text-rose-600 hover:bg-rose-50"
                  >
                    Remove photo
                  </button>
                )}
              </div>

              <p className="mt-2 text-xs text-slate-400">
                JPG, PNG or WEBP · Maximum 5 MB
              </p>
            </div>

            {/* Modal actions */}
            <div className="mt-7 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeEdit}
                className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                {saving ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <CheckCircle2 size={16} />
                )}

                {saving ? "Saving..." : "Save changes"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
