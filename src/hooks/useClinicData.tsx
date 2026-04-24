import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface Professional {
  id: string;
  name: string;
  specialty: string | null;
  email: string | null;
  phone: string | null;
  color: string | null;
  active: boolean;
  created_at: string;
}

export interface Patient {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  birth_date: string | null;
  notes: string | null;
  created_at: string;
}

export function useProfessionals() {
  const { user } = useAuth();
  const [data, setData] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data: rows } = await supabase
      .from("professionals")
      .select("*")
      .order("name");
    setData((rows as Professional[]) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, loading, refetch };
}

export function usePatients() {
  const { user } = useAuth();
  const [data, setData] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data: rows } = await supabase
      .from("patients")
      .select("*")
      .order("name");
    setData((rows as Patient[]) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, loading, refetch };
}
