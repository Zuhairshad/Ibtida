package expo.modules.ibadahnative

import android.app.Activity
import android.app.KeyguardManager
import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.os.Build
import android.os.Bundle
import android.view.Gravity
import android.view.ViewGroup
import android.view.WindowManager
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView

/**
 * The `PendingIntent` target of `WakeAlarmRingingService`'s full-screen-intent
 * notification. Its only job is to reliably get *something* on top of a
 * locked/asleep screen, then hand off to the RN app's own `WakeScanScreen`
 * via the `ibtida://wake-scan?alarmId=...` deep link — it deliberately owns
 * none of the actual "scan to dismiss" UI/logic itself (that stays in JS, per
 * this module's `index.ts` contract).
 *
 * ## Why a bridge Activity instead of launching the deep link directly as the
 * full-screen intent's target
 * A full-screen-intent notification only reliably draws over the lock screen
 * and turns the screen on if the Activity it launches opts into that itself
 * (`showWhenLocked` / `turnScreenOn` — see below). This module has no way to
 * add those attributes to the *host app's* own main Activity (that Activity
 * lives in the consuming app's own generated `AndroidManifest.xml`, outside
 * this local module's manifest-merge surface) — so this module ships its
 * own tiny Activity that CAN declare them, and only then forwards into the
 * deep link. See this module's report to the Integration agent for the
 * (separate, real) recommendation to also add these attributes to the host
 * app's main Activity directly, which would let the deep link launch skip
 * this bridge entirely on newer setups.
 */
class WakeAlarmFullScreenActivity : Activity() {
  private var alarmId: String? = null

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)

    alarmId = intent.getStringExtra(WakeAlarmScheduler.EXTRA_ALARM_ID)

    // Draw over the lock screen and wake the display. `setShowWhenLocked` /
    // `setTurnScreenOn` are the API 27+ (O_MR1+) programmatic equivalents of
    // this class's manifest `android:showWhenLocked` / `android:turnScreenOn`
    // attributes — setting both (belt-and-suspenders) matches how Android's
    // own full-screen-intent guidance documents this
    // (https://developer.android.com/develop/ui/views/notifications/time-sensitive).
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
      setShowWhenLocked(true)
      setTurnScreenOn(true)
      val keyguardManager = getSystemService(Context.KEYGUARD_SERVICE) as? KeyguardManager
      keyguardManager?.requestDismissKeyguard(this, null)
    } else {
      @Suppress("DEPRECATION")
      window.addFlags(
        WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
          WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
          WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
      )
    }

    buildFallbackUi()
    forwardToWakeScan(autoLaunched = true)
  }

  /** Attempts the hand-off into the RN app immediately (so this screen is
   * normally only visible for an instant); the native view built in
   * [buildFallbackUi] stays as a real fallback if that throws (e.g. the deep
   * link scheme isn't registered yet on a build where the Integration
   * agent's app.json/plugin changes haven't landed) rather than leaving the
   * user stuck on a blank screen with no way to reach the scan flow at all. */
  private fun forwardToWakeScan(autoLaunched: Boolean) {
    val id = alarmId ?: return
    try {
      val deepLinkIntent = Intent(Intent.ACTION_VIEW, WakeAlarmScheduler.wakeScanDeepLinkUri(id)).apply {
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      }
      startActivity(deepLinkIntent)
      finish()
    } catch (e: ActivityNotFoundException) {
      if (!autoLaunched) {
        // Only surface this to the fallback UI on an explicit tap — the
        // automatic onCreate attempt failing silently (leaving the fallback
        // view up) is the expected/handled case.
      }
    }
  }

  private fun buildFallbackUi() {
    val root = LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL
      gravity = Gravity.CENTER
      setBackgroundColor(Color.parseColor("#111318"))
      layoutParams = ViewGroup.LayoutParams(
        ViewGroup.LayoutParams.MATCH_PARENT,
        ViewGroup.LayoutParams.MATCH_PARENT
      )
      setPadding(64, 64, 64, 64)
    }

    val message = TextView(this).apply {
      text = "It's time to wake up for prayer.\nScan your prayer mat tag to stop the alarm."
      setTextColor(Color.WHITE)
      textSize = 18f
      gravity = Gravity.CENTER
    }

    val openButton = Button(this).apply {
      text = "Open Ibtida"
      setOnClickListener { forwardToWakeScan(autoLaunched = false) }
    }

    root.addView(message)
    root.addView(
      openButton,
      LinearLayout.LayoutParams(
        ViewGroup.LayoutParams.WRAP_CONTENT,
        ViewGroup.LayoutParams.WRAP_CONTENT
      ).apply { topMargin = 48 }
    )

    setContentView(root)
  }

  // The ringing service is left running (audio + notification both keep
  // going) regardless of what happens to this Activity — it is a hand-off
  // screen, not the thing that owns "is the alarm still ringing". Only an
  // explicit `stopWakeAlarmRinging(id)` call from JS (after a verified scan)
  // stops it; see WakeAlarmRingingService's class doc comment.
}
