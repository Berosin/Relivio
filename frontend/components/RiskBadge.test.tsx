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
    ["LOW", "border-white/15"],
    ["MEDIUM", "border-white/40"],
    ["HIGH", "border-red-500/50"],
  ] as const)("applies the correct border class for %s risk level", (level, expectedClassFragment) => {
    const { container } = render(<RiskBadge assessment={makeAssessment({ risk_level: level })} />);
    const badge = container.firstElementChild;
    expect(badge?.className).toContain(expectedClassFragment);
  });

  it("is always rendered with an opaque black background, regardless of risk level", () => {
    // Regression test: RiskBadge is placed on both dark .card panels and
    // light, textured SpatialCard forms. A translucent background would
    // read fine on one and be unreadable on the other — it must stay
    // opaque so it's legible no matter what it's placed on top of.
    for (const level of ["LOW", "MEDIUM", "HIGH"] as const) {
      const { container } = render(<RiskBadge assessment={makeAssessment({ risk_level: level })} />);
      const badge = container.firstElementChild;
      expect(badge?.className).toContain("bg-black");
    }
  });

  it("never uses an amber/yellow color, staying inside the site's monochrome + red palette", () => {
    for (const level of ["LOW", "MEDIUM", "HIGH"] as const) {
      const { container } = render(<RiskBadge assessment={makeAssessment({ risk_level: level })} />);
      expect(container.innerHTML).not.toMatch(/amber|yellow/i);
    }
  });
});