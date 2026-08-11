import type { RiskAssessment } from "@/lib/aiRisk";

const LEVEL_STYLES: Record<RiskAssessment["risk_level"], string> = {
  LOW: "bg-white/5 border-white/20 text-white",
  MEDIUM: "bg-amber-500/10 border-amber-500/30 text-amber-400",
  HIGH: "bg-red-500/10 border-red-500/30 text-red-400",
};

export function RiskBadge({ assessment }: { assessment: RiskAssessment }) {
  return (
    <div className={`mt-3 rounded-lg border p-3 text-xs ${LEVEL_STYLES[assessment.risk_level]}`}>
      <div className="flex items-center justify-between font-semibold">
        <span>AI Advisory Risk Signal: {assessment.risk_level}</span>
        <span>{assessment.risk_score}/100</span>
      </div>
      <ul className="mt-2 list-disc space-y-0.5 pl-4 text-neutral-300">
        {assessment.reasons.map((r, i) => (
          <li key={i}>{r}</li>
        ))}
      </ul>
      <p className="mt-2 text-neutral-500">{assessment.disclaimer}</p>
    </div>
  );
}