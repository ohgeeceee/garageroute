"use client";

import { useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  CheckCircle,
  XCircle,
  Loader2,
  Save,
} from "lucide-react";
import { Item, categories, Sale } from "@/data/sales";

const conditions = ["New", "Like New", "Good", "Fair"];

export default function ItemManager({
  sale,
  token,
  onUpdate,
}: {
  sale: Sale;
  token: string;
  onUpdate: (sale: Sale) => void;
}) {
  const [items, setItems] = useState<Item[]>(sale.items);
  const [editing, setEditing] = useState<string | "new">();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<Item>>({});

  const resetForm = () => {
    setForm({});
    setEditing(undefined);
  };

  const startNew = () => {
    setForm({ name: "", category: categories[0], condition: "Good", price: undefined, photo: "" });
    setEditing("new");
  };

  const startEdit = (item: Item) => {
    setForm({ ...item });
    setEditing(item.id);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.category) return;
    setSaving(true);

    try {
      if (editing === "new") {
        const res = await fetch(`/api/manage/${token}/items`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        const next = { ...sale, items: [...items, data] };
        setItems(next.items);
        onUpdate(next);
      } else if (editing) {
        const res = await fetch(`/api/manage/${token}/items/${editing}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        const next = {
          ...sale,
          items: items.map((i) => (i.id === editing ? data : i)),
        };
        setItems(next.items);
        onUpdate(next);
      }
      resetForm();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save item");
    } finally {
      setSaving(false);
    }
  };

  const toggleSold = async (item: Item) => {
    const res = await fetch(`/api/manage/${token}/items/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sold: !item.sold }),
    });
    if (!res.ok) return;
    const data = await res.json();
    const next = {
      ...sale,
      items: items.map((i) => (i.id === item.id ? { ...i, sold: data.sold } : i)),
    };
    setItems(next.items);
    onUpdate(next);
  };

  const remove = async (itemId: string) => {
    if (!confirm("Delete this item?")) return;
    const res = await fetch(`/api/manage/${token}/items/${itemId}`, {
      method: "DELETE",
    });
    if (!res.ok) return;
    const next = { ...sale, items: items.filter((i) => i.id !== itemId) };
    setItems(next.items);
    onUpdate(next);
  };

  const soldCount = items.filter((i) => i.sold).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-zinc-500">
            {soldCount} of {items.length} marked sold
          </p>
        </div>
        <button
          onClick={startNew}
          disabled={editing === "new"}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
        >
          <Plus className="h-4 w-4" />
          Add item
        </button>
      </div>

      {(editing === "new" || editing) && (
        <form
          onSubmit={save}
          className="rounded-xl border border-zinc-200 bg-zinc-50 p-5"
        >
          <h3 className="text-sm font-bold text-zinc-900">
            {editing === "new" ? "Add new item" : "Edit item"}
          </h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-zinc-700">Item name</label>
              <input
                value={form.name || ""}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-700">Category</label>
              <select
                value={form.category || ""}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                required
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-700">Condition</label>
              <select
                value={form.condition || "Good"}
                onChange={(e) => setForm((f) => ({ ...f, condition: e.target.value as Item["condition"] }))}
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              >
                {conditions.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-700">Price</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.price ?? ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    price: e.target.value ? Number(e.target.value) : undefined,
                  }))
                }
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-700">Photo URL</label>
              <input
                value={form.photo || ""}
                onChange={(e) => setForm((f) => ({ ...f, photo: e.target.value }))}
                placeholder="https://..."
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save item
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {items.length === 0 ? (
        <p className="text-sm text-zinc-500">No items yet. Add your first item above.</p>
      ) : (
        <ul className="divide-y divide-zinc-100 rounded-xl border border-zinc-200 bg-white">
          {items.map((item) => (
            <li
              key={item.id}
              className={`flex items-center justify-between gap-3 p-4 ${
                item.sold ? "bg-zinc-50" : ""
              }`}
            >
              <div className="flex items-center gap-3">
                {item.photo ? (
                  <img
                    src={item.photo}
                    alt={item.name}
                    className="h-12 w-12 rounded-lg object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-zinc-100 text-xs text-zinc-400">
                    No img
                  </div>
                )}
                <div>
                  <p
                    className={`font-medium ${
                      item.sold ? "text-zinc-400 line-through" : "text-zinc-900"
                    }`}
                  >
                    {item.name}
                  </p>
                  <p className="text-sm text-zinc-500">
                    {item.category} · {item.condition}
                    {item.price ? ` · $${item.price.toFixed(2)}` : ""}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => toggleSold(item)}
                  className={`rounded-lg p-2 transition ${
                    item.sold
                      ? "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                      : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                  }`}
                  title={item.sold ? "Mark available" : "Mark sold"}
                >
                  {item.sold ? <XCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => startEdit(item)}
                  className="rounded-lg p-2 text-zinc-600 transition hover:bg-zinc-100"
                  title="Edit"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => remove(item.id)}
                  className="rounded-lg p-2 text-red-600 transition hover:bg-red-50"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
