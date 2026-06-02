import { NextRequest } from "next/server";
import { apiError, apiOk, getSupabase } from "@/lib/db/api";
import { reportExportSchema } from "@/lib/db/validators";

export async function POST(request: NextRequest) {
  try {
    const payload = reportExportSchema.parse(await request.json());
    const supabase = await getSupabase();

    const { data, error } = await supabase
      .from("report_exports")
      .insert({
        module: payload.module,
        format: payload.format,
        filters: payload.filters,
        status: "pendiente"
      })
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    return apiOk(
      {
        ...data,
        message:
          "Solicitud registrada. El worker de exportacion debe generar Excel, PDF o PNG y adjuntar el archivo en Supabase Storage."
      },
      201
    );
  } catch (error) {
    return apiError(error, 400);
  }
}
