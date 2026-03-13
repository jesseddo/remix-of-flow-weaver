import { ScenarioData } from "@/types/scenario";

export const sampleScenario: ScenarioData = {
  title: "LOTO Safety Procedure — Isolation Verification",
  nodes: [
    {
      id: "step-1",
      title: "Initial Briefing",
      type: "chat",
      persona: "Mike (Control Room)",
      description:
        "Learner speaks with Mike at the control room. Mike would like to get sign-off from Learner.",
      tags: ["Safety Compliance", "Situational Awareness"],
      flowType: "conditional",
      decisionPoints: [
        {
          label: "Ask for isolation list",
          trigger: "user",
          branches: [
            { label: "Isolation list requested", targetNodeId: "step-2", type: "success" },
          ],
        },
        {
          label: "Ask for action",
          trigger: "user",
          branches: [
            { label: "Previous steps correct", targetNodeId: "step-4", type: "success" },
            { label: "Skipped verification", targetNodeId: "step-3", type: "failure" },
          ],
        },
      ],
      branches: [],
      position: { x: 60, y: 80 },
    },
    {
      id: "step-2",
      title: "Document Walkthrough",
      type: "document",
      persona: "Learner",
      description:
        "Learner reviews the Isolation List checklist. Final check is missing — must spend ≥1 min reviewing.",
      tags: ["Risk Assessment", "Documentation"],
      flowType: "gated",
      decisionPoints: [
        {
          label: "Clicks on the document",
          trigger: "user",
        },
        {
          label: "Clicks escape on the document",
          trigger: "user",
          branches: [
            { label: "Review complete (≥1 min)", targetNodeId: "step-3", type: "default" },
          ],
        },
        {
          label: "Radio interruption",
          trigger: "system",
          branches: [
            { label: "Interruption triggers", targetNodeId: "step-3", type: "default" },
          ],
        },
      ],
      branches: [],
      position: { x: 420, y: 80 },
    },
    {
      id: "step-3",
      title: "Verification Interruption",
      type: "radio",
      persona: "Tom (Machinery)",
      description:
        "Tom calls via radio requesting sign-off to start work. Learner must refuse and ask Tom to verify Zero Energy gauge.",
      tags: ["Decision Making", "Communication"],
      flowType: "conditional",
      decisionPoints: [
        {
          label: "Ask to verify the zero energy checklist",
          trigger: "user",
          branches: [
            { label: "Asked for gauge reading", targetNodeId: "step-4", type: "success" },
            { label: "Signed off prematurely", targetNodeId: "outcome-explosion", type: "failure" },
          ],
        },
      ],
      branches: [],
      position: { x: 780, y: 80 },
    },
    {
      id: "step-4",
      title: "Final Validation & Sign-off",
      type: "chat",
      persona: "Mike (Control Room)",
      description:
        "Learner re-opens Mike's channel and pulls up the Isolation List to perform the official sign-off.",
      tags: ["Administrative", "Sign-off"],
      flowType: "gated",
      decisionPoints: [
        {
          label: "Opens document",
          trigger: "user",
        },
        {
          label: "Signs off",
          trigger: "user",
          branches: [
            { label: "Sign-off complete", targetNodeId: "outcome-success", type: "success" },
          ],
        },
      ],
      branches: [],
      position: { x: 1140, y: 80 },
    },
    {
      id: "outcome-success",
      title: "Safe Operation",
      type: "video",
      description:
        "Cutscene showing safe pressure release. Isobutane releases safely, work proceeds as planned.",
      tags: ["Safety Procedure"],
      flowType: "linear",
      outcome: "success",
      branches: [],
      position: { x: 1500, y: 80 },
    },
    {
      id: "outcome-explosion",
      title: "Explosive Release",
      type: "video",
      description:
        "Cutscene showing catastrophic failure. Explosive isobutane release occurs due to incomplete isolation.",
      tags: ["Critical Failure"],
      flowType: "linear",
      outcome: "failure",
      branches: [],
      position: { x: 1500, y: 520 },
    },
  ],
};
