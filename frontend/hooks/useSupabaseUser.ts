"use client";
import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";

interface DBUser {
  id: string;
  email: string;
  is_pro: boolean;
  stripe_customer_id: string | null;
  analyses_today: number;
  last_analysis_date: string | null;
}

export function useSupabaseUser() {
  const { user, isLoaded, isSignedIn } = useUser();
  const [dbUser, setDbUser] = useState<DBUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) { setLoading(false); return; }

    async function syncUser() {
      try {
        // Upsert user in Supabase
        await fetch("/api/db/user", { method: "POST" });
        // Fetch full profile
        const res = await fetch("/api/db/user");
        if (res.ok) {
          const data = await res.json();
          setDbUser(data);
        }
      } catch {
        // fail silently
      } finally {
        setLoading(false);
      }
    }
    syncUser();
  }, [isLoaded, isSignedIn, user?.id]);

  const isPro = dbUser?.is_pro ?? false;

  const refreshUser = async () => {
    const res = await fetch("/api/db/user");
    if (res.ok) setDbUser(await res.json());
  };

  return { dbUser, isPro, loading, refreshUser };
}
