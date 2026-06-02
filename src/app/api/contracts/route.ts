import { NextRequest } from "next/server";
import { apiError, apiOk, getSupabase } from "@/lib/db/api";
import { contractSchema } from "@/lib/db/validators";

export async function GET() {
  try {
    const supabase = await getSupabase();
    const { data, error } = await supabase
      .from("contracts")
      .select(
        `
        *,
        clients(name, rfc),
        projects(name),
        contract_items(
          *,
          products(name, sku),
          sectors(name),
          requirements(name)
        )
      `
      )
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    return apiOk(data ?? []);
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = contractSchema.parse(await request.json());
    const supabase = await getSupabase();

    const { data: contract, error: contractError } = await supabase
      .from("contracts")
      .insert({
        client_id: payload.client_id,
        project_id: payload.project_id,
        contract_type: payload.contract_type,
        code: payload.code,
        name: payload.name,
        amount: payload.amount,
        start_date: payload.start_date,
        end_date: payload.end_date,
        responsible_user_id: payload.responsible_user_id,
        status: "borrador"
      })
      .select("*")
      .single();

    if (contractError) {
      throw contractError;
    }

    if (payload.items.length > 0) {
      const { error: itemsError } = await supabase.from("contract_items").insert(
        payload.items.map((item) => ({
          ...item,
          contract_id: contract.id,
          delivered_quantity: 0,
          status: "activo"
        }))
      );

      if (itemsError) {
        throw itemsError;
      }
    }

    return apiOk(contract, 201);
  } catch (error) {
    return apiError(error, 400);
  }
}
