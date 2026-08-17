package com.robertg761.rosewater.widgets

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.RemoteViews

/**
 * Recolours a drawable through ImageView.setColorFilter, the one tinting call
 * RemoteViews can make on every supported API level. All widget artwork is
 * authored in white so SRC_ATOP lands on the palette colour exactly.
 */
internal fun RemoteViews.tint(viewId: Int, color: Int) {
  setInt(viewId, "setColorFilter", color)
}

internal fun RemoteViews.applyCard(palette: Palette) {
  tint(R.id.rw_bg_fill, palette.card)
  tint(R.id.rw_bg_stroke, palette.border)
}

/** Streak badge shared by the vitamins and at-a-glance widgets. */
internal fun RemoteViews.applyStreak(palette: Palette, streak: Int) {
  if (streak > 0) {
    setViewVisibility(R.id.rw_streak, android.view.View.VISIBLE)
    setTextViewText(R.id.rw_streak_text, streak.toString())
    setTextColor(R.id.rw_streak_text, palette.star)
    tint(R.id.rw_streak_icon, palette.star)
  } else {
    setViewVisibility(R.id.rw_streak, android.view.View.GONE)
  }
}

object Widgets {

  const val ACTION_TOGGLE_VITAMIN = "com.robertg761.rosewater.widgets.TOGGLE_VITAMIN"
  const val EXTRA_VITAMIN_ID = "vitaminId"

  private const val SCHEME = "rosewater"

  private val PROVIDERS = listOf(
    WashWidget::class.java,
    VitaminsWidget::class.java,
    QuickLogWidget::class.java,
    GlanceWidget::class.java
  )

  /**
   * Nudges every placed widget to redraw. Deliberately a targeted broadcast
   * rather than an inline render: this is called from the JS thread, so it has
   * to stay off the database.
   */
  fun refreshAll(context: Context) {
    val manager = AppWidgetManager.getInstance(context) ?: return
    for (provider in PROVIDERS) {
      val ids = try {
        manager.getAppWidgetIds(ComponentName(context, provider))
      } catch (e: Exception) {
        continue
      }
      if (ids.isEmpty()) continue
      context.sendBroadcast(
        Intent(context, provider).apply {
          action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
          putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids)
        }
      )
    }
  }

  /**
   * Opens the app at [path], handled by the linking config in App.tsx. The
   * package is pinned so the URI can only ever resolve to us.
   */
  fun openApp(context: Context, path: String, requestCode: Int): PendingIntent {
    val intent = Intent(Intent.ACTION_VIEW, Uri.parse("$SCHEME://$path")).apply {
      `package` = context.packageName
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
    }
    return PendingIntent.getActivity(
      context,
      requestCode,
      intent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )
  }

  /**
   * Distinct data URIs per vitamin keep these PendingIntents from collapsing
   * into one another — PendingIntent equality ignores extras.
   */
  fun toggleVitamin(context: Context, vitaminId: Long): PendingIntent {
    val intent = Intent(context, VitaminToggleReceiver::class.java).apply {
      action = ACTION_TOGGLE_VITAMIN
      data = Uri.parse("$SCHEME://vitamin/$vitaminId")
      putExtra(EXTRA_VITAMIN_ID, vitaminId)
    }
    return PendingIntent.getBroadcast(
      context,
      0,
      intent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )
  }
}

/**
 * Shared plumbing: load once per update pass, and treat a date rollover like an
 * update so "days since" and "today's vitamins" stay honest overnight without
 * the app being opened.
 */
abstract class RosewaterWidget : AppWidgetProvider() {

  protected abstract fun render(
    context: Context,
    manager: AppWidgetManager,
    appWidgetId: Int,
    data: WidgetData
  ): RemoteViews

  override fun onUpdate(
    context: Context,
    appWidgetManager: AppWidgetManager,
    appWidgetIds: IntArray
  ) {
    val data = WidgetRepository.load(context)
    for (id in appWidgetIds) {
      appWidgetManager.updateAppWidget(id, render(context, appWidgetManager, id, data))
    }
  }

  /** Re-render on resize so height-dependent layouts can adapt. */
  override fun onAppWidgetOptionsChanged(
    context: Context,
    appWidgetManager: AppWidgetManager,
    appWidgetId: Int,
    newOptions: android.os.Bundle?
  ) {
    val data = WidgetRepository.load(context)
    appWidgetManager.updateAppWidget(
      appWidgetId,
      render(context, appWidgetManager, appWidgetId, data)
    )
  }

  override fun onReceive(context: Context, intent: Intent) {
    super.onReceive(context, intent)
    when (intent.action) {
      Intent.ACTION_DATE_CHANGED,
      Intent.ACTION_TIME_CHANGED,
      Intent.ACTION_TIMEZONE_CHANGED -> {
        val manager = AppWidgetManager.getInstance(context) ?: return
        val ids = manager.getAppWidgetIds(ComponentName(context, javaClass))
        if (ids.isNotEmpty()) onUpdate(context, manager, ids)
      }
    }
  }
}
