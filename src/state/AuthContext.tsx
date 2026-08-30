// Auth layer for the whole app, sitting alongside AppState (domain/UI state).
// Wraps Supabase's three sign-in paths behind one hook so screens never touch
// `supabase.auth` directly:
//   - signUpWithEmail / signInWithEmail — plain email+password
//   - signInWithMagicLink              — passwordless email link
//   - signInWithGoogle                 — OAuth via a system browser tab
//
// Google OAuth and magic links both complete by deep-linking back into the
// app with tokens (or a PKCE `code`) in the callback URL. That URL is parsed
// with `expo-auth-session`'s QueryParams helper (handles both `?query` and
// `#fragment` forms) and turned into a session via `setSession` /
// `exchangeCodeForSession`. See docs.expo.dev/versions/v57.0.0/sdk/auth-session
// and .../sdk/webbrowser for the exact SDK 57 API this relies on:
//   - AuthSession.makeRedirectUri({ path }) -> string
//   - WebBrowser.openAuthSessionAsync(url, redirectUrl) ->
//       { type: 'success', url } | { type: 'cancel' | 'dismiss' | 'locked' | 'opened' }
//
// RN has no window-focus events, so autoRefreshToken (set in src/lib/supabase.ts)
// needs a manual nudge from RN's AppState — see the effect below — otherwise
// the refresh timer keeps running while the app is backgrounded.
import 'react-native-url-polyfill/auto';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState as RNAppState, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import * as QueryParams from 'expo-auth-session/build/QueryParams';
import type { Session, User } from '@supabase/supabase-js';

import { supabase } from '../lib/supabase';

// First-run-after-signup tracking for IntentionsScreen (App.tsx's auth gate
// reads this to pick Intentions vs Tabs as the initial route for a signed-in
// user). Deliberately a local AsyncStorage flag, not a `profiles` column —
// the backend contract's `profiles` table doesn't have one, and this is a
// pure "has this device seen onboarding" bit with no cross-device or
// cross-user meaning, so it doesn't need a round trip to Postgres. Documented
// tradeoff: reinstalling the app, or signing in on a second device, replays
// Intentions once more — acceptable for a screen that only sets which Home
// tiles show first (see IntentionsScreen's copy) and never blocks anything.
const ONBOARDING_KEY_PREFIX = 'ibtida.onboarded.';

export async function isOnboardingComplete(userId: string): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(ONBOARDING_KEY_PREFIX + userId)) === '1';
  } catch {
    return false;
  }
}

export async function markOnboardingComplete(userId: string): Promise<void> {
  try {
    await AsyncStorage.setItem(ONBOARDING_KEY_PREFIX + userId, '1');
  } catch {
    // Ignore — worst case Intentions reshows next launch, which is harmless.
  }
}

// Web-only no-op on native; closes the auth popup + posts the result back to
// the opener when this runs on web. Standard pairing with openAuthSessionAsync.
WebBrowser.maybeCompleteAuthSession();

export type AuthResult = {
  error: string | null;
  /** Non-error informational copy for the caller to show, e.g. "check your email". */
  message?: string | null;
};

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  /** True until the initial `getSession()` check resolves. */
  loading: boolean;
  signUpWithEmail: (email: string, password: string) => Promise<AuthResult>;
  signInWithEmail: (email: string, password: string) => Promise<AuthResult>;
  signInWithMagicLink: (email: string) => Promise<AuthResult>;
  signInWithGoogle: () => Promise<AuthResult>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

// One redirect URI for every flow (Google OAuth + magic link). Requires
// app.json's `expo.scheme` ("ibtida") so this resolves to `ibtida://auth/callback`
// in a standalone/dev-client build. NOTE: Expo Go cannot receive deep links
// back into a custom scheme it doesn't own — testing Google OAuth / magic
// links requires a custom dev client (`expo-dev-client`) or a standalone
// build, not Expo Go. Both this redirect URI and the corresponding Google
// Cloud OAuth client's redirect URI must also be added to the Supabase
// project's Auth > URL Configuration > Redirect URLs allow-list.
const redirectTo = AuthSession.makeRedirectUri({ path: 'auth/callback' });

// Parses whichever shape Supabase hands back (implicit tokens in the hash,
// or a PKCE `code` in the query) and turns it into a live session.
async function createSessionFromUrl(url: string) {
  const { params, errorCode } = QueryParams.getQueryParams(url);
  if (errorCode) throw new Error(errorCode);

  const { access_token, refresh_token, code } = params as {
    access_token?: string;
    refresh_token?: string;
    code?: string;
  };

  if (access_token && refresh_token) {
    const { data, error } = await supabase.auth.setSession({ access_token, refresh_token });
    if (error) throw error;
    return data.session;
  }

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
    return data.session;
  }

  return null;
}

function looksLikeAuthCallback(url: string) {
  return url.includes('access_token=') || url.includes('refresh_token=') || url.includes('code=') || url.includes('error=');
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const handlingUrl = useRef(false);

  const handleUrl = useCallback(async (url: string | null) => {
    if (!url || !looksLikeAuthCallback(url) || handlingUrl.current) return;
    handlingUrl.current = true;
    try {
      await createSessionFromUrl(url);
    } catch {
      // Swallowed here — this fires from a passive deep-link listener with no
      // screen to report to. The screen that initiated sign-in (Google button,
      // or the user re-opening the app after a magic-link email) is left on
      // its existing "loading"/"check your email" state and simply never
      // observes a session; onAuthStateChange below is the source of truth.
    } finally {
      handlingUrl.current = false;
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setLoading(false);
    });

    const { data: authSub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    // Cold start via a deep link (e.g. app was closed, user tapped the
    // magic-link email) plus any link arriving while already running.
    Linking.getInitialURL().then(handleUrl);
    const linkSub = Linking.addEventListener('url', ({ url }) => {
      handleUrl(url);
    });

    // Nudge Supabase's refresh-token timer with RN's app-foreground state —
    // there is no browser `window` to fire it automatically.
    const appStateSub = RNAppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') supabase.auth.startAutoRefresh();
      else supabase.auth.stopAutoRefresh();
    });

    return () => {
      mounted = false;
      authSub.subscription.unsubscribe();
      linkSub.remove();
      appStateSub.remove();
    };
  }, [handleUrl]);

  const signUpWithEmail = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { error: error.message };
    // If the Supabase project has "Confirm email" on, `session` comes back
    // null until the user clicks the confirmation link — nothing more to do
    // here (they're not signed in yet); onAuthStateChange fires once they do.
    if (!data.session) {
      return { error: null, message: 'Check your email to confirm your account, then sign in.' };
    }
    return { error: null };
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }, []);

  const signInWithMagicLink = useCallback(async (email: string): Promise<AuthResult> => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    });
    if (error) return { error: error.message };
    return { error: null, message: 'Check your email for a sign-in link.' };
  }, []);

  const signInWithGoogle = useCallback(async (): Promise<AuthResult> => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo, skipBrowserRedirect: true },
      });
      if (error) return { error: error.message };
      if (!data?.url) return { error: 'Supabase did not return an authorization URL.' };

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

      if (result.type === 'success') {
        await createSessionFromUrl(result.url);
        return { error: null };
      }
      if (result.type === 'cancel' || result.type === 'dismiss') {
        // User backed out of the browser sheet — not a real error to surface.
        return { error: null };
      }
      return { error: 'Google sign-in was not completed.' };
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'Google sign-in failed.' };
    }
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const value: AuthContextValue = {
    session,
    user: session?.user ?? null,
    loading,
    signUpWithEmail,
    signInWithEmail,
    signInWithMagicLink,
    signInWithGoogle,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
