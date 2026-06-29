// Public OAuth client ID for Google Identity Services (browser token flow).
// This is not a secret — it must be registered as a "Web application" OAuth
// client in Google Cloud Console with this site's origin allow-listed under
// "Authorized JavaScript origins" (e.g. https://dharness.github.io and
// http://localhost:8000).
export const CONFIG = {
  CLIENT_ID: "1091663654460-8tqqbt7jgmdp59e5r6039cm5i650pre9.apps.googleusercontent.com",
  SPREADSHEET_ID: "1euI82wFBrz3iIM5rEoQvCu5ApvBcwzEXRFIsew2zqmc",
  SHEET_NAME: "record_001",
  RECORD_SHEET_ID: 522477376,
  HISTORY_SHEET_NAME: "🏋️ Lift",
  SCOPES: "https://www.googleapis.com/auth/spreadsheets",
  CATEGORIES: {
    Push: [
      "Dumbbell Floor Press",
      "Dumbbell Overhead Press",
      "Push-ups",
      "Dumbbell Lateral Raises",
      "Overhead Dumbbell Tricep Extension",
    ],
    Pull: [
      "Pull-ups or Chin-ups",
      "One-Arm Dumbbell Row",
      "Dumbbell Shrugs",
      "Bicep Curls",
      "Hammer Curls",
    ],
    Legs: [
      "Goblet Squats",
      "Dumbbell Romanian Deadlifts",
      "Bulgarian Split Squats",
      "Calf Raises",
    ],
  },
} as const;

export type Category = keyof typeof CONFIG.CATEGORIES;

export const CATEGORY_ORDER: Category[] = ["Push", "Pull", "Legs"];

// Exercises where the "lbs" column is actually assist-band size, not a
// weight — these get a select (None/Sm/L) instead of a numeric stepper.
export const BAND_EXERCISES: readonly string[] = ["Pull-ups or Chin-ups"];
export const BAND_OPTIONS = ["None", "Sm", "L"] as const;

export function isBandExercise(exercise: string): boolean {
  return BAND_EXERCISES.includes(exercise);
}

// Historical data has inconsistent casing ("S", "sm", "-", blank) for the
// same three states — normalize to the canonical option set.
export function normalizeBandValue(value: string | undefined): string {
  if (!value) return "";
  if (/^l/i.test(value)) return "L";
  if (/^s/i.test(value)) return "Sm";
  return "";
}

// Matches the row background colors already used in the source sheet, so new
// entries stay visually grouped by day the same way the historical data is.
export const CATEGORY_COLORS: Record<Category, { red: number; green: number; blue: number }> = {
  Push: { red: 1, green: 0.9176, blue: 0.9176 }, // #FFEAEA
  Pull: { red: 1, green: 0.9686, blue: 0.8745 }, // #FFF7DF
  Legs: { red: 0.9098, green: 0.9569, blue: 1 }, // #E8F4FF
};

// Plain-text rendering of the whole plan, grouped by day — for copy/paste.
export function buildPlanText(): string {
  return CATEGORY_ORDER.map(
    (cat) => `${cat}\n${CONFIG.CATEGORIES[cat].map((e) => `- ${e}`).join("\n")}`,
  ).join("\n\n");
}

// Figures out which day comes next in the Push/Pull/Legs rotation, based on
// whichever exercise was logged most recently.
export function nextCategoryAfter(lastExercise: string | null): Category {
  if (lastExercise) {
    for (let i = 0; i < CATEGORY_ORDER.length; i++) {
      const cat = CATEGORY_ORDER[i];
      if ((CONFIG.CATEGORIES[cat] as readonly string[]).includes(lastExercise)) {
        return CATEGORY_ORDER[(i + 1) % CATEGORY_ORDER.length];
      }
    }
  }
  return CATEGORY_ORDER[0];
}
