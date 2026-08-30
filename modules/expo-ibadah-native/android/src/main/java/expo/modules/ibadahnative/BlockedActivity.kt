package expo.modules.ibadahnative

import android.app.Activity
import android.graphics.Color
import android.os.Bundle
import android.view.Gravity
import android.view.ViewGroup
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView

/**
 * The "finish your goal" screen [IbadahBlockingAccessibilityService] tries
 * to bring up on top of a blocked app, as an alternative/companion to the
 * bare `GLOBAL_ACTION_HOME` redirect (see that service's doc comment for why
 * both are attempted). Built entirely in code — no layout/theme XML — so
 * this module has zero resource-linking surface to get wrong and no
 * dependency on the host app having any particular theme or AndroidX
 * library available.
 *
 * Deliberately minimal: this is a stop-gap, not the product surface. Any
 * richer "blocked" UI (branding, streaks, an emergency-unlock affordance
 * that calls back into `stopBlocking()`) belongs in the JS app, launched
 * over this or instead of it — out of scope for this native module.
 */
class BlockedActivity : Activity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)

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
      text = "This app is blocked.\nFinish your goal in Ibadah to keep going."
      setTextColor(Color.WHITE)
      textSize = 18f
      gravity = Gravity.CENTER
    }

    val dismiss = Button(this).apply {
      text = "OK"
      setOnClickListener { finish() }
    }

    root.addView(message)
    root.addView(dismiss, LinearLayout.LayoutParams(
      ViewGroup.LayoutParams.WRAP_CONTENT,
      ViewGroup.LayoutParams.WRAP_CONTENT
    ).apply { topMargin = 48 })

    setContentView(root)
  }

  // Tapping "OK" (or the system back button) should just drop the user at
  // whatever GLOBAL_ACTION_HOME already sent them to, not resurrect the
  // blocked app underneath — this activity has no back stack of its own
  // (launchMode="singleTask" + taskAffinity="", see AndroidManifest.xml), so
  // `finish()` alone is sufficient.
}
