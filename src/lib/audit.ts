import { SupabaseClient } from "@supabase/supabase-js";

export async function logDeletion(
  client: SupabaseClient,
  params: {
    userId: string;
    companyId?: string | null;
    entity: string;
    entityId: string;
    payload?: Record<string, any> | null;
  }
) {
  const { userId, companyId = null, entity, entityId, payload = null } = params;
  await client.from("audit_logs").insert([
    {
      user_id: userId,
      company_id: companyId,
      entity,
      entity_id: entityId,
      action: "delete",
      payload,
    },
  ]);
}
