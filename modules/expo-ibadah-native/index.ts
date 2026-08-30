// Public TypeScript surface for the Ibadah native bridge — imported directly
// by relative path (e.g. `../../modules/expo-ibadah-native`), the standard
// way to consume a *local* Expo Module (see
// https://docs.expo.dev/modules/get-started/ — local modules are not npm
// packages, so there is no package name to require them by).
//
// THIS FILE IS THE STABLE CONTRACT four downstream agents build against next
// phase (two platform-native agents filling in android/ + ios/, an
// alarm-native agent, and a UI-wiring agent). Every function here already
// typechecks and is safely callable today, before any native body is real:
//   - the two capability checks return an honest `false` until a platform
//     agent lands its implementation (see the Kotlin/Swift stubs' doc
//     comments for exactly which mechanism each will use);
//   - every mutating call throws a clear, catchable "not implemented yet"
//     error instead of silently pretending to succeed;
//   - on a runtime with no native module at all (web, or Expo Go before this
//     module's dev client is built) every call degrades the same way rather
//     than crashing on import — see `requireNative` below.
import { Platform } from 'react-native';
import { NativeModule, requireNativeModule } from 'expo';

// ---------------------------------------------------------------------------
// Raw native binding. Declares the exact shape IbadahNativeModule.kt / .swift
// implement (`Name("IbadahNative")`, `Events("onBlockingEvent",
// "onWakeAlarmEvent")`, the `Function`/`AsyncFunction` names below) — keep
// this declaration and the two native `definition()` blocks in lockstep.
// ---------------------------------------------------------------------------

type NativeBlockedAppRef = { id: string; label: string | null };

type NativeBlockingEvent = { type: 'blocked-app-opened' | 'stopped' };
type NativeWakeAlarmEvent = { type: 'fired' | 'dismissed'; id: string };

declare class NativeIbadahModule extends NativeModule<{
  onBlockingEvent(event: NativeBlockingEvent): void;
  onWakeAlarmEvent(event: NativeWakeAlarmEvent): void;
}> {
  isAppBlockingSupported(): boolean;
  isAlarmSupported(): boolean;
  pickAppsToBlock(): Promise<NativeBlockedAppRef[]>;
  startBlocking(appIds: string[]): Promise<void>;
  stopBlocking(): Promise<void>;
  scheduleWakeAlarm(id: string, whenEpochMs: number, opts?: { soundName?: string } | null): Promise<void>;
  cancelWakeAlarm(id: string): Promise<void>;
  // Android-only additions beyond this file's original frozen contract (see
  // IbadahNativeModule.kt's class doc comment) — no iOS/Swift implementation
  // exists for either, so every JS wrapper below gates on `Platform.OS`
  // before ever touching these instead of letting an unimplemented-native-
  // function error surface on iOS.
  stopWakeAlarmRinging(id: string): Promise<void>;
  openExactAlarmSettings(): Promise<void>;
}

// `requireNativeModule` throws synchronously (at import time) when the
// native module isn't present in this binary — true on web, and true in
// plain Expo Go once this project needs custom native code at all (see the
// `expo-dev-client` dependency added alongside this module). Swallow that
// here rather than letting every importer's bundle crash; every exported
// function below checks `native` and fails softly/loudly on its own terms
// instead.
let native: NativeIbadahModule | null = null;
try {
  native = requireNativeModule<NativeIbadahModule>('IbadahNative');
} catch {
  native = null;
}

function notImplemented(fnName: string): never {
  throw new Error(
    `expo-ibadah-native: ${fnName}() is not implemented on this platform yet. ` +
      'Build a dev client (`npx expo prebuild` + a native rebuild) once the ' +
      'native side lands — see modules/expo-ibadah-native/{android,ios}.'
  );
}

// ---------------------------------------------------------------------------
// App blocking ("Ibadah Lock")
// ---------------------------------------------------------------------------

/** `id`: Android package name (e.g. `"com.instagram.android"`), or iOS's
 * opaque base64 `ApplicationToken` string — Apple's Family Controls picker
 * never exposes a real bundle id to third-party code. `label` is nullable
 * for the same reason: iOS may have no human-readable name to hand back
 * alongside the token. Mirrors `BlockedApp` in `src/services/ibadahLock.ts`
 * minus the Supabase-only fields (`platform`, persisted `id`). */
export type BlockedAppRef = { id: string; label: string | null };

/** Whether this platform/build can block apps at all right now. `false` on
 * web, in Expo Go, and on both real platforms until their native
 * implementation lands (see IbadahNativeModule.kt/.swift doc comments). */
export function isAppBlockingSupported(): boolean {
  return native?.isAppBlockingSupported() ?? false;
}

/** Android: shows an installed-app picker (the launchable, non-system app
 * list) for the user to check off. iOS: opens Apple's `FamilyActivityPicker`
 * — the user picks apps in Apple's own system UI, and only opaque tokens
 * come back (see `BlockedAppRef`). Throws if `isAppBlockingSupported()` is
 * `false`. */
export async function pickAppsToBlock(): Promise<BlockedAppRef[]> {
  if (!native) notImplemented('pickAppsToBlock');
  return native.pickAppsToBlock();
}

/** Starts enforcing the block list for `appIds` (as returned by
 * `pickAppsToBlock`, or persisted `blocked_apps.app_identifier` values read
 * back from `src/services/ibadahLock.ts`). Stays active until `stopBlocking`
 * — enforcement mechanism is native-side and outside this file's scope
 * (`AccessibilityService` + a foreground service on Android;
 * `ManagedSettingsStore` + `DeviceActivityMonitor` on iOS). */
export async function startBlocking(appIds: string[]): Promise<void> {
  if (!native) notImplemented('startBlocking');
  return native.startBlocking(appIds);
}

/** Stops enforcing the current block list (e.g. on a locked focus session
 * ending, or an emergency override — see `logEmergencyOverride` in
 * `src/services/ibadahLock.ts`). Safe to call when nothing is blocking. */
export async function stopBlocking(): Promise<void> {
  if (!native) notImplemented('stopBlocking');
  return native.stopBlocking();
}

/** Fires whenever the native side observes a blocked-app open attempt
 * (`'blocked-app-opened'` — e.g. to show an in-app "still locked" toast) or
 * blocking is stopped from the native side itself (`'stopped'` — e.g. the
 * user revoked Screen Time authorization out from under the app). Returns a
 * no-op subscription (never fires) when this platform has no native module —
 * callers don't need to branch on `isAppBlockingSupported()` first just to
 * attach a listener. */
export function addBlockingEventListener(cb: (event: { type: 'blocked-app-opened' | 'stopped' }) => void): { remove(): void } {
  if (!native) return { remove() {} };
  return native.addListener('onBlockingEvent', cb);
}

// ---------------------------------------------------------------------------
// Wake-verified alarm
// ---------------------------------------------------------------------------

/** Whether this platform/build can schedule a real wake alarm right now.
 * `false` on web, in Expo Go, and on both real platforms until their native
 * implementation lands. iOS is expected to only ever offer a time-sensitive
 * local-notification fallback (there is no third-party-schedulable OS alarm
 * on iOS), not a true alarm-clock guarantee — see IbadahNativeModule.swift's
 * doc comment. */
export function isWakeAlarmSupported(): boolean {
  return native?.isAlarmSupported() ?? false;
}

/** Schedules (or re-schedules, if `id` is already pending — same semantics
 * as `AlarmManager`'s id-keyed alarms) a wake alarm for `whenEpochMs`.
 * `id` is caller-chosen and stable per prayer (e.g. `"wake-alarm:Fajr"`,
 * pairing with `prayer_alarm_settings` rows from
 * `src/services/wakeAlarm.ts`) — reuse it across days rather than minting a
 * fresh id per occurrence, so each new schedule call implicitly replaces
 * yesterday's. `opts.soundName` is a platform-provided alarm sound
 * identifier; omit it for the platform default. Throws if
 * `isWakeAlarmSupported()` is `false`. */
export async function scheduleWakeAlarm(id: string, whenEpochMs: number, opts?: { soundName?: string }): Promise<void> {
  if (!native) notImplemented('scheduleWakeAlarm');
  return native.scheduleWakeAlarm(id, whenEpochMs, opts ?? null);
}

/** Cancels a pending wake alarm by `id`. Safe to call when nothing is
 * scheduled under that id. */
export async function cancelWakeAlarm(id: string): Promise<void> {
  if (!native) notImplemented('cancelWakeAlarm');
  return native.cancelWakeAlarm(id);
}

/** Fires `'fired'` when the alarm actually goes off natively, and
 * `'dismissed'` once it's been cleared (e.g. after a successful
 * `WakeScanScreen` QR verification calls back into the native side to stop
 * ringing — see `stopWakeAlarmRinging` below). Returns a no-op subscription
 * when this platform has no native module. */
export function addWakeAlarmEventListener(cb: (event: { type: 'fired' | 'dismissed'; id: string }) => void): { remove(): void } {
  if (!native) return { remove() {} };
  return native.addListener('onWakeAlarmEvent', cb);
}

/** Stops a currently-ringing native wake alarm for `id` (same id passed to
 * `scheduleWakeAlarm`) — the only thing that ever silences it. Safe to call
 * when nothing is ringing under that id, so callers don't need to track
 * ringing state themselves; call it unconditionally right after a successful
 * `WakeScanScreen` verification. Android-only today — iOS has no native
 * ringing service to stop (its wake alarm is a one-shot notification, not a
 * loop; see `scheduleWakeAlarm`'s doc comment), so this resolves immediately
 * as a no-op on every other platform rather than throwing. */
export async function stopWakeAlarmRinging(id: string): Promise<void> {
  if (!native || Platform.OS !== 'android') return;
  return native.stopWakeAlarmRinging(id);
}

/** Opens Android 12+'s "Alarms & reminders" system settings screen so the
 * user can grant `SCHEDULE_EXACT_ALARM` — needed before `scheduleWakeAlarm`
 * will succeed on Android (it throws `ERR_IBADAH_NATIVE_EXACT_ALARM_PERMISSION`
 * until granted). No-op on every other platform, where this permission
 * concept doesn't exist. */
export async function openExactAlarmSettings(): Promise<void> {
  if (!native || Platform.OS !== 'android') return;
  return native.openExactAlarmSettings();
}
