import type { RiskAssessment } from "@/lib/aiRisk";

// Always an opaque black badge, regardless of risk level — this is
// deliberate: RiskBadge gets placed on both dark `.card` panels and light,
// textured `SpatialCard` forms (e.g. campaign/fund creation), and a
// translucent tint (the old `bg-white/5`) reads fine on a dark card but is
// nearly invisible white-on-white on a light one. An opaque background
// makes it legible everywhere it's used without needing to know its
// surroundings. Border escalates with severity; text only shifts to red for
// HIGH — no amber/yellow, to stay inside the site's existing monochrome +
// red-for-danger palette (the same red already used for form errors)
// rather than introducing a separate warning color.
const BADGE_STYLES: Record<RiskAssessment["risk_level"], string> = {
  LOW: "bg-black border-white/15",
  MEDIUM: "bg-black border-white/40",
  HIGH: "bg-black border-red-500/50",
};

const HEADER_TEXT: Record<RiskAssessment["risk_level"], string> = {
  LOW: "text-white",
  MEDIUM: "text-white",
  HIGH: "text-red-400",
};

export function RiskBadge({ assessment }: { assessment: RiskAssessment }) {
  return (
    <div
      className={`mt-3 rounded-lg border p-3 text-xs shadow-[0_4px_16px_rgba(0,0,0,0.35)] ${BADGE_STYLES[assessment.risk_level]}`}
    >
      <div className={`flex items-center justify-between font-semibold ${HEADER_TEXT[assessment.risk_level]}`}>
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