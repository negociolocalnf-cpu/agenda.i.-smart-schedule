import { supabase } from "@/integrations/supabase/client";

export interface ConflictCheckParams {
  professional_id: string;
  starts_at: Date;
  ends_at: Date;
  /** Appointment ID to exclude (when editing). */
  exclude_id?: string;
}

export interface ConflictResult {
  ok: boolean;
  conflicts: Array<{
    id: string;
    starts_at: string;
    ends_at: string;
    patient_name: string | null;
  }>;
}

/**
 * Checks whether a proposed appointment overlaps with another one for the
 * same professional. Two intervals overlap when:
 *   newStart < existingEnd AND newEnd > existingStart
 */
export async function checkAppointmentConflict(
  params: ConflictCheckParams,
): Promise<ConflictResult> {
  const { professional_id, starts_at, ends_at, exclude_id } = params;

  // Fetch any appointment for this professional that could overlap.
  // Postgres can express the overlap directly with two filters.
  let query = supabase
    .from("appointments")
    .select("id, starts_at, ends_at, status, patient:patients(name)")
    .eq("professional_id", professional_id)
    .lt("starts_at", ends_at.toISOString())
    .gt("ends_at", starts_at.toISOString())
    .neq("status", "canceled");

  if (exclude_id) {
    query = query.neq("id", exclude_id);
  }

  const { data, error } = await query;
  if (error) {
    // Fail open — let the user save and surface the DB error elsewhere.
    return { ok: true, conflicts: [] };
  }

  const conflicts = ((data ?? []) as Array<{
    id: string;
    starts_at: string;
    ends_at: string;
    patient: { name: string } | null;
  }>).map((c) => ({
    id: c.id,
    starts_at: c.starts_at,
    ends_at: c.ends_at,
    patient_name: c.patient?.name ?? null,
  }));

  return { ok: conflicts.length === 0, conflicts };
}
