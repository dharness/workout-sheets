import { useState } from "react";
import { buildPlanText } from "./config";

interface PlanModalProps {
  onClose: () => void;
}

export function PlanModal({ onClose }: PlanModalProps) {
  const text = buildPlanText();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Workout Plan</h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <textarea
          className="plan-text"
          readOnly
          value={text}
          onClick={(e) => e.currentTarget.select()}
        />
        <div className="lift-card-actions">
          <button className="btn-secondary" onClick={onClose}>
            Close
          </button>
          <button className="btn-primary" onClick={handleCopy}>
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>
    </div>
  );
}
