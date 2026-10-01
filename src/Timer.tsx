import { useEffect, useRef, useState } from "react";

interface TimerProps {
  resetSignal: number; // increment externally to reset + auto-start
}

export function Timer({ resetSignal }: TimerProps) {
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (resetSignal === 0) return;
    setElapsed(0);
    setRunning(true);
  }, [resetSignal]);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running]);

  const handleReset = () => {
    setElapsed(0);
    setRunning(false);
  };

  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  return (
    <div className="timer">
      <span className="timer-display">{mm}:{ss}</span>
      <button type="button" className="timer-btn" onClick={() => setRunning((r) => !r)} aria-label={running ? "Pause" : "Play"}>
        {running ? "⏸" : "▶"}
      </button>
      <button type="button" className="timer-btn" onClick={handleReset} aria-label="Reset">
        ↺
      </button>
    </div>
  );
}
