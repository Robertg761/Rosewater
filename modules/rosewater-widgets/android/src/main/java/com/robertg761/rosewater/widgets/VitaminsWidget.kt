package com.robertg761.rosewater.widgets

import android.appwidget.AppWidgetManager
import android.content.Context
import android.view.View
import android.widget.RemoteViews

/** Today's vitamins, each row tappable to check off without opening the app. */
class VitaminsWidget : RosewaterWidget() {

  private companion object {
    /** Header, padding and the rows' top margin, in dp. */
    const val CHROME_DP = 44

    /** One row: a 19dp circle plus 4dp padding top and bottom. */
    const val ROW_DP = 27

    const val FALLBACK_ROWS = 3
    const val MAX_ROWS = 8
  }

  override fun render(
    context: Context,
    manager: AppWidgetManager,
    appWidgetId: Int,
    data: WidgetData
  ): RemoteViews {
    val p = data.palette
    val views = RemoteViews(context.packageName, R.layout.rw_widget_vitamins)

    views.applyCard(p)
    views.setTextColor(R.id.rw_title, p.textMuted)
    views.setTextColor(R.id.rw_more, p.textFaint)
    views.setTextColor(R.id.rw_empty, p.textMuted)
    views.applyStreak(p, data.vitaminStreak)

    views.setTextViewText(
      R.id.rw_title,
      if (data.vitaminsTotal == 0) "TODAY'S VITAMINS"
      else "${data.vitaminsDone}/${data.vitaminsTotal} TODAY"
    )

    // Rebuilt from scratch each update — the list is short and addView is the
    // only way to get a variable number of individually tappable rows without a
    // RemoteViewsService.
    views.removeAllViews(R.id.rw_rows)

    if (data.vitamins.isEmpty()) {
      views.setViewVisibility(R.id.rw_empty, View.VISIBLE)
      views.setViewVisibility(R.id.rw_more, View.GONE)
    } else {
      views.setViewVisibility(R.id.rw_empty, View.GONE)

      val visible = data.vitamins.take(rowsThatFit(manager, appWidgetId))
      for (vitamin in visible) {
        val row = RemoteViews(context.packageName, R.layout.rw_widget_vitamin_row)
        row.setTextViewText(R.id.rw_row_name, vitamin.name)
        row.setTextColor(R.id.rw_row_name, if (vitamin.checked) p.textFaint else p.text)
        row.setImageViewResource(
          R.id.rw_row_check,
          if (vitamin.checked) R.drawable.rw_check_on else R.drawable.rw_check_off
        )
        row.tint(R.id.rw_row_check, if (vitamin.checked) p.accent else p.textFaint)
        row.setOnClickPendingIntent(R.id.rw_row, Widgets.toggleVitamin(context, vitamin.id))
        views.addView(R.id.rw_rows, row)
      }

      val hidden = data.vitamins.size - visible.size
      if (hidden > 0) {
        views.setViewVisibility(R.id.rw_more, View.VISIBLE)
        views.setTextViewText(R.id.rw_more, "+$hidden more")
      } else {
        views.setViewVisibility(R.id.rw_more, View.GONE)
      }
    }

    // Rows consume their own taps, so this only catches the header and any
    // leftover space below the list.
    views.setOnClickPendingIntent(R.id.rw_root, Widgets.openApp(context, "vitamins", 4))
    return views
  }

  /**
   * The launcher reports the widget's current size in dp, which is what decides
   * how many rows can show before the list is clipped. Samsung lets a widget be
   * resized well beyond its target cells, so this is read every render rather
   * than assumed from the 2x2 default.
   */
  private fun rowsThatFit(manager: AppWidgetManager, appWidgetId: Int): Int {
    val height = try {
      manager.getAppWidgetOptions(appWidgetId)
        ?.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, 0) ?: 0
    } catch (e: Exception) {
      0
    }
    if (height <= 0) return FALLBACK_ROWS
    return ((height - CHROME_DP) / ROW_DP).coerceIn(1, MAX_ROWS)
  }
}
