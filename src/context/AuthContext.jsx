import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

const ERROR_MESSAGES = {
  'Invalid login credentials': 'Email ou mot de passe incorrect.',
  'User already registered': 'Un compte existe déjà avec cet email.',
  'Email not confirmed': 'Email ou mot de passe incorrect.',
  'Password should be at least 6 characters': 'Le mot de passe doit contenir au moins 6 caractères.',
};

function translateError(message) {
  if (!message) return 'Une erreur est survenue.';
  return ERROR_MESSAGES[message] || message;
}

async function fetchProfile(userId) {
  const { data } = await supabase
    .from('profiles')
    .select('name, role')
    .eq('id', userId)
    .single();
  return data;
}

async function getOrCreateTeam(teamName) {
  if (!teamName) return null;

  const normalizedName = teamName.trim();
  if (!normalizedName) return null;

  const { data: existingTeam } = await supabase
    .from('teams')
    .select('id')
    .ilike('name', normalizedName)
    .limit(1)
    .maybeSingle();

  if (existingTeam?.id) return existingTeam.id;

  const { data: createdTeam, error: createTeamError } = await supabase
    .from('teams')
    .insert({ name: normalizedName })
    .select('id')
    .single();

  if (createTeamError) {
    throw new Error("Impossible de créer l'équipe du joueur.");
  }

  return createdTeam.id;
}

function mapUser(supabaseUser, profile) {
  return {
    id: supabaseUser.id,
    email: supabaseUser.email,
    name: profile?.name || supabaseUser.user_metadata?.name || 'Utilisateur',
    role: profile?.role || supabaseUser.user_metadata?.role || 'Coach',
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const suppressNextAuthStateChange = useRef(false);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const profile = await fetchProfile(session.user.id);
        setUser(mapUser(session.user, profile));
      }
      setLoading(false);
    }).catch(() => setLoading(false));

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        // Pendant `signup()`, Supabase peut générer une session temporaire.
        // On ignore ces changements pour éviter une redirection automatique vers /dashboard.
        if (suppressNextAuthStateChange.current) {
          if (!session?.user) setUser(null);
          return;
        }

        if (session?.user) {
          const profile = await fetchProfile(session.user.id);
          setUser(mapUser(session.user, profile));
        } else {
          setUser(null);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  async function login(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      return { success: false, error: translateError(error.message) };
    }

    const profile = await fetchProfile(data.user.id);
    setUser(mapUser(data.user, profile));
    return { success: true };
  }

  async function signup({
    name,
    email,
    password,
    role = 'Coach',
    playerProfile = null,
  }) {
    suppressNextAuthStateChange.current = true;
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { name: name.trim(), role },
      },
    });

    if (error) {
      suppressNextAuthStateChange.current = false;
      return { success: false, error: translateError(error.message) };
    }

    if (role === 'Player' && data?.user?.id) {
      try {
        const teamId = await getOrCreateTeam(playerProfile?.team);
        const playerNumber = Number(playerProfile?.number);
        const parsedNumber = Number.isFinite(playerNumber) ? playerNumber : null;
        const position = playerProfile?.position?.trim() || null;
        const photoUrl = playerProfile?.photoUrl?.trim() || null;

        const playerPayload = {
          user_id: data.user.id,
          name: name.trim(),
          number: parsedNumber,
          position,
          team_id: teamId,
          photo_url: photoUrl,
          status: 'active',
        };

        const { error: playerError } = await supabase
          .from('players')
          .insert(playerPayload);

        if (playerError) {
          return {
            success: false,
            error: "Le compte est créé, mais la fiche joueur n'a pas pu être enregistrée. Vérifiez la colonne players.user_id côté base.",
          };
        }
      } catch (playerCreationError) {
        suppressNextAuthStateChange.current = false;
        return {
          success: false,
          error: playerCreationError.message || "Le compte est créé, mais la fiche joueur n'a pas pu être enregistrée.",
        };
      }
    }

    const needsEmailConfirmation = !data.session;

    // Important : on ne doit pas laisser l'utilisateur connecté juste après inscription.
    // Si Supabase a créé une session automatiquement, on la supprime ici.
    if (!needsEmailConfirmation) {
      try {
        await supabase.auth.signOut();
      } finally {
        setUser(null);
      }
    }

    suppressNextAuthStateChange.current = false;
    return {
      success: true,
      needsEmailConfirmation,
      message: needsEmailConfirmation
        ? 'Votre compte a été créé avec succès. Veuillez confirmer votre email, puis vous connecter.'
        : 'Votre compte a été créé avec succès. Vous pouvez maintenant vous connecter.',
    };
  }

  async function logout() {
    await supabase.auth.signOut();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
