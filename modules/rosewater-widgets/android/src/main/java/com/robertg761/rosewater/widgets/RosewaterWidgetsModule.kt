package com.robertg761.rosewater.widgets

import android.util.Log
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class RosewaterWidgetsModule : Module() {

  override fun definition() = ModuleDefinition {
    Name("RosewaterWidgets")

    // Synchronous on purpose: it only asks the AppWidgetManager which widgets
    // exist and posts a broadcast, so it never touches the database on the JS
    // thread. The providers do the reading when the broadcast lands.
    Function("refresh") {
      val context = appContext.reactContext
      if (context != null) {
        try {
          Widgets.refreshAll(context)
        } catch (e: Exception) {
          Log.w("RosewaterWidgets", "Widget refresh failed", e)
        }
      }
    }
  }
}
