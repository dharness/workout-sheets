import { useEffect, useState } from "react";
import "./App.css";
import { CONFIG, nextCategoryAfter, isBandExercise, normalizeBandValue, BAND_OPTIONS, type Category } from "./config";
import { useGoogleAuth } from "./useGoogleAuth";
import {
  appendLiftRows,
  getExerciseData,
  getExerciseLinks,
  SessionExpiredError,
  type ExerciseData,
  type ExerciseLinks,
  type TrendPoint,
} from "./sheets";
import { NumberField } from "./NumberField";
import { Sparkline } from "./Sparkline";
import { TrendModal } from "./TrendModal";
import { PlanModal } from "./PlanModal";

interface LiftRowState {
  exercise: string;
  last: string[]; // [set1lbs, set1reps, set2lbs, set2reps, set3lbs, set3reps]
  values: string[]; // same shape, editable
  trend: TrendPoint[];
}

function diffClass(current: string, last: string): string {
  const c = parseFloat(current);
  const l = parseFloat(last);
  if (isNaN(c) || isNaN(l)) return "diff-same";
  if (c < l) return "diff-less";
  if (c > l) return "diff-more";
  return "diff-same";
}

function buildRows(category: Category, data: ExerciseData): LiftRowState[] {
  return CONFIG.CATEGORIES[category].map((exercise) => {
    const lastValues = data.last[exercise] || [];
    const band = isBandExercise(exercise);
    const lbs = (i: number) => (band ? normalizeBandValue(lastValues[i]) : lastValues[i] ?? "");
    return {
      exercise,
      last: lastValues,
      values: [lbs(0), "", lbs(2), "", lbs(4), ""],
      trend: data.history[exercise] || [],
    };
  });
}

function App() {
  const { accessToken, signIn, signOut } = useGoogleAuth();
  const [category, setCategory] = useState<Category | "">("");
  const [rows, setRows] = useState<LiftRowState[]>([]);
  const [links, setLinks] = useState<ExerciseLinks>({});
  const [status, setStatus] = useState("");
  const [trendExercise, setTrendExercise] = useState<string | null>(null);
  const [showPlan, setShowPlan] = useState(false);

  // On sign-in, auto-load whichever day comes next in the Push/Pull/Legs
  // rotation, based on the most recently logged exercise.
  useEffect(() => {
    if (!accessToken || category) return;

    (async () => {
      setStatus("Loading last lift...");
      try {
        const [data, exerciseLinks] = await Promise.all([
          getExerciseData(accessToken),
          getExerciseLinks(accessToken),
        ]);
        setLinks(exerciseLinks);
        const next = nextCategoryAfter(data.lastExercise);
        setCategory(next);
        setRows(buildRows(next, data));
        setStatus("");
      } catch (err) {
        if (err instanceof SessionExpiredError) signOut();
        setStatus(err instanceof Error ? err.message : String(err));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  const handleCategoryChange = async (value: string) => {
    if (!value) {
      setCategory("");
      setRows([]);
      setStatus("");
      return;
    }
    const nextCategory = value as Category;
    setCategory(nextCategory);
    setStatus("Loading last lift...");

    if (!accessToken) return;

    try {
      const data = await getExerciseData(accessToken);
      setRows(buildRows(nextCategory, data));
      setStatus("");
    } catch (err) {
      if (err instanceof SessionExpiredError) signOut();
      setStatus(err instanceof Error ? err.message : String(err));
      setCategory("");
    }
  };

  const updateValue = (rowIndex: number, valueIndex: number, value: string) => {
    setRows((prev) =>
      prev.map((row, i) =>
        i === rowIndex
          ? { ...row, values: row.values.map((v, j) => (j === valueIndex ? value : v)) }
          : row,
      ),
    );
  };

  const handleCancel = () => {
    setCategory("");
    setRows([]);
    setStatus("");
  };

  const handleSubmit = async () => {
    if (!accessToken || !category) return;
    const date = new Date().toLocaleDateString("en-US");
    const sheetRows = rows.map((row) => [date, row.exercise, ...row.values]);

    setStatus("Saving...");
    try {
      await appendLiftRows(accessToken, sheetRows, category);
      setStatus(`Saved ${category} day (${rows.length} exercises).`);
      setCategory("");
      setRows([]);
    } catch (err) {
      if (err instanceof SessionExpiredError) signOut();
      setStatus(`Error: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const trendRow = rows.find((row) => row.exercise === trendExercise);

  return (
    <>
      <header>
        <h1>Workout Sheets</h1>
        <div className="header-actions">
          <button className="plan-btn" onClick={() => setShowPlan(true)}>
            View plan
          </button>
          <button
            id="signin-btn"
            className={accessToken ? "signed-in" : ""}
            onClick={signIn}
          >
            {accessToken ? "Signed in ✓" : "Sign in with Google"}
          </button>
        </div>
      </header>

      <main>
        {accessToken && (
          <select
            className="category-select"
            value={category}
            onChange={(e) => handleCategoryChange(e.target.value)}
          >
            <option value="">Select a day…</option>
            {Object.keys(CONFIG.CATEGORIES).map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        )}

        {category && rows.length > 0 && (
          <div className="lift-card">
            <h2>{category}</h2>
            <table className="lift-table">
              <thead>
                <tr>
                  <th className="col-trend" />
                  <th className="col-exercise">Exercise</th>
                  <th colSpan={2}>Set 1</th>
                  <th colSpan={2}>Set 2</th>
                  <th colSpan={2}>Set 3</th>
                </tr>
                <tr>
                  <th className="col-trend" />
                  <th className="col-exercise" />
                  <th>lbs</th>
                  <th>reps</th>
                  <th>lbs</th>
                  <th>reps</th>
                  <th>lbs</th>
                  <th>reps</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rowIndex) => (
                  <tr key={row.exercise}>
                    <td className="col-trend">
                      <Sparkline
                        values={row.trend.map((p) => p.value)}
                        unit={row.trend[row.trend.length - 1]?.unit}
                        onClick={() => setTrendExercise(row.exercise)}
                      />
                    </td>
                    <td className="col-exercise">
                      {links[row.exercise] ? (
                        <a href={links[row.exercise]} target="_blank" rel="noreferrer">
                          {row.exercise}
                        </a>
                      ) : (
                        row.exercise
                      )}
                    </td>
                    {row.values.map((value, valueIndex) => {
                      const isLbs = valueIndex % 2 === 0;
                      const last = row.last[valueIndex] ?? "";
                      if (isLbs && isBandExercise(row.exercise)) {
                        return (
                          <td key={valueIndex}>
                            <select
                              className="band-select"
                              value={value}
                              onChange={(e) => updateValue(rowIndex, valueIndex, e.target.value)}
                            >
                              {BAND_OPTIONS.map((opt) => (
                                <option key={opt} value={opt === "None" ? "" : opt}>
                                  {opt}
                                </option>
                              ))}
                            </select>
                          </td>
                        );
                      }
                      const diff = diffClass(value, last);
                      return (
                        <td key={valueIndex}>
                          <NumberField
                            className={isLbs && diff === "diff-same" ? "" : diff}
                            step={isLbs ? 5 : 1}
                            value={value}
                            placeholder={isLbs ? undefined : last}
                            onChange={(v) => updateValue(rowIndex, valueIndex, v)}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="lift-card-actions">
              <button className="btn-secondary" onClick={handleCancel}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleSubmit}>
                Submit
              </button>
            </div>
          </div>
        )}

        {status && <p className="status">{status}</p>}
      </main>

      {trendRow && (
        <TrendModal
          exercise={trendRow.exercise}
          points={trendRow.trend}
          onClose={() => setTrendExercise(null)}
        />
      )}

      {showPlan && <PlanModal onClose={() => setShowPlan(false)} />}
    </>
  );
}

export default App;
