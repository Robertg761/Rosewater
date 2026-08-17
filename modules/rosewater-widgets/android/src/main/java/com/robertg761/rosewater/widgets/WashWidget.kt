package com.robertg761.rosewater.widgets

import android.appwidget.AppWidgetManager
import android.content.Context
import android.widget.RemoteViews

/** The home screen's headline metric: how long since the last wash. */
class WashWidget : RosewaterWidget() {

  override fun render(
    context: Context,
    manager: AppWidgetManager,
    appWidgetId: Int,
    data: WidgetData
  ): RemoteViews {
    val p = data.palette
    val views = RemoteViews(context.packageName, R.layout.rw_widget_wash)

    views.applyCard(p)
    views.setTextColor(R.id.rw_label, p.textMuted)
    views.setTextColor(R.id.rw_days, p.accent)
    views.setTextColor(R.id.rw_unit, p.accent)
    views.setTextColor(R.id.rw_sub, p.textMuted)
    views.tint(R.id.rw_icon_bg, p.accentSoft)
    views.tint(R.id.rw_icon, p.accent)

    val washDate = data.lastWashDate
    val days = washDate?.let { Dates.daysBetween(it, data.today) }
    if (washDate == null || days == null) {
      views.setTextViewText(R.id.rw_days, "—")
      views.setTextViewText(R.id.rw_unit, "")
      views.setTextViewText(R.id.rw_sub, "No washes logged yet")
    } else {
      views.setTextViewText(R.id.rw_days, days.toString())
      views.setTextViewText(R.id.rw_unit, if (days == 1) "day" else "days")
      views.setTextViewText(
        R.id.rw_sub,
        "${data.lastWashLabel} · ${Dates.short(washDate)}"
      )
    }

    views.setOnClickPendingIntent(R.id.rw_root, Widgets.openApp(context, "home", 1))
    return views
  }
}
