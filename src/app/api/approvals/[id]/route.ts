import { NextRequest } from "next/server";
import { apiError, apiOk, getSupabase } from "@/lib/db/api";
import { approvalActionSchema } from "@/lib/db/validators";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const payload = approvalActionSchema.parse(await request.json());
    const supabase = await getSupabase();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    const { data: approval, error: approvalError } = await supabase
      .from("approvals")
      .update({
        status: payload.action,
        resolved_by: payload.action === "informacion_requerida" ? null : user?.id,
        resolved_at: payload.action === "informacion_requerida" ? null : new Date().toISOString()
      })
      .eq("id", id)
      .select("*")
      .single();

    if (approvalError) {
      throw approvalError;
    }

    const { error: actionError } = await supabase.from("approval_actions").insert({
      approval_id: id,
      action: payload.action,
      comment: payload.comment
    });

    if (actionError) {
      throw actionError;
    }

    return apiOk(approval);
  } catch (error) {
    return apiError(error, 400);
  }
}
