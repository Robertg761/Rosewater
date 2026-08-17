package com.robertg761.rosewater.widgets

import android.appwidget.AppWidgetManager
import android.content.Context
import android.widget.RemoteViews

/** Wash, deep condition and trim side by side — the full-width summary. */
class GlanceWidget : RosewaterWidget() {

  private class Column(
    val iconId: Int,
    val daysId: Int,
    val unitId: Int,
    val labelId: Int,
    val dateId: Int,
    val type: String
  )

  private val columns = listOf(
    Column(R.id.rw_c1_icon, R.id.rw_c1_days, R.id.rw_c1_unit, R.id.rw_c1_label, R.id.rw_c1_date, "wash"),
    Column(R.id.rw_c2_icon, R.id.rw_c2_days, R.id.rw_c2_unit, R.id.rw_c2_label, R.id.rw_c2_date, "deep"),
    Column(R.id.rw_c3_icon, R.id.rw_c3_days, R.id.rw_c3_unit, R.id.rw_c3_label, R.id.rw_c3_date, "trim")
  )

  override fun render(
    context: Context,
    manager: AppWidgetManager,
    appWidgetId: Int,
    data: WidgetData
  ): RemoteViews {
    val p = data.palette
    val views = RemoteViews(context.packageName, R.layout.rw_widget_glance)

    views.applyCard(p)
    views.setTextColor(R.id.rw_title, p.textMuted)
    views.applyStreak(p, data.vitaminStreak)

    val dates = listOf(data.lastWashDate, data.lastDeepDate, data.lastTrimDate)
    val labels = listOf("Wash", "Deep cond.", "Trim")

    columns.forEachIndexed { i, column ->
      val date = dates[i]
      val days = date?.let { Dates.daysBetween(it, data.today) }

      if (date == null || days == null) {
        views.setTextViewText(column.daysId, "—")
        views.setTextViewText(column.unitId, "")
        views.setTextViewText(column.dateId, "not yet")
      } else {
        views.setTextViewText(column.daysId, days.toString())
        views.setTextViewText(column.unitId, if (days == 1) "day" else "days")
        views.setTextViewText(column.dateId, Dates.short(date))
      }

      views.setTextViewText(column.labelId, labels[i])
      views.setTextColor(column.daysId, p.text)
      views.setTextColor(column.unitId, p.textMuted)
      views.setTextColor(column.labelId, p.text)
      views.setTextColor(column.dateId, p.textFaint)
      // Each stat keeps its entry-type colour, the same way the app's tiles do.
      views.tint(column.iconId, EntryTypes.color(listOf(column.type)))
    }

    views.setOnClickPendingIntent(R.id.rw_root, Widgets.openApp(context, "home", 3))
    return views
  }
}
