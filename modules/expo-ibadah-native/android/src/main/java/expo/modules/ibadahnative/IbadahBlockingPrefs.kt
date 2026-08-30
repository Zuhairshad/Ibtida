package expo.modules.ibadahnative

import android.content.Context
import android.content.SharedPreferences

/**
 * The single source of truth shared between [IbadahNativeModule] (the writer,
 * driven by JS calling `startBlocking`/`stopBlocking`) and
 * [IbadahBlockingAccessibilityService] (the reader, on every foreground-app
 * change). A plain `SharedPreferences` file is used deliberately instead of
 * e.g. a bound-service/AIDL channel: the accessibility service and the
 * module can run on different threads (and, in theory, be recreated
 * independently of each other by the OS), and `SharedPreferences` gives us a
 * cheap, crash-safe, cross-component store without needing either side to
 * track the other's lifecycle. Reads are called from
 * `onAccessibilityEvent`, which on Android fires only on discrete window
 * changes (not on every touch/frame), so re-reading the backing XML file
 * each time is not a hot path.
 */
internal object IbadahBlockingPrefs {
  private const val PREFS_NAME = "expo.modules.ibadahnative.blocking"
  private const val KEY_BLOCKED_PACKAGES = "blocked_packages"
  private const val KEY_ACTIVE = "active"

  private fun prefs(context: Context): SharedPreferences =
    context.applicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

  /** Persists the full replacement set of blocked package names and marks
   * blocking as active. Called from `startBlocking(appIds)`. */
  fun start(context: Context, packageNames: Set<String>) {
    prefs(context).edit()
      .putStringSet(KEY_BLOCKED_PACKAGES, packageNames)
      .putBoolean(KEY_ACTIVE, true)
      .apply()
  }

  /** Clears the blocked set AND flips the active flag off, so the
   * accessibility service's very next read (its next `onAccessibilityEvent`,
   * which on a locked device is effectively immediate) sees enforcement is
   * fully disabled — this is what makes `stopBlocking()` "reliably and
   * immediately" turn off redirects, per this module's contract. Two
   * independent signals (empty set + `active=false`) are stored on purpose:
   * either one alone is already sufficient for the service to no-op, so a
   * partial/torn write of this `apply()` still leaves blocking effectively
   * off. */
  fun stop(context: Context) {
    prefs(context).edit()
      .putStringSet(KEY_BLOCKED_PACKAGES, emptySet())
      .putBoolean(KEY_ACTIVE, false)
      .apply()
  }

  fun isActive(context: Context): Boolean =
    prefs(context).getBoolean(KEY_ACTIVE, false)

  /** `SharedPreferences.getStringSet` hands back its own live-backed set on
   * some implementations; defensively copy it so callers never accidentally
   * mutate internal state. */
  fun blockedPackages(context: Context): Set<String> =
    HashSet(prefs(context).getStringSet(KEY_BLOCKED_PACKAGES, emptySet()) ?: emptySet())
}
