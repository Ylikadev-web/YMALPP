import { NextRequest } from "next/server";
import { apiError, apiOk, getSupabase } from "@/lib/db/api";
import { remissionSchema } from "@/lib/db/validators";

export async function POST(request: NextRequest) {
  try {
    const payload = remissionSchema.parse(await request.json());
    const supabase = await getSupabase();

    const { data: remission, error: remissionError } = await supabase
      .from("remissions")
      .insert({
        contract_id: payload.contract_id,
        delivery_date: payload.delivery_date,
        notes: payload.notes,
        status: "emitida"
      })
      .select("*")
      .single();

    if (remissionError) {
      throw remissionError;
    }

    const { error: itemError } = await supabase.from("remission_items").insert(
      payload.items.map((item) => ({
        remission_id: remission.id,
        contract_item_id: item.contract_item_id,
        product_id: item.product_id,
        quantity: item.quantity,
        warehouse_id: item.warehouse_id
      }))
    );

    if (itemError) {
      throw itemError;
    }

    return apiOk({ remission_id: remission.id }, 201);
  } catch (error) {
    return apiError(error, 400);
  }
}
