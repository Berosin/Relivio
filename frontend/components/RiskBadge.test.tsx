import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { RiskBadge } from "./RiskBadge";
import type { RiskAssessment } from "@/lib/aiRisk";

function makeAssessment(overrides: Partial<RiskAssessment> = {}): RiskAssessment {
  return {
    risk_level: "LOW",
    risk_score: 12,
    reasons: ["No elevated-risk signals detected under current rules."],
    disclaimer: "Advisory only. This score does not approve or reject anything.",
    ...overrides,
  };
}

describe("RiskBadge", () => {
  it("renders the risk level and score", () => {
    render(<RiskBadge assessment={makeAssessment({ risk_level: "MEDIUM", risk_score: 55 })} />);
    expect(screen.getByText(/AI Advisory Risk Signal: MEDIUM/)).toBeInTheDocument();
    expect(screen.getByText("55/100")).toBeInTheDocument();
  });

  it("renders every reason as a list item", () => {
    render(
      <RiskBadge
        assessment={makeAssessment({
          reasons: ["Reason one.", "Reason two.", "Reason three."],
        })}
      />
    );
    expect(screen.getByText("Reason one.")).toBeInTheDocument();
    expect(screen.getByText("Reason two.")).toBeInTheDocument();
    expect(screen.getByText("Reason three.")).toBeInTheDocument();
  });

  it("renders the disclaimer text", () => {
    render(<RiskBadge assessment={makeAssessment({ disclaimer: "Some disclaimer text." })} />);
    expect(screen.getByText("Some disclaimer text.")).toBeInTheDocument();
  });

  it.each([
    ["LOW", "bg-white/5"],
    ["MEDIUM", "bg-amber-500/10"],
    ["HIGH", "bg-red-500/10"],
  ] as const)("applies the correct color class for %s risk level", (level, expectedClassFragment) => {
    const { container } = render(<RiskBadge assessment={makeAssessment({ risk_level: level })} />);
    const badge = container.firstElementChild;
    expect(badge?.className).toContain(expectedClassFragment);
  });
});