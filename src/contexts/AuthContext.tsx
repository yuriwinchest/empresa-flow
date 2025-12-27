import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session, SupabaseClient } from "@supabase/supabase-js";
import { supabase, supabaseTatica } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  activeClient: SupabaseClient; // Expose the active client so hooks can use it
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  isUsingSecondary: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeClient, setActiveClient] = useState<SupabaseClient>(supabase); // Default to main client
  const [isUsingSecondary, setIsUsingSecondary] = useState(false);

  useEffect(() => {
    // Check sessions for both clients on load
    const initAuth = async () => {
      setLoading(true);

      // Try Main Client First
      const { data: { session: mainSession } } = await supabase.auth.getSession();
      if (mainSession) {
        setSession(mainSession);
        setUser(mainSession.user);
        setActiveClient(supabase);
        setIsUsingSecondary(false);
        setLoading(false);
        return;
      }

      // Try Secondary Client (Tatica/New)
      const { data: { session: secSession } } = await supabaseTatica.auth.getSession();
      if (secSession) {
        setSession(secSession);
        setUser(secSession.user);
        setActiveClient(supabaseTatica);
        setIsUsingSecondary(true);
        setLoading(false);
        return;
      }

      setLoading(false);
    };

    initAuth();

    // Listen to Main Client Auth Changes
    const { data: { subscription: mainSub } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session) {
          setSession(session);
          setUser(session?.user ?? null);
          setActiveClient(supabase);
          setIsUsingSecondary(false);
        } else if (!session && !isUsingSecondary) {
          // Only clear if we are not actively using the secondary
          setSession(null);
          setUser(null);
        }
      }
    );

    // Listen to Secondary Client Auth Changes
    const { data: { subscription: secSub } } = supabaseTatica.auth.onAuthStateChange(
      (event, session) => {
        if (session) {
          setSession(session);
          setUser(session?.user ?? null);
          setActiveClient(supabaseTatica);
          setIsUsingSecondary(true);
        }
      }
    );

    return () => {
      mainSub.unsubscribe();
      secSub.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    // 1. Try Main Client
    const { data: mainData, error: mainError } = await supabase.auth.signInWithPassword({ email, password });

    if (!mainError && mainData.session) {
      setSession(mainData.session);
      setUser(mainData.user);
      setActiveClient(supabase);
      setIsUsingSecondary(false);
      toast.info("Conectado ao banco principal.");
      return { error: null };
    }

    // 2. If Main failed, Try Secondary Client
    console.log("Main DB login failed, trying secondary DB...", mainError?.message);
    const { data: secData, error: secError } = await supabaseTatica.auth.signInWithPassword({ email, password });

    if (!secError && secData.session) {
      setSession(secData.session);
      setUser(secData.user);
      setActiveClient(supabaseTatica);
      setIsUsingSecondary(true);
      toast.info("Conectado ao banco Tatica (Novo).");
      return { error: null };
    }

    // Both failed
    return { error: mainError || secError };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const redirectUrl = `${window.location.origin}/`;

    // Register in the 'Tatica' (New) project by default to support migration.
    const { data, error } = await supabaseTatica.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: { full_name: fullName }
      }
    });

    if (error) {
      return { error };
    }

    // If successful in Main, return success.
    // Note: We are NOT automatically registering in the secondary to avoid ID conflicts or auth confusion unless we sync IDs.

    return { error };
  };

  const signOut = async () => {
    // Sign out from BOTH to be safe
    await supabase.auth.signOut();
    await supabaseTatica.auth.signOut();
    setSession(null);
    setUser(null);
    setActiveClient(supabase); // Reset to default
    setIsUsingSecondary(false);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signOut, activeClient, isUsingSecondary }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
