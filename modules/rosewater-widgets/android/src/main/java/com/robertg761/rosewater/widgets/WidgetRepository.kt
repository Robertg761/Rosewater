package com.robertg761.rosewater.widgets

import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.util.Log
import java.io.File
import java.util.Calendar

data class VitaminRow(val id: Long, val name: String, val checked: Boolean)

data class WidgetData(
  val palette: Palette,
  val today: String,
  /** Most recent entry that included a wash-ish type. */
  val lastWashDate: String?,
  val lastWashLabel: String?,
  val lastDeepDate: String?,
  val lastTrimDate: String?,
  val vitamins: List<VitaminRow>,
  val vitaminStreak: Int
) {
  val vitaminsDone: Int get() = vitamins.count { it.checked }
  val vitaminsTotal: Int get() = vitamins.size
}

/**
 * Widgets read the app's SQLite file directly rather than a snapshot pushed
 * from JS. Both connections live in the same process and the database is in WAL
 * mode, so a concurrent reader is safe — and it means a widget can never show
 * data the app has already moved past.
 */
object WidgetRepository {

  private const val TAG = "RosewaterWidgets"

  private fun dbFile(context: Context) = File(File(context.filesDir, "SQLite"), "rosewater.db")

  /**
   * Null until the app has been opened once and created the database. WAL is
   * requested explicitly so this connection does not try to switch the file's
   * journal mode out from under expo-sqlite.
   */
  private fun open(context: Context): SQLiteDatabase? {
    val file = dbFile(context)
    if (!file.exists()) return null
    return try {
      SQLiteDatabase.openDatabase(
        file.path,
        null,
        SQLiteDatabase.OPEN_READWRITE or SQLiteDatabase.ENABLE_WRITE_AHEAD_LOGGING
      )
    } catch (e: Exception) {
      Log.w(TAG, "Could not open the database", e)
      null
    }
  }

  private inline fun <T> withDb(context: Context, fallback: T, body: (SQLiteDatabase) -> T): T {
    val db = open(context) ?: return fallback
    return try {
      body(db)
    } catch (e: Exception) {
      Log.w(TAG, "Database read failed", e)
      fallback
    } finally {
      try {
        db.close()
      } catch (e: Exception) {
        // Nothing useful to do if closing fails.
      }
    }
  }

  fun load(context: Context): WidgetData {
    val today = Dates.today()
    return withDb(context, emptyData(today)) { db ->
      val checked = checkedOn(db, today)
      val vitamins = db.rawQuery(
        "SELECT id, name FROM vitamins WHERE active = 1 ORDER BY sort ASC, id ASC",
        null
      ).use { c ->
        buildList {
          while (c.moveToNext()) {
            val id = c.getLong(0)
            add(VitaminRow(id, c.getString(1), checked.contains(id)))
          }
        }
      }

      val wash = lastEntryOfTypes(db, WASH_TYPES)
      WidgetData(
        palette = paletteFor(settingValue(db, "theme")),
        today = today,
        lastWashDate = wash?.first,
        lastWashLabel = wash?.second?.let { EntryTypes.label(it) },
        lastDeepDate = lastDateOfTypes(db, listOf("deep")),
        lastTrimDate = lastDateOfTypes(db, listOf("trim")),
        vitamins = vitamins,
        vitaminStreak = streak(db, today)
      )
    }
  }

  private fun emptyData(today: String) = WidgetData(
    palette = paletteFor(null),
    today = today,
    lastWashDate = null,
    lastWashLabel = null,
    lastDeepDate = null,
    lastTrimDate = null,
    vitamins = emptyList(),
    vitaminStreak = 0
  )

  /**
   * Entry types are stored comma-separated in a single column, so membership is
   * a LIKE against the value padded with commas — the same trick the app uses.
   */
  private fun typeClause(types: List<String>) =
    types.joinToString(" OR ") { "(',' || type || ',') LIKE ?" }

  private fun typeArgs(types: List<String>) = types.map { "%,$it,%" }.toTypedArray()

  private fun lastDateOfTypes(db: SQLiteDatabase, types: List<String>): String? =
    db.rawQuery(
      "SELECT MAX(date) FROM entries WHERE ${typeClause(types)}",
      typeArgs(types)
    ).use { c ->
      if (c.moveToFirst() && !c.isNull(0)) c.getString(0) else null
    }

  /** Date plus the entry's full type list, for the wash widget's subtitle. */
  private fun lastEntryOfTypes(
    db: SQLiteDatabase,
    types: List<String>
  ): Pair<String, List<String>>? =
    db.rawQuery(
      "SELECT date, type FROM entries WHERE ${typeClause(types)} " +
        "ORDER BY date DESC, id DESC LIMIT 1",
      typeArgs(types)
    ).use { c ->
      if (!c.moveToFirst()) return@use null
      c.getString(0) to c.getString(1).split(",").filter { it.isNotEmpty() }
    }

  private fun checkedOn(db: SQLiteDatabase, date: String): Set<Long> =
    db.rawQuery("SELECT vitamin_id FROM vitamin_log WHERE date = ?", arrayOf(date)).use { c ->
      buildSet {
        while (c.moveToNext()) add(c.getLong(0))
      }
    }

  private fun settingValue(db: SQLiteDatabase, key: String): String? =
    db.rawQuery("SELECT value FROM settings WHERE key = ?", arrayOf(key)).use { c ->
      if (c.moveToFirst()) c.getString(0) else null
    }

  /** Mirrors `vitaminStreak` in the app: today not being checked yet does not break it. */
  private fun streak(db: SQLiteDatabase, upTo: String): Int {
    val dates = db.rawQuery(
      "SELECT DISTINCT date FROM vitamin_log WHERE date <= ? ORDER BY date DESC LIMIT 3660",
      arrayOf(upTo)
    ).use { c ->
      buildSet<String> {
        while (c.moveToNext()) add(c.getString(0))
      }
    }
    var cursor = if (dates.contains(upTo)) upTo else Dates.shift(upTo, -1)
    var count = 0
    while (dates.contains(cursor)) {
      count++
      cursor = Dates.shift(cursor, -1)
    }
    return count
  }

  /**
   * Writes straight into `vitamin_log`, the same table the app uses, so a
   * check-off from the home screen is indistinguishable from one made in-app.
   * Returns the new checked state, or null if the write could not happen.
   */
  fun toggleVitamin(context: Context, vitaminId: Long, date: String): Boolean? =
    withDb(context, null) { db ->
      val isChecked = db.rawQuery(
        "SELECT 1 FROM vitamin_log WHERE vitamin_id = ? AND date = ?",
        arrayOf(vitaminId.toString(), date)
      ).use { it.moveToFirst() }

      if (isChecked) {
        db.execSQL(
          "DELETE FROM vitamin_log WHERE vitamin_id = ? AND date = ?",
          arrayOf<Any>(vitaminId, date)
        )
      } else {
        db.execSQL(
          "INSERT OR IGNORE INTO vitamin_log (vitamin_id, date) VALUES (?, ?)",
          arrayOf<Any>(vitaminId, date)
        )
      }
      !isChecked
    }
}

/**
 * Local-calendar date maths matching `src/dates.ts`. Deliberately uses Calendar
 * rather than java.time so the widgets carry no desugaring requirement.
 */
object Dates {

  fun today(): String = format(Calendar.getInstance())

  private fun format(cal: Calendar): String = String.format(
    "%04d-%02d-%02d",
    cal.get(Calendar.YEAR),
    cal.get(Calendar.MONTH) + 1,
    cal.get(Calendar.DAY_OF_MONTH)
  )

  private fun parse(s: String): Calendar? {
    val parts = s.split("-")
    if (parts.size != 3) return null
    val y = parts[0].toIntOrNull() ?: return null
    val m = parts[1].toIntOrNull() ?: return null
    val d = parts[2].toIntOrNull() ?: return null
    return Calendar.getInstance().apply {
      clear()
      set(y, m - 1, d)
    }
  }

  fun shift(s: String, days: Int): String {
    val cal = parse(s) ?: return s
    cal.add(Calendar.DAY_OF_MONTH, days)
    return format(cal)
  }

  /** Whole days from [from] to [to]; null if either date is unparseable. */
  fun daysBetween(from: String, to: String): Int? {
    val a = parse(from) ?: return null
    val b = parse(to) ?: return null
    return Math.round((b.timeInMillis - a.timeInMillis) / 86_400_000.0).toInt()
  }

  private val MONTHS = arrayOf(
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  )

  /** "Aug 13", matching `formatDateShort`. */
  fun short(s: String): String {
    val cal = parse(s) ?: return s
    return "${MONTHS[cal.get(Calendar.MONTH)]} ${cal.get(Calendar.DAY_OF_MONTH)}"
  }
}
