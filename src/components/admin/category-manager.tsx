"use client";

import { useState, useTransition } from "react";
import { Check, LoaderCircle, Pencil, Plus, Trash2, X } from "lucide-react";
import type { AdminCategory } from "@/lib/admin/data";
import { createCategory, deleteCategory, renameCategory } from "@/app/admin/actions";
import { toast } from "@/store/admin-toast-store";
import { cn } from "@/lib/utils";
import { ConfirmButton } from "@/components/admin/confirm-button";

const inputClass =
  "h-12 min-w-0 flex-1 rounded-2xl bg-white px-4 text-base ring-1 ring-zinc-200 outline-none focus:ring-2 focus:ring-sky-600 dark:bg-zinc-900 dark:ring-zinc-800";

export function CategoryManager({ categories }: { categories: AdminCategory[] }) {
  const [name, setName] = useState("");
  const [pending, startTransition] = useTransition();

  const create = () => {
    const clean = name.trim();
    if (!clean) return;
    startTransition(async () => {
      const result = await createCategory(clean);
      if (!result.ok) return void toast.error(result.error);
      setName("");
      toast.success(`Categoría “${clean}” creada`);
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-black tracking-tight">Categorías</h1>
        <p className="text-sm text-zinc-500">Se muestran como filtros en la tienda, en este orden.</p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          create();
        }}
        className="flex gap-2"
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
          placeholder="Nueva categoría (ej: Ropa)"
          aria-label="Nombre de la nueva categoría"
          className={inputClass}
        />
        <button
          type="submit"
          disabled={pending || !name.trim()}
          className="flex h-12 shrink-0 items-center gap-1.5 rounded-2xl bg-sky-600 px-5 text-sm font-bold text-white shadow-lg shadow-sky-600/25 transition active:scale-95 disabled:opacity-50 disabled:shadow-none"
        >
          {pending ? <LoaderCircle className="size-5 animate-spin" /> : <Plus className="size-5" />}
          Crear
        </button>
      </form>

      {categories.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-zinc-300 px-6 py-12 text-center text-sm text-zinc-500 dark:border-zinc-700">
          Todavía no hay categorías. Creá la primera arriba.
        </p>
      ) : (
        <ul className="space-y-2.5">
          {categories.map((c) => (
            <CategoryRow key={c.id} category={c} />
          ))}
        </ul>
      )}
    </div>
  );
}

function CategoryRow({ category }: { category: AdminCategory }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(category.name);
  const [pending, startTransition] = useTransition();

  const save = () => {
    const clean = name.trim();
    if (!clean || clean === category.name) {
      setEditing(false);
      setName(category.name);
      return;
    }
    startTransition(async () => {
      const result = await renameCategory(category.id, clean);
      if (!result.ok) return void toast.error(result.error);
      setEditing(false);
      toast.success("Categoría renombrada");
    });
  };

  const remove = () =>
    startTransition(async () => {
      const result = await deleteCategory(category.id);
      if (!result.ok) return void toast.error(result.error);
      toast.success(`Categoría “${category.name}” eliminada`);
    });

  return (
    <li
      className={cn(
        "rounded-2xl bg-white p-3 ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800",
        pending && "opacity-60",
      )}
    >
      {editing ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
          className="flex gap-2"
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            autoFocus
            aria-label="Nuevo nombre"
            className={cn(inputClass, "bg-zinc-50 dark:bg-zinc-950")}
          />
          <button
            type="submit"
            disabled={pending}
            aria-label="Guardar nombre"
            className="grid size-12 shrink-0 place-items-center rounded-2xl bg-emerald-600 text-white"
          >
            <Check className="size-5" />
          </button>
          <button
            type="button"
            onClick={() => {
              setEditing(false);
              setName(category.name);
            }}
            aria-label="Cancelar"
            className="grid size-12 shrink-0 place-items-center rounded-2xl bg-zinc-100 dark:bg-zinc-800"
          >
            <X className="size-5" />
          </button>
        </form>
      ) : (
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1 pl-1">
            <p className="truncate font-bold">{category.name}</p>
            <p className="text-xs text-zinc-500">
              {category.productCount} {category.productCount === 1 ? "producto" : "productos"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setEditing(true)}
            aria-label={`Renombrar ${category.name}`}
            className="grid size-12 shrink-0 place-items-center rounded-2xl bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
          >
            <Pencil className="size-5" />
          </button>
          {category.productCount === 0 ? (
            <ConfirmButton
              onConfirm={remove}
              disabled={pending}
              confirmLabel="Borrar"
              aria-label={`Borrar ${category.name}`}
              className="h-12 min-w-12 px-3"
            >
              <Trash2 className="size-5" />
            </ConfirmButton>
          ) : (
            <span
              title="Mové o borrá sus productos para poder eliminarla"
              className="grid size-12 shrink-0 place-items-center rounded-2xl text-zinc-300 dark:text-zinc-700"
              aria-label="No se puede borrar: tiene productos"
            >
              <Trash2 className="size-5" />
            </span>
          )}
        </div>
      )}
    </li>
  );
}
