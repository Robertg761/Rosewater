package com.robertg761.rosewater.widgets

import android.appwidget.AppWidgetManager
import android.content.Context
import android.widget.RemoteViews

/** A single accent-filled button that opens the log sheet directly. */
class QuickLogWidget : RosewaterWidget() {

  override fun render(
    context: Context,
    manager: AppWidgetManager,
    appWidgetId: Int,
    data: WidgetData
  ): RemoteViews {
    val p = data.palette
    val views = RemoteViews(context.packageName, R.layout.rw_widget_quick_log)

    views.tint(R.id.rw_bg_fill, p.accent)
    views.tint(R.id.rw_icon, p.onAccent)
    views.setTextColor(R.id.rw_text, p.onAccent)

    views.setOnClickPendingIntent(R.id.rw_root, Widgets.openApp(context, "log", 2))
    return views
  }
}
