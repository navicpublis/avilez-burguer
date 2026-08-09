/**
 * storage.ts — upload de imagens para o Supabase Storage (bucket "imagens").
 *
 * As imagens editáveis pelo admin (produto, logo, avatar) ficam no Storage, não
 * em Base64 no banco. As tabelas guardam apenas a URL pública retornada aqui.
 * Escrita exige admin autenticado (policies do 008_storage.sql); leitura é
 * pública. Sem Supabase configurado, retorna null e o app segue com a imagem
 * atual (fallback).
 */
import { supabase, isSupabaseConfigured } from "./supabase";

const BUCKET = "imagens";

/** Faz upload de um arquivo e devolve a URL pública (ou null em falha/sem backend). */
export async function uploadImage(file: File, folder = "geral"): Promise<string | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  try {
    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || undefined,
    });
    if (error) return null;
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return data.publicUrl ?? null;
  } catch {
    return null;
  }
}
