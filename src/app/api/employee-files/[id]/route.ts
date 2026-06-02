import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const supabase = await createClient();
  const { data: document, error } = await supabase
    .from("employee_documents")
    .select("storage_path")
    .eq("id", id)
    .single();

  if (error || !document?.storage_path) {
    return NextResponse.json({ error: "Documento no encontrado." }, { status: 404 });
  }

  const { data, error: signedUrlError } = await supabase.storage
    .from("erp-files")
    .createSignedUrl(document.storage_path, 60);

  if (signedUrlError || !data?.signedUrl) {
    return NextResponse.json({ error: "No se pudo abrir el documento." }, { status: 400 });
  }

  return NextResponse.redirect(data.signedUrl);
}
