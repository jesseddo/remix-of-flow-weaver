import { ScenarioData } from "@/types/scenario";

export const sampleScenario: ScenarioData = {
  title: "LOTO Safety Procedure — Isolation Verification",
  scenarioNode: {
    id: "scenario-main",
    title: "Isolation Verification Procedure",
    description: "Complete the lockout/tagout safety procedure with proper verification steps",
    position: { x: 60, y: 80 },
    steps: [
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
          },
          {
            label: "Ask for action (skip verification)",
            trigger: "user",
            connections: [
              { label: "Proceeding without proper verification", targetNodeId: "outcome-explosion", type: "failure" },
            ],
          },
        ],
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
          },
          {
            label: "Radio interruption",
            trigger: "system",
          },
        ],
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
            label: "Sign off without verification",
            trigger: "user",
            connections: [
              { label: "Approved work without zero energy confirmation", targetNodeId: "outcome-explosion", type: "failure" },
            ],
          },
        ],
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
            connections: [
              { label: "Sign-off complete", targetNodeId: "outcome-success", type: "success" },
            ],
          },
        ],
      },
    ],
  },
  outcomeNodes: [
    {
      id: "outcome-success",
      title: "Safe Operation",
      type: "video",
      description:
        "Cutscene showing safe pressure release. Isobutane releases safely, work proceeds as planned.",
      tags: ["Safety Procedure"],
      outcome: "success",
      position: { x: 800, y: 80 },
    },
    {
      id: "outcome-explosion",
      title: "Explosive Release",
      type: "video",
      description:
        "Cutscene showing catastrophic failure. Explosive isobutane release occurs due to incomplete isolation.",
      tags: ["Critical Failure"],
      outcome: "failure",
      position: { x: 800, y: 520 },
    },
  ],
};
