import { createContext, useContext, useEffect, useState, ReactNode, useRef } from "react";
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
  const preferSecondaryRef = useRef<boolean>(supabaseTatica !== supabase);
  const hasSecondaryProject = supabaseTatica !== supabase;

  useEffect(() => {
    // Check sessions for both clients on load
    const initAuth = async () => {
      setLoading(true);

      // Helper for Orphan Check
      const checkOrphan = async (client: SupabaseClient, user: User) => {
        const createdAt = new Date(user.created_at);
        const now = new Date();
        const hoursSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

        if (hoursSinceCreation > 24) {
          const { count, error } = await client
            .from('user_companies')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id);

          if (!error && count === 0) {
            return true; // Is Orphan
          }
        }
        return false;
      };

      if (hasSecondaryProject) {
        const { data: { session: secSession } } = await supabaseTatica.auth.getSession();

        if (secSession) {
          const { data: { user: validUser }, error: userError } = await supabaseTatica.auth.getUser();

          if (validUser && !userError) {
            const isOrphan = await checkOrphan(supabaseTatica, validUser);
            if (isOrphan) {
              await supabaseTatica.auth.signOut();
              setLoading(false);
              return;
            }

            setSession(secSession);
            setUser(validUser);
            setActiveClient(supabaseTatica);
            setIsUsingSecondary(true);
            preferSecondaryRef.current = true;
            setLoading(false);
            return;
          } else {
            await supabaseTatica.auth.signOut();
          }
        }
      }

      const { data: { session: mainSession } } = await supabase.auth.getSession();

      if (mainSession) {
        const { data: { user: validUser }, error: userError } = await supabase.auth.getUser();

        if (validUser && !userError) {
          const isOrphan = await checkOrphan(supabase, validUser);
          if (isOrphan) {
            await supabase.auth.signOut();
            setLoading(false);
            return;
          }

          setSession(mainSession);
          setUser(validUser);
          setActiveClient(supabase);
          setIsUsingSecondary(false);
          preferSecondaryRef.current = false;
          setLoading(false);
          return;
        } else {
          await supabase.auth.signOut();
        }
      }

      setLoading(false);
    };

    initAuth();

    // Helper for Orphan Check (redefined for scope or could be moved out)
    const validateUserAccess = async (client: SupabaseClient, user: User) => {
      const createdAt = new Date(user.created_at);
      const now = new Date();
      const hoursSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

      if (hoursSinceCreation > 24) {
        const { count, error } = await client
          .from('user_companies')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);

        if (!error && count === 0) {
          return false; // Access Denied
        }
      }
      return true; // Access Granted
    };

    // Listen to Main Client Auth Changes
    const { data: { subscription: mainSub } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (hasSecondaryProject && preferSecondaryRef.current) {
          return;
        }
        if (session) {
          // Validate user on change
          const { data: { user: validUser }, error } = await supabase.auth.getUser();
          if (error || !validUser) {
            await supabase.auth.signOut();
            setSession(null);
            setUser(null);
            return;
          }

          // ORPHAN CHECK MAIN
          const hasAccess = await validateUserAccess(supabase, validUser);
          if (!hasAccess) {
            console.warn("User is orphan on Main DB. Blocking.");
            await supabase.auth.signOut();
            setSession(null);
            setUser(null);
            return;
          }

          setSession(session);
          setUser(validUser);
          setActiveClient(supabase);
          setIsUsingSecondary(false);
          preferSecondaryRef.current = false;
        } else if (!session && !isUsingSecondary) {
          // Only clear if we are not actively using the secondary
          setSession(null);
          setUser(null);
        }
      }
    );

    // Listen to Secondary Client Auth Changes
    const secSub = hasSecondaryProject
      ? supabaseTatica.auth.onAuthStateChange(async (event, session) => {
        if (session) {
          const { data: { user: validUser }, error } = await supabaseTatica.auth.getUser();
          if (error || !validUser) {
            await supabaseTatica.auth.signOut();
            setSession(null);
            setUser(null);
            return;
          }

          const hasAccess = await validateUserAccess(supabaseTatica, validUser);
          if (!hasAccess) {
            await supabaseTatica.auth.signOut();
            setSession(null);
            setUser(null);
            return;
          }

          preferSecondaryRef.current = true;
          setSession(session);
          setUser(validUser);
          setActiveClient(supabaseTatica);
          setIsUsingSecondary(true);
        }
      }).data.subscription
      : null;

    return () => {
      mainSub.unsubscribe();
      secSub?.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    if (hasSecondaryProject) {
      const { data: secData, error: secError } = await supabaseTatica.auth.signInWithPassword({ email, password });

      if (!secError && secData.session) {
        const user = secData.user;
        if (user) {
          const createdAt = new Date(user.created_at);
          const now = new Date();
          const hoursSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

          if (hoursSinceCreation > 24) {
            const { count, error: countError } = await supabaseTatica
              .from('user_companies')
              .select('*', { count: 'exact', head: true })
              .eq('user_id', user.id);

            if (!countError && count === 0) {
              await supabaseTatica.auth.signOut();
              return { error: new Error("Acesso negado: Usuário sem empresas vinculadas.") };
            }
          }
        }

        preferSecondaryRef.current = true;
        setSession(secData.session);
        setUser(secData.user);
        setActiveClient(supabaseTatica);
        setIsUsingSecondary(true);
        toast.info("Conectado ao banco Tatica (Novo).");
        return { error: null };
      }

      console.log("Secondary DB login failed, trying main DB...", secError?.message);
    }

    const { data: mainData, error: mainError } = await supabase.auth.signInWithPassword({ email, password });

    if (!mainError && mainData.session) {
      // ORPHAN CHECK on SignIn (Main)
      const user = mainData.user;
      if (user) {
        const createdAt = new Date(user.created_at);
        const now = new Date();
        const hoursSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

        if (hoursSinceCreation > 24) {
          const { count, error: countError } = await supabase
            .from('user_companies')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id);

          if (!countError && count === 0) {
            await supabase.auth.signOut();
            return { error: new Error("Acesso negado: Usuário sem empresas vinculadas.") };
          }
        }
      }

      preferSecondaryRef.current = false;
      setSession(mainData.session);
      setUser(mainData.user);
      setActiveClient(supabase);
      setIsUsingSecondary(false);
      toast.info("Conectado ao banco principal.");
      return { error: null };
    }

    // Both failed
    return { error: mainError };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const redirectUrl = `${window.location.origin}/`;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: { full_name: fullName }
      }
    });

    if (error) {
      const msg = error.message.toLowerCase();
      if (
        msg.includes("already registered") ||
        msg.includes("user already registered") ||
        msg.includes("already been registered") ||
        msg.includes("duplicate") ||
        msg.includes("already exists")
      ) {
        return { error: new Error("Este email já está cadastrado") };
      }
      return { error };
    }

    if (data.session && data.user) {
      preferSecondaryRef.current = false;
      setSession(data.session);
      setUser(data.user);
      setActiveClient(supabase);
      setIsUsingSecondary(false);
    }

    return { error };
  };

  const signOut = async () => {
    // Sign out from BOTH to be safe
    await supabase.auth.signOut();
    if (hasSecondaryProject) {
      await supabaseTatica.auth.signOut();
    }
    setSession(null);
    setUser(null);
    setActiveClient(supabase); // Reset to default
    setIsUsingSecondary(false);
    preferSecondaryRef.current = false;
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
