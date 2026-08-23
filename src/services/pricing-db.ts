/**
 * pricing-db.ts — acesso a dados do módulo de Precificação (admin-only).
 *
 * Todas as tabelas pricing_* têm RLS restrita a is_admin(); estas chamadas só
 * funcionam para o admin autenticado. NÃO lê nem escreve nada do cardápio/preço
 * real — apenas as tabelas privadas de precificação.
 */
import { supabase, isSupabaseConfigured, requireSupabase } from "@/lib/supabase";
import type { PricingProfile, CostItem, PricingSettings, PricingUnitKind } from "@/services/pricing";

function ok() {
  return isSupabaseConfigured && !!supabase;
}

function rowToItem(r: any): CostItem {
  return {
    id: r.id,
    label: r.label ?? "",
    unitKind: (r.unit_kind ?? "unidade") as PricingUnitKind,
    purchaseQty: Number(r.purchase_qty) || 0,
    purchasePrice: Number(r.purchase_price) || 0,
    usedQty: Number(r.used_qty) || 0,
    unitLabel: r.unit_label ?? "",
    order: Number(r.sort_order) || 0,
  };
}

/** Configurações globais (margem mínima/desejada padrão). */
export async function fetchPricingSettings(): Promise<PricingSettings | null> {
  if (!ok()) return null;
  try {
    const { data, error } = await supabase!.from("pricing_settings").select("*").eq("id", "default").maybeSingle();
    if (error) return null;
    return {
      defaultMinMargin: Number(data?.default_min_margin ?? 20) || 0,
      defaultTargetMargin: Number(data?.default_target_margin ?? 50) || 0,
    };
  } catch {
    return null;
  }
}

export async function savePricingSettings(s: PricingSettings): Promise<{ ok: boolean; error?: string }> {
  const sb = requireSupabase();
  const { error } = await sb.from("pricing_settings").update({
    default_min_margin: s.defaultMinMargin,
    default_target_margin: s.defaultTargetMargin,
  }).eq("id", "default");
  return error ? { ok: false, error: error.message } : { ok: true };
}

/** Perfil de precificação de um produto (com seus itens de custo), ou null. */
export async function fetchPricingProfile(productId: string): Promise<PricingProfile | null> {
  if (!ok()) return null;
  try {
    const { data: prof, error } = await supabase!
      .from("pricing_profiles").select("*").eq("product_id", productId).maybeSingle();
    if (error || !prof) return null;
    const { data: items } = await supabase!
      .from("pricing_cost_items").select("*").eq("profile_id", prof.id).order("sort_order");
    return {
      id: prof.id,
      productId: prof.product_id,
      salePrice: prof.sale_price != null ? Number(prof.sale_price) : null,
      minMargin: prof.min_margin != null ? Number(prof.min_margin) : null,
      targetMargin: prof.target_margin != null ? Number(prof.target_margin) : null,
      notes: prof.notes ?? "",
      items: (items ?? []).map(rowToItem),
    };
  } catch {
    return null;
  }
}

/** Quais produtos já têm perfil (para marcar na lista). */
export async function fetchPricedProductIds(): Promise<Set<string>> {
  if (!ok()) return new Set();
  try {
    const { data, error } = await supabase!.from("pricing_profiles").select("product_id");
    if (error || !data) return new Set();
    return new Set(data.map((r: any) => r.product_id as string));
  } catch {
    return new Set();
  }
}

/**
 * Carrega TODOS os perfis de precificação com seus itens (para o dashboard e a
 * tabela). Uma query de perfis + uma de itens; monta um mapa productId→perfil.
 */
export async function fetchAllPricingProfiles(): Promise<Map<string, PricingProfile>> {
  const out = new Map<string, PricingProfile>();
  if (!ok()) return out;
  try {
    const { data: profs, error } = await supabase!.from("pricing_profiles").select("*");
    if (error || !profs?.length) return out;
    const ids = profs.map((p: any) => p.id);
    const { data: items } = await supabase!
      .from("pricing_cost_items").select("*").in("profile_id", ids).order("sort_order");
    const itemsByProfile = new Map<string, CostItem[]>();
    (items ?? []).forEach((r: any) => {
      const arr = itemsByProfile.get(r.profile_id) ?? [];
      arr.push(rowToItem(r));
      itemsByProfile.set(r.profile_id, arr);
    });
    profs.forEach((prof: any) => {
      out.set(prof.product_id, {
        id: prof.id,
        productId: prof.product_id,
        salePrice: prof.sale_price != null ? Number(prof.sale_price) : null,
        minMargin: prof.min_margin != null ? Number(prof.min_margin) : null,
        targetMargin: prof.target_margin != null ? Number(prof.target_margin) : null,
        notes: prof.notes ?? "",
        items: itemsByProfile.get(prof.id) ?? [],
      });
    });
    return out;
  } catch {
    return out;
  }
}

/**
 * Cria/atualiza o perfil de um produto e substitui seus itens de custo.
 * Escopo estrito ao product_id informado — não toca em outros produtos nem no
 * cardápio. Retorna {ok,error} para a UI mostrar falha sem fingir sucesso.
 */
export async function savePricingProfile(p: {
  productId: string;
  salePrice: number | null;
  minMargin: number | null;
  targetMargin: number | null;
  notes: string;
  items: CostItem[];
}): Promise<{ ok: boolean; error?: string }> {
  const sb = requireSupabase();
  try {
    // upsert do perfil por product_id (unique) → devolve o id
    const up = await sb.from("pricing_profiles").upsert(
      {
        product_id: p.productId,
        sale_price: p.salePrice,
        min_margin: p.minMargin,
        target_margin: p.targetMargin,
        notes: p.notes,
      },
      { onConflict: "product_id" }
    ).select("id").single();
    if (up.error) throw new Error(up.error.message);
    const profileId = up.data.id as string;

    // substitui os itens de custo do perfil (escopo profile_id)
    const del = await sb.from("pricing_cost_items").delete().eq("profile_id", profileId);
    if (del.error) throw new Error(del.error.message);

    if (p.items.length) {
      const ins = await sb.from("pricing_cost_items").insert(
        p.items.map((it, i) => ({
          profile_id: profileId,
          label: it.label,
          unit_kind: it.unitKind,
          purchase_qty: it.purchaseQty,
          purchase_price: it.purchasePrice,
          used_qty: it.usedQty,
          unit_label: it.unitLabel,
          sort_order: i,
        }))
      );
      if (ins.error) throw new Error(ins.error.message);
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Falha ao salvar." };
  }
}

/** Remove o perfil de precificação de um produto (não toca no produto). */
export async function deletePricingProfile(productId: string): Promise<{ ok: boolean; error?: string }> {
  const sb = requireSupabase();
  const { error } = await sb.from("pricing_profiles").delete().eq("product_id", productId);
  return error ? { ok: false, error: error.message } : { ok: true };
}
