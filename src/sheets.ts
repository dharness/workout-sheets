import { CONFIG, CATEGORY_COLORS, type Category } from "./config";

export class SessionExpiredError extends Error {
  constructor() {
    super("Your session expired. Please sign in again.");
  }
}

async function sheetsFetch(accessToken: string, path: string, init: RequestInit = {}): Promise<Response> {
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.SPREADSHEET_ID}${path}`, {
    ...init,
    headers: { ...init.headers, Authorization: `Bearer ${accessToken}` },
  });
  if (res.status === 401) throw new SessionExpiredError();
  return res;
}

async function fetchRange(
  accessToken: string,
  sheetName: string,
  range: string,
): Promise<string[][]> {
  const fullRange = `'${sheetName}'!${range}`;
  const res = await sheetsFetch(accessToken, `/values/${encodeURIComponent(fullRange)}`);

  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(
      `Failed to read "${sheetName}": ${err?.error?.message || res.statusText}`,
    );
  }

  const data = await res.json();
  return data.values || [];
}

export type LastValuesByExercise = Record<string, string[]>;
export interface TrendPoint {
  label: string;
  value: number;
  unit: "volume" | "reps";
  sets: string[]; // [set1lbs, set1reps, set2lbs, set2reps, set3lbs, set3reps]
}
export type HistoryByExercise = Record<string, TrendPoint[]>;
export type ExerciseLinks = Record<string, string>;

// A single comparable progress number for one session. For weighted
// exercises this is volume (lbs × reps, summed across sets) — it rewards
// either lifting heavier or doing more reps. For bodyweight exercises with
// no lbs recorded (blank, or an explicit 0 for "no added weight"), it falls
// back to total reps across sets.
function sessionMetric(values: string[]): { value: number; unit: "volume" | "reps" } | null {
  const sets: [number, number][] = [[0, 1], [2, 3], [4, 5]];
  let hasLbs = false;
  let volume = 0;
  for (const [lbsIdx, repsIdx] of sets) {
    const lbs = parseFloat(values[lbsIdx]);
    const reps = parseFloat(values[repsIdx]);
    if (!isNaN(lbs) && lbs > 0) hasLbs = true;
    if (!isNaN(lbs) && lbs > 0 && !isNaN(reps)) volume += lbs * reps;
  }
  if (hasLbs) {
    return volume > 0 ? { value: volume, unit: "volume" } : null;
  }

  const totalReps = sets.reduce((sum, [, repsIdx]) => {
    const reps = parseFloat(values[repsIdx]);
    return sum + (isNaN(reps) ? 0 : reps);
  }, 0);
  return totalReps > 0 ? { value: totalReps, unit: "reps" } : null;
}

export interface ExerciseData {
  last: LastValuesByExercise;
  history: HistoryByExercise;
  lastExercise: string | null;
}

// Row position alone isn't a reliable ordering signal — the sheet mixes a
// historical block (newest-at-top) with live app submissions (appended at
// the bottom, so oldest-at-top), and the exact boundary shifts whenever rows
// are hand-edited or deleted. Instead, resolve each row's real date (only
// the first row of each Push/Pull/Legs group carries one; the rest inherit
// it going downward) and sort/compare by the actual parsed date — that's
// robust to any reordering, insertion, or deletion of rows.
function parseSheetDate(label: string): number {
  const ts = Date.parse(label);
  return isNaN(ts) ? -Infinity : ts;
}

function hasAnyValue(values: string[]): boolean {
  return values.some((v) => v !== "" && v != null);
}

export async function getExerciseData(accessToken: string): Promise<ExerciseData> {
  const recordRows = await fetchRange(accessToken, CONFIG.SHEET_NAME, "A3:H");

  let currentDate = "";
  const datedRows = recordRows.map((row) => {
    if (row[0]) currentDate = row[0];
    return [currentDate, ...row.slice(1)];
  });

  const last: LastValuesByExercise = {};
  const lastTs: Record<string, number> = {};
  const unsorted: Record<string, (TrendPoint & { ts: number })[]> = {};
  let lastExercise: string | null = null;
  let lastExerciseTs = -Infinity;

  for (const row of datedRows) {
    const date = row[0];
    const exercise = row[1];
    if (!exercise) continue;
    const values = row.slice(2, 8);
    const ts = parseSheetDate(date);

    // Rows aren't in chronological order (the sheet mixes a newest-at-top
    // historical block with append-at-bottom live entries), so keep
    // whichever occurrence of this exercise has the latest actual date.
    if (!(exercise in lastTs) || ts >= lastTs[exercise]) {
      last[exercise] = values;
      lastTs[exercise] = ts;
    }

    if (hasAnyValue(values) && ts >= lastExerciseTs) {
      lastExerciseTs = ts;
      lastExercise = exercise;
    }

    const metric = sessionMetric(values);
    if (metric !== null) {
      const series = (unsorted[exercise] ??= []);
      series.push({
        label: date || `Session ${series.length + 1}`,
        value: metric.value,
        unit: metric.unit,
        sets: values,
        ts,
      });
    }
  }

  const history: HistoryByExercise = {};
  for (const [exercise, series] of Object.entries(unsorted)) {
    history[exercise] = series
      .sort((a, b) => a.ts - b.ts)
      .map(({ ts: _ts, ...point }) => point);
  }

  return { last, history, lastExercise };
}

// Exercise names in the history sheet are linked to demo videos. Sheets only
// exposes hyperlinks via spreadsheets.get (not the values.get endpoint used
// elsewhere), with an explicit field mask.
export async function getExerciseLinks(accessToken: string): Promise<ExerciseLinks> {
  const range = `'${CONFIG.HISTORY_SHEET_NAME}'!B3:B`;
  const fields = "sheets.data.rowData.values(formattedValue,hyperlink)";
  const res = await sheetsFetch(
    accessToken,
    `?ranges=${encodeURIComponent(range)}&fields=${encodeURIComponent(fields)}`,
  );

  if (!res.ok) return {};

  const data = await res.json();
  const rowData = data.sheets?.[0]?.data?.[0]?.rowData ?? [];

  const links: ExerciseLinks = {};
  for (const row of rowData) {
    const cell = row.values?.[0];
    if (cell?.formattedValue && cell?.hyperlink) {
      links[cell.formattedValue] = cell.hyperlink;
    }
  }
  return links;
}

// New entries go at the TOP of the data (right after the 2 header rows), not
// the bottom — the sheet's whole historical convention is newest-at-top, and
// the plain values:append endpoint always adds to the bottom, which would
// bury new saves below everything else.
const FIRST_DATA_ROW_INDEX = 2; // 0-indexed grid row — sheet row 3

export async function appendLiftRows(
  accessToken: string,
  rows: (string | number)[][],
  category: Category,
): Promise<void> {
  const rowCount = rows.length;
  const endRowIndex = FIRST_DATA_ROW_INDEX + rowCount;

  const insertRes = await sheetsFetch(accessToken, ":batchUpdate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      requests: [
        {
          insertDimension: {
            range: {
              sheetId: CONFIG.RECORD_SHEET_ID,
              dimension: "ROWS",
              startIndex: FIRST_DATA_ROW_INDEX,
              endIndex: endRowIndex,
            },
            inheritFromBefore: false,
          },
        },
      ],
    }),
  });

  if (!insertRes.ok) {
    const err = await insertRes.json().catch(() => null);
    throw new Error(err?.error?.message || insertRes.statusText);
  }

  const targetRange = `'${CONFIG.SHEET_NAME}'!A${FIRST_DATA_ROW_INDEX + 1}:H${endRowIndex}`;
  const writeRes = await sheetsFetch(
    accessToken,
    `/values/${encodeURIComponent(targetRange)}?valueInputOption=USER_ENTERED`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ values: rows }),
    },
  );

  if (!writeRes.ok) {
    const err = await writeRes.json().catch(() => null);
    throw new Error(err?.error?.message || writeRes.statusText);
  }

  await sheetsFetch(accessToken, ":batchUpdate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      requests: [
        {
          repeatCell: {
            range: {
              sheetId: CONFIG.RECORD_SHEET_ID,
              startRowIndex: FIRST_DATA_ROW_INDEX,
              endRowIndex,
              startColumnIndex: 0,
              endColumnIndex: 8,
            },
            cell: { userEnteredFormat: { backgroundColor: CATEGORY_COLORS[category] } },
            fields: "userEnteredFormat.backgroundColor",
          },
        },
      ],
    }),
  });
}
