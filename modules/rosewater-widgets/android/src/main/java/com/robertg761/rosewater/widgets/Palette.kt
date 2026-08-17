package com.robertg761.rosewater.widgets

/**
 * The slice of `src/theme.ts` the widgets actually paint with. Kept in sync by
 * hand — if a palette changes in the app, mirror it here or the home screen
 * will drift from the app's look.
 */
data class Palette(
  val card: Int,
  val cardAlt: Int,
  val accent: Int,
  val accentSoft: Int,
  val onAccent: Int,
  val text: Int,
  val textMuted: Int,
  val textFaint: Int,
  val border: Int,
  val success: Int,
  val star: Int
)

private fun c(hex: Long): Int = hex.toInt()

private val ROSEWATER = Palette(
  card = c(0xFFFFFFFF),
  cardAlt = c(0xFFFFF8F7),
  accent = c(0xFFC25470),
  accentSoft = c(0xFFFADCE3),
  onAccent = c(0xFFFFFFFF),
  text = c(0xFF35242A),
  textMuted = c(0xFF8A7076),
  textFaint = c(0xFFB9A3A8),
  border = c(0xFFF2DDE1),
  success = c(0xFF3F8F60),
  star = c(0xFFE5A020)
)

private val LAVENDER = Palette(
  card = c(0xFFFFFFFF),
  cardAlt = c(0xFFFAF8FF),
  accent = c(0xFF7B5CC4),
  accentSoft = c(0xFFE8E0FA),
  onAccent = c(0xFFFFFFFF),
  text = c(0xFF2E2739),
  textMuted = c(0xFF7D7490),
  textFaint = c(0xFFADA5BE),
  border = c(0xFFE6E0F3),
  success = c(0xFF3F8F60),
  star = c(0xFFE5A020)
)

private val MINT = Palette(
  card = c(0xFFFFFFFF),
  cardAlt = c(0xFFF7FCFA),
  accent = c(0xFF1F8E68),
  accentSoft = c(0xFFD6F0E5),
  onAccent = c(0xFFFFFFFF),
  text = c(0xFF1F332B),
  textMuted = c(0xFF658077),
  textFaint = c(0xFF9BB4AB),
  border = c(0xFFDCEDE5),
  success = c(0xFF2E8B57),
  star = c(0xFFDFA019)
)

private val SUNSET = Palette(
  card = c(0xFFFFFFFF),
  cardAlt = c(0xFFFFFAF6),
  accent = c(0xFFD2662C),
  accentSoft = c(0xFFFBE3CF),
  onAccent = c(0xFFFFFFFF),
  text = c(0xFF3A2A20),
  textMuted = c(0xFF8E7565),
  textFaint = c(0xFFBFA895),
  border = c(0xFFF5E3D3),
  success = c(0xFF3F8F60),
  star = c(0xFFD99B14)
)

private val MIDNIGHT = Palette(
  card = c(0xFF211D2F),
  cardAlt = c(0xFF2A2540),
  accent = c(0xFFE294B0),
  accentSoft = c(0xFF3A2E42),
  // The accent is a light pink here, so on-accent text has to be dark.
  onAccent = c(0xFF2A1520),
  text = c(0xFFF3EEF5),
  textMuted = c(0xFFA398AC),
  textFaint = c(0xFF796E85),
  border = c(0xFF332D44),
  success = c(0xFF7FC28E),
  star = c(0xFFF0C64F)
)

private val THEMES = mapOf(
  "rosewater" to ROSEWATER,
  "lavender" to LAVENDER,
  "mint" to MINT,
  "sunset" to SUNSET,
  "midnight" to MIDNIGHT
)

fun paletteFor(key: String?): Palette = THEMES[key] ?: ROSEWATER

/** Entry-type colours and labels, mirroring `entryTypeMeta` in the app. */
object EntryTypes {
  private data class Meta(val label: String, val short: String, val color: Int)

  private val META = mapOf(
    "wash" to Meta("Shampoo wash", "Wash", c(0xFF5B93C7)),
    "shampoo" to Meta("Shampoo", "Shampoo", c(0xFF3E86C4)),
    "condition" to Meta("Condition", "Condition", c(0xFF7D8FD4)),
    "shampoo_condition" to Meta("Shampoo/Condition", "Sham/cond", c(0xFF4AA0B5)),
    "cowash" to Meta("Co-wash", "Co-wash", c(0xFF79ADD6)),
    "clarify" to Meta("Clarifying wash", "Clarify", c(0xFF3F7BA8)),
    "deep" to Meta("Deep condition", "Deep cond.", c(0xFFB4646F)),
    "protein" to Meta("Protein treatment", "Protein", c(0xFF9068AE)),
    "oil" to Meta("Oil / sealing", "Oil", c(0xFFBF991F)),
    "heat" to Meta("Heat styling", "Heat", c(0xFFD57F38)),
    "trim" to Meta("Trim", "Trim", c(0xFF6F9A52)),
    "style" to Meta("Protective style", "Style", c(0xFF4F8B85)),
    "other" to Meta("Other", "Other", c(0xFF8A7A80))
  )

  private val OTHER = META.getValue("other")

  /** Full label for a single type, short labels joined for several. */
  fun label(types: List<String>): String {
    if (types.size <= 1) return (META[types.firstOrNull()] ?: OTHER).label
    return types.joinToString(" · ") { (META[it] ?: OTHER).short }
  }

  fun color(types: List<String>): Int = (META[types.firstOrNull()] ?: OTHER).color
}

/** Wash-ish entry types, mirroring `WASH_TYPES` in the app. */
val WASH_TYPES = listOf("wash", "shampoo", "shampoo_condition", "cowash", "clarify")
