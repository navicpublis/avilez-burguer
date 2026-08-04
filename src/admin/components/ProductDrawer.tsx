import { useEffect, useRef, useState, type ReactNode } from "react";
import { X, Upload, ImageOff, Check } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  type CatalogProduct,
  type ProductInput,
  type ProductStatus,
  type ProductBadge,
  type Category,
  type AddonGroup,
  STATUS_LABEL,
  BADGE_LABEL,
  createProduct,
  updateProduct,
} from "@/services/catalog-store";

const STATUSES: ProductStatus[] = ["disponivel", "indisponivel", "oculto", "em_falta"];
const BADGES: ProductBadge[] = ["destaque", "mais_vendido", "novidade", "promocao", "limitado"];

function empty(categoryId: string): ProductInput {
  return {
    name: "", shortDesc: "", fullDesc: "", categoryId, price: 0, promoPrice: null,
    image: null, prepTime: 20, weight: "", status: "disponivel", badges: [],
    ingredients: [], addonGroupIds: [],
  };
}

/**
 * ProductDrawer — cadastro/edição de produto em drawer lateral (~45% no
 * desktop, tela inteira no mobile). Nunca abre outra página.
 */
export function ProductDrawer({
  product, categories, groups, onClose,
}: {
  product: CatalogProduct | "new" | null;
  categories: Category[];
  groups: AddonGroup[];
  onClose: () => void;
}) {
  const open = product !== null;
  const editing = product && product !== "new" ? product : null;
  const [form, setForm] = useState<ProductInput>(empty(categories[0]?.id ?? ""));
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (product === "new") setForm(empty(categories[0]?.id ?? ""));
    else if (product) {
      const { id: _id, order: _order, ...rest } = product;
      void _id; void _order;
      setForm(rest);
    }
  }, [product, categories]);

  if (!open) return null;

  const set = <K extends keyof ProductInput>(k: K, v: ProductInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  function toggleBadge(b: ProductBadge) {
    setForm((f) => ({ ...f, badges: f.badges.includes(b) ? f.badges.filter((x) => x !== b) : [...f.badges, b] }));
  }
  function toggleGroup(id: string) {
    setForm((f) => ({ ...f, addonGroupIds: f.addonGroupIds.includes(id) ? f.addonGroupIds.filter((x) => x !== id) : [...f.addonGroupIds, id] }));
  }
  function onFile(file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => set("image", String(reader.result));
    reader.readAsDataURL(file); // FUTURO: enviar p/ Supabase Storage e salvar a URL
  }
  function save() {
    if (!form.name.trim()) return;
    if (editing) updateProduct(editing.id, form);
    else createProduct(form);
    onClose();
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/60" onClick={onClose} />
      <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[46%] flex-col border-l border-border bg-card max-[860px]:max-w-full">
        <header className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="font-display text-lg font-bold">{editing ? "Editar produto" : "Novo produto"}</h2>
          <button type="button" onClick={onClose} aria-label="Fechar" className="flex size-9 items-center justify-center rounded-full bg-secondary hover:bg-accent">
            <X className="size-5" />
          </button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {/* imagem */}
          <div>
            <Label>Imagem</Label>
            <div className="flex items-center gap-3">
              <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-secondary">
                {form.image ? (
                  <img src={form.image} alt="" className="size-full object-cover" />
                ) : (
                  <ImageOff className="size-6 text-muted-foreground" />
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
                <button type="button" onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-bold hover:border-primary">
                  <Upload className="size-4" /> {form.image ? "Trocar" : "Enviar"}
                </button>
                {form.image && (
                  <button type="button" onClick={() => set("image", null)} className="rounded-lg border border-border px-3 py-2 text-sm font-bold text-red-400 hover:border-red-400">
                    Remover
                  </button>
                )}
              </div>
            </div>
          </div>

          <Field label="Nome"><input className={inp} value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Ex.: Duplo Cheddar" /></Field>
          <Field label="Descrição curta"><input className={inp} value={form.shortDesc} onChange={(e) => set("shortDesc", e.target.value)} placeholder="Aparece no card" /></Field>
          <Field label="Descrição completa"><textarea className={cn(inp, "min-h-20 py-2")} value={form.fullDesc} onChange={(e) => set("fullDesc", e.target.value)} /></Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Categoria">
              <select className={inp} value={form.categoryId} onChange={(e) => set("categoryId", e.target.value)}>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Status">
              <select className={inp} value={form.status} onChange={(e) => set("status", e.target.value as ProductStatus)}>
                {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Preço (R$)"><input type="number" step="0.01" className={inp} value={form.price || ""} onChange={(e) => set("price", Number(e.target.value))} /></Field>
            <Field label="Preço promocional (opcional)"><input type="number" step="0.01" className={inp} value={form.promoPrice ?? ""} onChange={(e) => set("promoPrice", e.target.value ? Number(e.target.value) : null)} /></Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Tempo de preparo (min)"><input type="number" className={inp} value={form.prepTime || ""} onChange={(e) => set("prepTime", Number(e.target.value))} /></Field>
            <Field label="Peso (opcional)"><input className={inp} value={form.weight} onChange={(e) => set("weight", e.target.value)} placeholder="Ex.: 220g" /></Field>
          </div>

          <Field label="Ingredientes (separados por vírgula — usados na busca)">
            <input className={inp} value={form.ingredients.join(", ")} onChange={(e) => set("ingredients", e.target.value.split(",").map((s: string) => s.trim()).filter(Boolean))} placeholder="Pão, blend, cheddar..." />
          </Field>

          {/* badges */}
          <div>
            <Label>Selos (aparecem no site)</Label>
            <div className="flex flex-wrap gap-2">
              {BADGES.map((b) => {
                const on = form.badges.includes(b);
                return (
                  <button key={b} type="button" onClick={() => toggleBadge(b)} className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors", on ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-neutral-600")}>
                    {on && <Check className="size-3.5" />} {BADGE_LABEL[b]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* grupos de adicionais */}
          <div>
            <Label>Grupos de adicionais</Label>
            {groups.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum grupo criado ainda.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {groups.map((g) => {
                  const on = form.addonGroupIds.includes(g.id);
                  return (
                    <button key={g.id} type="button" onClick={() => toggleGroup(g.id)} className={cn("flex items-center justify-between rounded-lg border px-3.5 py-2.5 text-left transition-colors", on ? "border-primary bg-primary/5" : "border-border hover:bg-secondary")}>
                      <span className="text-sm font-semibold">{g.name}</span>
                      <span className={cn("flex size-5 items-center justify-center rounded-md border-2", on ? "border-primary bg-primary" : "border-border")}>
                        <Check className={cn("size-3 text-primary-foreground", on ? "opacity-100" : "opacity-0")} strokeWidth={3} />
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <footer className="border-t border-border p-4">
          <button type="button" onClick={save} disabled={!form.name.trim()} className="h-12 w-full rounded-lg bg-primary font-extrabold text-primary-foreground transition-colors hover:bg-brand-yellow-soft disabled:cursor-not-allowed disabled:opacity-50">
            {editing ? "Salvar alterações" : "Criar produto"}
          </button>
        </footer>
      </aside>
    </>
  );
}

const inp = "h-11 w-full rounded-lg border border-border bg-secondary px-3.5 text-[0.92rem] text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:outline-none";
function Label({ children }: { children: ReactNode }) {
  return <div className="mb-1.5 text-[0.8rem] font-semibold text-foreground">{children}</div>;
}
function Field({ label, children }: { label: string; children: ReactNode }) {
  return <div><Label>{label}</Label>{children}</div>;
}
