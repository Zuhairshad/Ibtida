package expo.modules.ibadahnative

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import androidx.core.content.edit

/**
 * Fires on every phone unlock (`ACTION_USER_PRESENT`) and posts a short dhikr
 * or motivational reminder drawn from [DhikrUnlockContent.ENTRIES].
 *
 * Design decisions:
 * - Rotating index stored in SharedPreferences so the user never sees the same
 *   entry twice in a row and the sequence survives process restarts.
 * - 2-minute rate limit: if the user unlocks multiple times in quick succession
 *   (e.g., checking the time) we skip rather than spam.
 * - `ACTION_USER_PRESENT` fires ONLY after the user dismisses the lock screen
 *   (PIN, pattern, biometric) — unlike `ACTION_SCREEN_ON`, which fires whenever
 *   the display turns on. This is intentional: the message surfaces at exactly
 *   the moment the user picks up the phone to use it, not on every ambient wake.
 *
 * ## iOS note
 * This feature is Android-only. iOS provides no equivalent background hook that
 * fires on unlock — the closest approximation would be a silent push notification
 * that the OS can still suppress, which is not the same contract.
 *
 * ## Rebuild required
 * Changes here only take effect after `expo run:android` or an EAS build — the
 * JS live-reload layer cannot ship new native receivers.
 */
class ScreenUnlockReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Intent.ACTION_USER_PRESENT) return

        val prefs = context.applicationContext
            .getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

        // Rate limit — skip if we showed one less than MIN_INTERVAL_MS ago.
        val lastShown = prefs.getLong(KEY_LAST_SHOWN, 0L)
        val now = System.currentTimeMillis()
        if (now - lastShown < MIN_INTERVAL_MS) return

        // Advance the rotating index.
        val entries = DhikrUnlockContent.ENTRIES
        val idx = prefs.getInt(KEY_INDEX, 0) % entries.size
        val entry = entries[idx]
        prefs.edit {
            putInt(KEY_INDEX, (idx + 1) % entries.size)
            putLong(KEY_LAST_SHOWN, now)
        }

        ensureChannel(context)

        // Tapping the notification opens the app at its default route.
        val launchIntent = context.packageManager
            .getLaunchIntentForPackage(context.packageName)
            ?.apply { flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP }

        val tapIntent = PendingIntent.getActivity(
            context,
            NOTIF_REQUEST_CODE,
            launchIntent ?: Intent(),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle(entry.title)
            .setContentText(entry.body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(entry.body))
            .setContentIntent(tapIntent)
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setCategory(NotificationCompat.CATEGORY_REMINDER)
            .build()

        val nm = ContextCompat.getSystemService(context, NotificationManager::class.java)
        nm?.notify(NOTIF_ID, notification)
    }

    private fun ensureChannel(context: Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val nm = context.getSystemService(NotificationManager::class.java) ?: return
        if (nm.getNotificationChannel(CHANNEL_ID) != null) return
        val channel = NotificationChannel(
            CHANNEL_ID,
            "Dhikr Reminders",
            NotificationManager.IMPORTANCE_DEFAULT
        ).apply {
            description = "A short dhikr reminder every time you unlock your phone."
            enableLights(false)
            enableVibration(false)
            setShowBadge(false)
        }
        nm.createNotificationChannel(channel)
    }

    companion object {
        private const val PREFS_NAME   = "expo_ibadah_native.dhikr_unlock"
        private const val KEY_INDEX    = "index"
        private const val KEY_LAST_SHOWN = "last_shown_ms"
        private const val CHANNEL_ID   = "dhikr_unlock"
        private const val NOTIF_ID     = 9_001
        private const val NOTIF_REQUEST_CODE = 9_001
        // Minimum gap between two shown notifications (2 minutes).
        private const val MIN_INTERVAL_MS = 2L * 60L * 1_000L
    }
}
