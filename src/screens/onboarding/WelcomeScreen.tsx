import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Keyboard, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Rect } from 'react-native-svg';

import { useAuth } from '../../state/AuthContext';
import { colors } from '../../theme/tokens';
import { ScreenFade } from '../../components/ScreenFade';
import PrimaryButton from '../../components/PrimaryButton';
import SecondaryButton from '../../components/SecondaryButton';
import PressableScale from '../../components/PressableScale';
import SegmentedControl from '../../components/SegmentedControl';

type Mode = 'signin' | 'signup';
// Which async action is in flight — disables every button, not just the one
// pressed, so the user can't fire a second method mid-request.
type Busy = null | 'password' | 'magic' | 'google';

const inputCardStyle = {
  borderWidth: 1,
  borderColor: colors.cardBorder,
  borderRadius: 18,
  backgroundColor: '#FFFFFF',
  overflow: 'hidden' as const,
};

const fieldStyle = {
  padding: 16,
  borderBottomWidth: 1,
  borderColor: colors.cardBorder,
};

const fieldLabelStyle = {
  fontSize: 11,
  fontWeight: '600' as const,
  letterSpacing: 0.09,
  textTransform: 'uppercase' as const,
  color: colors.inkSecondary,
};

const fieldInputStyle = {
  fontSize: 16,
  fontWeight: '500' as const,
  color: colors.inkStrong,
  marginTop: 8,
  padding: 0,
  minHeight: 22,
};

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const [glow] = useState(() => new Animated.Value(0));
  const { signUpWithEmail, signInWithEmail, signInWithMagicLink, signInWithGoogle } = useAuth();

  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 3500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0, duration: 3500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [glow]);

  const glowOpacity = glow.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.7] });
  const glowScale = glow.interpolate({ inputRange: [0, 1], outputRange: [1, 1.05] });

  const emailValid = /\S+@\S+\.\S+/.test(email.trim());
  const canSubmitPassword = emailValid && password.length >= 6 && !busy;
  const canSendMagicLink = emailValid && !busy;

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

  return (
    <ScreenFade duration={450} style={{ backgroundColor: colors.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32, flexGrow: 1 }}
        >
          <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 8 }}>
            <Animated.View style={{ position: 'absolute', width: 150, height: 150, borderRadius: 75, backgroundColor: 'rgba(217,190,134,0.4)', opacity: glowOpacity, transform: [{ scale: glowScale }] }} />
            <Svg width={92} height={92} viewBox="0 0 152 152" fill="none">
              <Circle cx={76} cy={76} r={62} stroke="#3D73C9" />
              <Circle cx={76} cy={76} r={44} stroke="#5EAA78" />
              <Rect x={32} y={32} width={88} height={88} rx={10} stroke="rgba(22,50,62,0.55)" transform="rotate(45 76 76)" />
              <Circle cx={76} cy={76} r={6.5} fill="#3D73C9" />
            </Svg>
          </View>

          <Text style={{ fontSize: 27, fontWeight: '600', color: colors.inkStrong, letterSpacing: -0.025, lineHeight: 32, textAlign: 'center', marginTop: 12 }}>
            Small steps.{'\n'}Consistent worship.
          </Text>
          <Text style={{ fontSize: 15, lineHeight: 22, color: colors.inkMuted, marginTop: 10, marginBottom: 24, textAlign: 'center' }}>
            A quiet record of your prayer, dhikr and reading. Everything private by default.
          </Text>

          <SegmentedControl options={['Sign in', 'Create account']} selected={mode === 'signin' ? 0 : 1} onChange={onChangeMode} />

          <View style={[inputCardStyle, { marginTop: 16 }]}>
            <View style={fieldStyle}>
              <Text style={fieldLabelStyle}>Email</Text>
              <TextInput
                value={email}
                onChangeText={(v) => {
                  setEmail(v);
                  setError(null);
                }}
                placeholder="you@example.com"
                placeholderTextColor="#A8AEB4"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="emailAddress"
                accessibilityLabel="Email"
                style={fieldInputStyle}
              />
            </View>
            <View style={[fieldStyle, { borderBottomWidth: 0 }]}>
              <Text style={fieldLabelStyle}>Password</Text>
              <TextInput
                value={password}
                onChangeText={(v) => {
                  setPassword(v);
                  setError(null);
                }}
                placeholder={mode === 'signin' ? 'Your password' : 'At least 6 characters'}
                placeholderTextColor="#A8AEB4"
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

          {error ? <Text style={{ fontSize: 13, color: colors.dangerInk, marginTop: 12, lineHeight: 19 }}>{error}</Text> : null}
          {!error && info ? <Text style={{ fontSize: 13, color: colors.successText, marginTop: 12, lineHeight: 19 }}>{info}</Text> : null}

          <PrimaryButton
            label={mode === 'signin' ? 'Sign in' : 'Create account'}
            onPress={onSubmitPassword}
            disabled={!canSubmitPassword}
            loading={busy === 'password'}
            style={{ marginTop: 16 }}
          />

          <SecondaryButton
            label="Email me a sign-in link instead"
            onPress={onSendMagicLink}
            style={{ marginTop: 4, opacity: canSendMagicLink || busy === 'magic' ? 1 : 0.5 }}
          />

          <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 16, gap: 12 }}>
            <View style={{ flex: 1, height: 1, backgroundColor: colors.divider }} />
            <Text style={{ fontSize: 12.5, color: colors.inkFaint }}>or</Text>
            <View style={{ flex: 1, height: 1, backgroundColor: colors.divider }} />
          </View>

          <PressableScale
            onPress={onGoogle}
            disabled={!!busy}
            scaleTo={0.99}
            style={{
              minHeight: 52,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: colors.cardBorderStrong,
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
                <Text style={{ fontSize: 15, fontWeight: '600', color: colors.inkStrong }}>Continue with Google</Text>
              </>
            )}
          </PressableScale>

          <Text style={{ fontSize: 12, color: colors.inkFaint, textAlign: 'center', marginTop: 20, lineHeight: 18 }}>
            {mode === 'signin' ? "New here? Switch to “Create account” above." : 'By continuing you agree that your worship data stays private to you by default.'}
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenFade>
  );
}

// Simple lettermark stand-in for the Google "G" — avoids needing an image
// asset/brand SVG just for this button.
function GoogleGlyph({ size = 18 }: { size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 1.5, borderColor: '#4A7FC1', alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: size * 0.62, fontWeight: '700', color: '#4A7FC1', includeFontPadding: false, lineHeight: size }}>G</Text>
    </View>
  );
}
