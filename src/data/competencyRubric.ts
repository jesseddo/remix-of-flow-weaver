export interface CompetencyCriteria {
  id: string;
  text: string;
}

export interface CompetencyEntry {
  /** Matches the simulation API payload, e.g. "C4_Safeguard_Verification" */
  id: string;
  /** Human-readable display name shown in the UI */
  label: string;
  criteria: CompetencyCriteria[];
}

/**
 * Global Chevron FFL competency rubric.
 * Shared by the authoring tool (StepDetailPanel evaluation section) and
 * used to auto-wire competencyId values that match the simulation engine payload.
 *
 * Performance levels used by the engine:
 *   L1 – did not meet criteria
 *   L2 – met some criteria
 *   L3 – met all or most criteria
 */
export const COMPETENCY_RUBRIC: CompetencyEntry[] = [
  {
    id: "C1_Communication",
    label: "Communication",
    criteria: [
      {
        id: "c1-1",
        text: "Asks clarifying questions instead of jumping to conclusions when a procedure isn't followed",
      },
      {
        id: "c1-2",
        text: "Uses three-way communication (call-out, repeat-back, confirm)",
      },
      {
        id: "c1-3",
        text: "Confirms crew awareness of scope and critical steps before authorizing start",
      },
    ],
  },
  {
    id: "C2_Planning",
    label: "Planning",
    criteria: [
      {
        id: "c2-1",
        text: "Reinforces and ensures enough time is allotted for briefing first-time, infrequent, and complex jobs",
      },
      {
        id: "c2-2",
        text: "Recognizes when a job is first-time, infrequent, and complex",
      },
      {
        id: "c2-3",
        text: "Conveys clearly what expectations and priorities are for a team or individual",
      },
      {
        id: "c2-4",
        text: "Recognizes a change in conditions and takes appropriate action",
      },
    ],
  },
  {
    id: "C3_Procedure_Adherence",
    label: "Procedure Adherence",
    criteria: [
      {
        id: "c3-1",
        text: "Verbalizes who to call and what to do when a procedure cannot be followed (use Stop Work Authority)",
      },
      {
        id: "c3-2",
        text: "Identifies error traps and takes correct action to close them",
      },
      {
        id: "c3-3",
        text: "Recognizes a change in conditions and takes appropriate action",
      },
    ],
  },
  {
    id: "C4_Safeguard_Verification",
    label: "Safeguard Verification",
    criteria: [
      {
        id: "c4-1",
        text: "Uses stop-work authority when a safeguard could not be verified",
      },
      {
        id: "c4-2",
        text: "Confirms critical safeguards when conditions change",
      },
      {
        id: "c4-3",
        text: "Verifies the Start Work Check is completed",
      },
      {
        id: "c4-4",
        text: "Reinforces to crew and gives time to perform verification as designed",
      },
    ],
  },
];
