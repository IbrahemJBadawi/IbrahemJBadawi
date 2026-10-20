"use client";

import type { Session, User } from "@supabase/supabase-js";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getSupabase } from "@/lib/supabase/client";
import { isSupabaseConfigured, type Profile } from "@/lib/supabase/config";
import { startSync, stopSync } from "@/lib/store/sync";

interface AuthState {
  enabled: boolean;
  loading: boolean;
  user: User | null;
  profile: Profile | null;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthCtx = createContext<AuthState>({
  enabled: false,
  loading: false,
  user: null,
  profile: null,
  refreshProfile: async () => {},
  signOut: async () => {},
});

export function useAuth() {
  return useContext(AuthCtx);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = getSupabase();
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);

  const loadProfile = useCallback(
    async (userId: string) => {
      if (!supabase) return;
      const { data } = await supabase
        .from("profiles")
        .select("id, display_name, role, created_at")
        .eq("id", userId)
        .maybeSingle();
      setProfile((data as Profile | null) ?? null);
    },
    [supabase],
  );

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      setLoading(false);
      if (event === "SIGNED_OUT") {
        setProfile(null);
        void stopSync({ clearLocal: true });
      }
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  const userId = session?.user.id;
  useEffect(() => {
    if (!supabase || !userId) return;
    void loadProfile(userId);
    void startSync(supabase, userId);
  }, [supabase, userId, loadProfile]);

  const value = useMemo<AuthState>(
    () => ({
      enabled: isSupabaseConfigured,
      loading,
      user: session?.user ?? null,
      profile,
      refreshProfile: async () => {
        if (userId) await loadProfile(userId);
      },
      signOut: async () => {
        await stopSync({ clearLocal: true });
        await supabase?.auth.signOut();
      },
    }),
    [loading, session, profile, userId, loadProfile, supabase],
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}
