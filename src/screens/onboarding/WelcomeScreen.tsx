import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../../state/AuthContext';
import { arabicFont, colors } from '../../theme/tokens';
import { ScreenFade } from '../../components/ScreenFade';
import PrimaryButton from '../../components/PrimaryButton';
import SecondaryButton from '../../components/SecondaryButton';
import PressableScale from '../../components/PressableScale';
import SegmentedControl from '../../components/SegmentedControl';

// ─── Local palette ────────────────────────────────────────────────────────────
const IVORY = '#FAF8F3';
const GOLD = '#C9A96E';
const ARABIC_BROWN = '#5A4520';
const CARD_BORDER = 'rgba(180,150,80,0.12)';

// ─── Shared field styles ──────────────────────────────────────────────────────
const inputCardStyle = {
  borderWidth: 1,
  borderColor: CARD_BORDER,
  borderRadius: 26,
  backgroundColor: '#FFFFFF',
  overflow: 'hidden' as const,
};

const fieldStyle = {
  paddingHorizontal: 18,
  paddingVertical: 14,
  borderBottomWidth: 1,
  borderColor: CARD_BORDER,
};

const fieldLabelStyle = {
  fontSize: 11,
  fontWeight: '600' as const,
  letterSpacing: 0.08,
  textTransform: 'uppercase' as const,
  color: colors.inkSecondary,
};

const fieldInputStyle = {
  fontSize: 16,
  fontWeight: '500' as const,
  color: colors.inkStrong,
  marginTop: 6,
  padding: 0,
  minHeight: 22,
};

// ─── Types ────────────────────────────────────────────────────────────────────
type Mode = 'signin' | 'signup';
type Busy = null | 'password' | 'magic' | 'google';

// ─── Component ────────────────────────────────────────────────────────────────
export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const { signUpWithEmail, signInWithEmail, signInWithMagicLink, signInWithGoogle } = useAuth();

  // Animated values
  const [bismillahOpacity] = useState(() => new Animated.Value(0));
  const [bismillahTranslateY] = useState(() => new Animated.Value(6));

  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // Fade-in bismillah on mount
  useEffect(() => {
    Animated.parallel([
      Animated.timing(bismillahOpacity, {
        toValue: 1,
        duration: 1200,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(bismillahTranslateY, {
        toValue: 0,
        duration: 900,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [bismillahOpacity, bismillahTranslateY]);

  // ── Validation ──────────────────────────────────────────────────────────────
  const emailValid = /\S+@\S+\.\S+/.test(email.trim());
  const canSubmitPassword = emailValid && password.length >= 6 && !busy;
  const canSendMagicLink = emailValid && !busy;

  // ── Handlers ────────────────────────────────────────────────────────────────
  const onChangeMode = (i: number) => {
    setMode(i === 0 ? 'signin' : 'signup');
    setError(null);
    setInfo(null);
  };

  const onSubmitPassword = async () => {
    if (!canSubmitPassword) return;
    Keyboard.dismiss();
    setError(null);
    setInfo(null);
    setBusy('password');
    const fn = mode === 'signin' ? signInWithEmail : signUpWithEmail;
    const result = await fn(email.trim(), password);
    setBusy(null);
    if (result.error) setError(result.error);
    else if (result.message) setInfo(result.message);
  };

  const onSendMagicLink = async () => {
    if (!canSendMagicLink) return;
    Keyboard.dismiss();
    setError(null);
    setInfo(null);
    setBusy('magic');
    const result = await signInWithMagicLink(email.trim());
    setBusy(null);
    if (result.error) setError(result.error);
    else if (result.message) setInfo(result.message);
  };

  const onGoogle = async () => {
    setError(null);
    setInfo(null);
    setBusy('google');
    const result = await signInWithGoogle();
    setBusy(null);
    if (result.error) setError(result.error);
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <ScreenFade duration={450} style={{ backgroundColor: IVORY }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingTop: insets.top + 24,
            paddingBottom: insets.bottom + 40,
            flexGrow: 1,
          }}
        >
          {/* ── Hero area ─────────────────────────────────────────────────── */}
          <View style={{ alignItems: 'center', marginBottom: 28 }}>
            {/* Bismillah calligraphy */}
            <Animated.Text
              style={{
                fontFamily: arabicFont,
                fontSize: 28,
                color: ARABIC_BROWN,
                textAlign: 'center',
                opacity: bismillahOpacity,
                transform: [{ translateY: bismillahTranslateY }],
                marginBottom: 20,
                lineHeight: 42,
              }}
            >
              {'بِسْمِ اللهِ الرَّحْمٰنِ الرَّحِيمِ'}
            </Animated.Text>

            {/* App name */}
            <Text
              style={{
                fontSize: 38,
                fontWeight: '700',
                color: colors.inkStrong,
                letterSpacing: -0.04 * 38,
                lineHeight: 44,
              }}
            >
              Ibtida
            </Text>

            {/* Tagline */}
            <Text
              style={{
                fontSize: 15,
                color: colors.inkSecondary,
                marginTop: 6,
                lineHeight: 22,
              }}
            >
              Begin. Return. Continue.
            </Text>

            {/* Gold decorative divider */}
            <Text
              style={{
                fontSize: 14,
                color: GOLD,
                marginTop: 16,
                letterSpacing: 4,
              }}
            >
              {'· • · • ·'}
            </Text>
          </View>

          {/* ── Auth form ─────────────────────────────────────────────────── */}
          <SegmentedControl
            options={['Sign in', 'Create account']}
            selected={mode === 'signin' ? 0 : 1}
            onChange={onChangeMode}
          />

          <View style={[inputCardStyle, { marginTop: 14 }]}>
            {/* Email field */}
            <View style={fieldStyle}>
              <Text style={fieldLabelStyle}>Email</Text>
              <TextInput
                value={email}
                onChangeText={(v) => {
                  setEmail(v);
                  setError(null);
                }}
                placeholder="you@example.com"
                placeholderTextColor="#B8AFA4"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="emailAddress"
                accessibilityLabel="Email"
                style={fieldInputStyle}
              />
            </View>

            {/* Password field — no bottom border on the last field */}
            <View style={[fieldStyle, { borderBottomWidth: 0 }]}>
              <Text style={fieldLabelStyle}>Password</Text>
              <TextInput
                value={password}
                onChangeText={(v) => {
                  setPassword(v);
                  setError(null);
                }}
                placeholder={mode === 'signin' ? 'Your password' : 'At least 6 characters'}
                placeholderTextColor="#B8AFA4"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                textContentType={mode === 'signin' ? 'password' : 'newPassword'}
                accessibilityLabel="Password"
                style={fieldInputStyle}
                onSubmitEditing={onSubmitPassword}
                returnKeyType="go"
              />
            </View>
          </View>

          {/* Inline messages */}
          {error ? (
            <Text style={{ fontSize: 13, color: colors.dangerInk, marginTop: 12, lineHeight: 19 }}>
              {error}
            </Text>
          ) : null}
          {!error && info ? (
            <Text style={{ fontSize: 13, color: colors.successText, marginTop: 12, lineHeight: 19 }}>
              {info}
            </Text>
          ) : null}

          {/* Primary action */}
          <PrimaryButton
            label={mode === 'signin' ? 'Sign in' : 'Create account'}
            onPress={onSubmitPassword}
            disabled={!canSubmitPassword}
            loading={busy === 'password'}
            style={{ marginTop: 16 }}
          />

          {/* Magic link — ghost/secondary button */}
          <SecondaryButton
            label="Email me a link"
            onPress={onSendMagicLink}
            style={{ marginTop: 6, opacity: canSendMagicLink || busy === 'magic' ? 1 : 0.5 }}
          />

          {/* "or" divider */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginVertical: 16,
              gap: 12,
            }}
          >
            <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(180,150,80,0.2)' }} />
            <Text style={{ fontSize: 12.5, color: colors.inkSecondary }}>or</Text>
            <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(180,150,80,0.2)' }} />
          </View>

          {/* Google button */}
          <PressableScale
            onPress={onGoogle}
            disabled={!!busy}
            scaleTo={0.99}
            style={{
              minHeight: 52,
              borderRadius: 26,
              borderWidth: 1,
              borderColor: CARD_BORDER,
              backgroundColor: '#FFFFFF',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              opacity: busy && busy !== 'google' ? 0.5 : 1,
            }}
          >
            {busy === 'google' ? (
              <ActivityIndicator color={colors.inkStrong} />
            ) : (
              <>
                <GoogleGlyph />
                <Text style={{ fontSize: 15, fontWeight: '600', color: colors.inkStrong }}>
                  Continue with Google
                </Text>
              </>
            )}
          </PressableScale>

          {/* Footer note */}
          <Text
            style={{
              fontSize: 12,
              color: colors.inkSecondary,
              textAlign: 'center',
              marginTop: 22,
              lineHeight: 18,
              opacity: 0.7,
            }}
          >
            {mode === 'signin'
              ? 'New here? Switch to "Create account" above.'
              : 'Your worship data stays private to you by default.'}
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenFade>
  );
}

// ─── Google "G" glyph ────────────────────────────────────────────────────────
function GoogleGlyph({ size = 18 }: { size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 1.5,
        borderColor: '#4A7FC1',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text
        style={{
          fontSize: size * 0.62,
          fontWeight: '700',
          color: '#4A7FC1',
          includeFontPadding: false,
          lineHeight: size,
        }}
      >
        G
      </Text>
    </View>
  );
}
