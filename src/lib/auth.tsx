"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import { Couple, Profile } from "@/types";

type AuthContextType = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  partner: Profile | null;
  couple: Couple | null;
  profiles: Profile[];
  inviteCode: string | null;
  needsOnboarding: boolean;
  loading: boolean;
  profileReady: boolean;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [partner, setPartner] = useState<Profile | null>(null);
  const [couple, setCouple] = useState<Couple | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);

  const clearCoupleState = useCallback(() => {
    setProfile(null);
    setPartner(null);
    setCouple(null);
    setProfiles([]);
    setInviteCode(null);
  }, []);

  const loadProfile = useCallback(async (userId: string) => {
    setProfileLoading(true);

    try {
      const { data: current } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      const currentProfile = (current as Profile) || null;
      setProfile(currentProfile);

      if (!currentProfile?.couple_id) {
        setPartner(null);
        setCouple(null);
        setProfiles([]);
        setInviteCode(null);
        return;
      }

      const [{ data: coupleData }, { data: coupleProfiles }] = await Promise.all([
        supabase.from("couples").select("*").eq("id", currentProfile.couple_id).maybeSingle(),
        supabase
          .from("profiles")
          .select("*")
          .eq("couple_id", currentProfile.couple_id)
          .order("partner_order"),
      ]);

      const members = (coupleProfiles || []) as Profile[];
      setCouple((coupleData as Couple) || null);
      setProfiles(members);
      setPartner(members.find((p) => p.id !== userId) || null);

      if (members.length < 2) {
        const { data: code } = await supabase.rpc("get_active_invite_code");
        setInviteCode(typeof code === "string" ? code : null);
      } else {
        setInviteCode(null);
      }
    } finally {
      setProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      if (!active) return;

      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      if (nextSession?.user) {
        await loadProfile(nextSession.user.id);
      } else {
        clearCoupleState();
      }

      if (active) setInitialized(true);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [clearCoupleState, loadProfile]);

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error ? error.message : null;
  }

  async function signUp(email: string, password: string) {
    const { error } = await supabase.auth.signUp({ email, password });
    return error ? error.message : null;
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  const profileReady = initialized && !profileLoading;
  const loading = !initialized || profileLoading;
  const needsOnboarding = useMemo(
    () => profileReady && Boolean(user && !profile?.couple_id),
    [profileReady, user, profile?.couple_id]
  );

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        partner,
        couple,
        profiles,
        inviteCode,
        needsOnboarding,
        loading,
        profileReady,
        signIn,
        signUp,
        signOut,
        refreshProfile: async () => {
          if (user) await loadProfile(user.id);
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
