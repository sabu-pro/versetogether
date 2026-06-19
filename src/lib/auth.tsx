"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import { Couple, Profile } from "@/types";

const AUTH_BOOTSTRAP_TIMEOUT_MS = 10000;
const SESSION_RETRY_DELAY_MS = 350;

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
  const bootstrapCompleteRef = useRef(false);

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
      const { data: current, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (profileError) {
        console.error("[auth] profile fetch failed", profileError);
        clearCoupleState();
        return;
      }

      const currentProfile = (current as Profile) || null;
      setProfile(currentProfile);

      if (!currentProfile?.couple_id) {
        setPartner(null);
        setCouple(null);
        setProfiles([]);
        setInviteCode(null);
        return;
      }

      const [{ data: coupleData, error: coupleError }, { data: coupleProfiles, error: membersError }] =
        await Promise.all([
          supabase.from("couples").select("*").eq("id", currentProfile.couple_id).maybeSingle(),
          supabase
            .from("profiles")
            .select("*")
            .eq("couple_id", currentProfile.couple_id)
            .order("partner_order"),
        ]);

      if (coupleError || membersError) {
        console.error("[auth] couple data fetch failed", coupleError || membersError);
        setPartner(null);
        setCouple(null);
        setProfiles([]);
        setInviteCode(null);
        return;
      }

      const members = (coupleProfiles || []) as Profile[];
      setCouple((coupleData as Couple) || null);
      setProfiles(members);
      setPartner(members.find((p) => p.id !== userId) || null);

      if (members.length < 2) {
        const { data: code, error: codeError } = await supabase.rpc("get_active_invite_code");
        if (codeError) {
          console.error("[auth] invite code fetch failed", codeError);
          setInviteCode(null);
        } else {
          setInviteCode(typeof code === "string" ? code : null);
        }
      } else {
        setInviteCode(null);
      }
    } catch (error) {
      console.error("[auth] unexpected profile load error", error);
      clearCoupleState();
    } finally {
      setProfileLoading(false);
    }
  }, [clearCoupleState]);

  const applySession = useCallback(
    async (nextSession: Session | null) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      if (nextSession?.user) {
        await loadProfile(nextSession.user.id);
      } else {
        clearCoupleState();
      }
    },
    [clearCoupleState, loadProfile]
  );

  useEffect(() => {
    let active = true;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const finishBootstrap = () => {
      if (!active || bootstrapCompleteRef.current) return;
      bootstrapCompleteRef.current = true;
      setInitialized(true);
    };

    async function bootstrap() {
      try {
        let { data: { session: initialSession } } = await supabase.auth.getSession();

        if (!initialSession && active) {
          await new Promise((resolve) => setTimeout(resolve, SESSION_RETRY_DELAY_MS));
          ({ data: { session: initialSession } } = await supabase.auth.getSession());
        }

        if (!active) return;
        await applySession(initialSession);
      } catch (error) {
        console.error("[auth] bootstrap failed", error);
        if (active) clearCoupleState();
      } finally {
        finishBootstrap();
      }
    }

    timeoutId = setTimeout(() => {
      console.warn("[auth] bootstrap timeout reached, releasing loading state");
      finishBootstrap();
    }, AUTH_BOOTSTRAP_TIMEOUT_MS);

    bootstrap();

    const { data: listener } = supabase.auth.onAuthStateChange(async (event, nextSession) => {
      if (!active) return;

      if (event === "INITIAL_SESSION") {
        return;
      }

      if (event === "TOKEN_REFRESHED") {
        setSession(nextSession);
        setUser(nextSession?.user ?? null);
        return;
      }

      await applySession(nextSession);
    });

    return () => {
      active = false;
      if (timeoutId) clearTimeout(timeoutId);
      listener.subscription.unsubscribe();
    };
  }, [applySession, clearCoupleState]);

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
  const loading = !profileReady;
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
