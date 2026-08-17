package com.robertg761.rosewater.widgets

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/**
 * Handles a check-off tap from the vitamins widget. The write goes into the same
 * `vitamin_log` table the app uses, so the next time a screen regains focus it
 * reads the change back with no special casing.
 */
class VitaminToggleReceiver : BroadcastReceiver() {

  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action != Widgets.ACTION_TOGGLE_VITAMIN) return
    val vitaminId = intent.getLongExtra(Widgets.EXTRA_VITAMIN_ID, -1L)
    if (vitaminId < 0) return

    // Database work must not run on the main thread, and the receiver has to
    // stay alive until it finishes.
    val result = goAsync()
    val appContext = context.applicationContext
    Thread {
      try {
        WidgetRepository.toggleVitamin(appContext, vitaminId, Dates.today())
        Widgets.refreshAll(appContext)
      } finally {
        result.finish()
      }
    }.start()
  }
}
