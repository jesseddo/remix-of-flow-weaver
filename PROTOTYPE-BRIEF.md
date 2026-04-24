# Prototype Brief: Open-World Scenario Authoring Tool

## Context

This document captures the design direction for a new prototype of the FFL scenario authoring tool. It is informed by team discussions (Shawn, Raymond, Jessy), an engineer's event-model proposal, and observations from a working demo (2026-04-14). The existing prototype lives in this repo (`remix-of-flow-weaver`) and can be referenced for prior data structures, but the new prototype should be built from scratch based on the model below.

Key design conversations are documented in these prior sessions:
- [Authoring tool design](b7aa3ff9-4df3-48db-8f4f-a899232877b8) — original task-accumulation definition, CYOA vs. Resident Evil analysis, step vs. open-world discussion
- [Spec writing session](059a4b16-b397-494f-a3fd-de7b2e0e39f1) — evolution to step-less model, when/then rules, events/actions, world state, environments, meeting prep

---

## Core Mental Model

### One-sentence summary

**The learner acts freely in an open world. The system continuously tracks what they've done. When the accumulated state matches a condition, the world changes.**

### Game analogy (team alignment)

**Resident Evil**, not Zelda (too open, no consequences) or CYOA/text-adventure (too linear, one-choice-at-a-time):

| Resident Evil | This Simulation |
|---|---|
| The mansion | The scenario environments (chat, documents, radio) |
| Your inventory (keys, items, weapons) | Completed tasks (accumulated set) |
| Rooms you can walk between freely | Environments: chat, document folder, radio |
| Pick up shotgun before the ceiling trap | Request isolation list before signing off |
| Mr. X appears after a trigger | Brad radios in after a timer/condition |
| New door opens when you have 3 medallions | Tom shows up when you have list + requested walkdown |
| Multiple endings based on what you did/missed | Red/Yellow/Green outcomes based on task accumulation |

### Why not CYOA

CYOA forces one-choice-at-a-time, single-path structure. The learner picks Option A or B, and that single choice determines where they go. But FFL scenarios require the system to evaluate **which set of things the learner did or didn't do** — not which single choice they made. CYOA can't express "learner did T1 and T3 but not T6." It can only express "learner picked door #2."

**CYOA:** "What did you just choose?"
**Task Accumulation:** "What have you done so far, and what haven't you?"

---

## Architecture: World State + Rules

There are **no steps**. No containers the learner progresses through. No "you are now in Step 2." The learner is just *in the scenario*. The system holds a single evolving **world state** and evaluates **rules** against it continuously.

### World State

The world state is a bag of facts that evolves as the learner acts:

| Fact type | What it tracks | Example |
|---|---|---|
| **Completed tasks** | Binary flags — done or not done | `{ bleeder_valve_checked: true, isolation_list_requested: true }` |
| **Action log** | Timestamped history of repeatable actions | `[ { "entered_control_room", t=30s }, { "entered_control_room", t=120s } ]` |
| **Present personas** | Who is "here" right now | `{ Mike, Tom }` |
| **Available resources** | What documents/items exist in the learner's world | `{ SWC_form, permit }` |
| **Learner location** | Which environment the learner is currently in | `"chat"` or `"documents"` or `"radio"` |
| **Timers** | Time since last event, total elapsed, time since specific task | `{ idle: 45s, elapsed: 180s }` |

There is no "current step" variable. The world just *is*.

### Rules ("When / Then")

The entire scenario is defined as a flat pool of **when/then rules**. The system evaluates all of them, all the time. A rule has two parts:

- **When** — a predicate over the world state (what must be true)
- **Then** — a list of effects that mutate the world state (what happens)

Rules are global, not scoped to steps or containers. Each rule is self-describing — its "when" clause fully specifies the world state it cares about.

#### Example: The SWC scenario as flat rules

```
Scenario: Recommissioning the Bleeder Valve
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

When scenario starts:
  → Mike is present
  → SWC form is available
  → Permit is available
  → Mike says "Welcome to the pre-job briefing..."

When learner requests the isolation list:
  → Isolation list becomes available
  → Mike says "Good call, here it is."

When learner requests walkdown AND has isolation list:
  → Tom becomes present
  → Tom says "Let's start at valve 1."

When learner requests walkdown WITHOUT isolation list:
  → Tom becomes present
  → Tom says "Alright, let's go — though I don't see an isolation list..."

When learner checks bleeder valve AND Tom is present:
  → Mike radios in: "How's it looking out there?"

When learner signs off on SWC AND has NOT done walkdown:
  → Brad radios in: "Hold on — did you actually verify those isolations?"

When nothing happens for 90 seconds:
  → Whoever is present nudges the learner

When learner has completed walkdown AND checked bleeder valve
    AND reviewed SWC AND signed off:
  → Scenario ends → Outcome: Safe Completion (Green)

When learner signs off WITHOUT checking bleeder valve:
  → Scenario ends → Outcome: Incident - Flange Break (Red)

When elapsed time > 10 min AND completed tasks < 2:
  → Scenario ends → Outcome: Coaching Required (Yellow)
```

No steps. No transitions between containers. Just rules that react to the continuously evolving world state.

---

## Key Concepts

### 1. Events: Tasks vs. Actions

Everything observable the learner does is an **event**. Events come in two flavors:

| | Task | Action |
|---|---|---|
| **Metaphor** | Quest / Checkbox | Verb / Behavior |
| **State** | Binary: incomplete → complete | Countable: each occurrence is logged |
| **System cares about** | Whether it happened *at least once* | *Each time* it happens (count, recency) |
| **Accumulation** | Added to the set, stays forever | Logged to history, can be counted |
| **Examples** | "Check bleeder valve", "Request isolation list" | "Enter control room", "Re-read a document" |

**The author doesn't declare the type.** They just write rules. If a rule says "when learner has done X" → the system tracks X as a binary flag. If a rule says "when learner has done X 3 times" → the system tracks count. The system infers tracking strategy from how the rule references the event.

### 2. Conditions (the "When" clause)

Conditions evaluate the world state using combinators:

- **ALL (AND)**: Every listed requirement must be true
- **ANY (OR)**: At least one must be true
- **NONE (MUST NOT)**: None may be true
- **Timer/Inactivity**: Duration-based (`nothing for 90s`, `elapsed > 10min`)
- **Location**: Where the learner currently is (`learner is in chat`, `learner is viewing documents`)
- **Presence**: Who is currently active (`Tom is present`)

These can be combined freely within a single rule's "when" clause.

### 3. Effects (the "Then" clause)

Effects mutate the world state. Types:

| Effect | Description | Example |
|---|---|---|
| **Chat from character** | AI persona delivers a message | Tom says "Let's start at valve 1" |
| **Document available** | A resource appears in the learner's folder | Isolation list PDF becomes accessible |
| **Radio/voice message** | Audio or overlay message | Brad's radio: "How's it going?" |
| **Persona enters/exits** | A character joins or leaves | Tom becomes present for walkdown |
| **Scenario ends** | Routes to an outcome | → Outcome: Safe Completion (Green) |
| **Score update** | Competency points awarded | +2 Safeguard Verification |
| **New events trackable** | Tasks that weren't relevant become active | "Identify discrepancy" task activates |
| **Nudge/scaffold** | In-character hint for stuck learner | Mike: "What's your plan before we proceed?" |

### 4. Environments ("Rooms")

The simulation has distinct environments the learner moves between freely:

| Environment | What it contains | Analogy |
|---|---|---|
| **Chat / mobile phone** | Conversations with present characters | Main hall |
| **Document folder** | SWC, permits, isolation lists, etc. | Item room / storage |
| **Radio** | Incoming calls, interruptions | Radio room |
| Future: **Field locations** | Physical locations (control room, pump, etc.) | Other mansion rooms |

The learner switches between environments at will. No gates. Rules can reference and react to location:

- "When learner opens isolation list in document folder → mark 'reviewed isolation list' as done"
- "When Brad radios in → learner gets pulled to radio environment"
- "When learner has reviewed list AND is in chat with Tom → Tom walks through isolations"

Some tasks are **environment-specific** (checking the bleeder valve requires being in the field). Others are **ambient** (Brad's radio can interrupt anywhere).

### 5. Outcomes (end states)

Outcomes are terminal states with a type:

- **safe_path** (Green): Learner did the critical things right
- **partial_failure** (Yellow): Learner missed some things but not catastrophically
- **critical_failure** (Red): Learner skipped critical safety steps, incident occurs

The outcome reached depends on which tasks the learner accumulated (or didn't) throughout the scenario. Outcomes are just rules whose "then" clause ends the scenario.

### 6. Inactivity Handling (Progressive Scaffolding)

Inactivity isn't a separate system — it's just more rules. But it follows a three-tier escalation pattern:

| Tier | Touch level | What happens | Timing example |
|---|---|---|---|
| **In-character nudge** | Lightest | The active persona says something to unstick the learner. Diegetic, not a system popup. | After 60s idle |
| **Escalating context shift** | Medium | New persona shows up, new info surfaces, environment evolves to make the right action more discoverable | After 180s idle |
| **Accumulation ceiling** | Hardest | Scenario ends with a coaching/incomplete outcome | After 600s idle OR elapsed > 10min with < 2 tasks done |

### 7. Evaluation / Competency Scoring

Evaluation lives at **two levels**:

1. **Rule-level scoring (optional)** — any rule's "then" clause can include a score effect: "When learner requests bleeder check → +2 Safeguard Verification." Captures individual moments of competence.

2. **Outcome-level profile** — each outcome carries an overall competency summary: "Safe Outcome = high Safeguard Verification, high Procedure Adherence." Provides floor/ceiling.

Rule-level scores accumulate throughout. Outcome-level profiles provide the summary. Together they give nuanced evaluation without requiring the ID to score every single task.

Competency catalog (fixed, IDs cannot add in-app):
- Job Planning
- Communication
- Procedure Adherence
- Safeguard Verification

### 8. AI Classification (how tasks get detected)

Each task has two fields:

- **`label`** — Human-readable description (what the author sees in the UI): "Request the isolation list from the crew lead"
- **`chatCriteria`** — The AI classification instruction (what the engine sends to the LLM): "Did the learner request or ask for the isolation list?"

The system sends the `chatCriteria` to the LLM along with recent chat history and gets a yes/no response. If yes, the task is marked complete in the world state.

For most tasks, `label` and `chatCriteria` are nearly identical. The author writes the label and the system can auto-suggest a chatCriteria, or the author can customize it for edge cases.

---

## Authoring Tool UX

### The author's mental model

*"I'm setting up a situation and writing the rules for how it responds to the learner."*

Not drawing a map. Not connecting boxes. Just describing cause and effect.

### Screen layout

**Left panel: World Setup**

A short section where the author defines what exists at the start:
- **Characters** — name, role, description, communication style
- **Resources** — documents, forms, checklists available at scenario start (or made available by rules)
- **Environments** — which rooms exist (chat, documents, radio, field locations)
- **Scenario context** — a brief description the AI uses for overall behavior

**Right panel: Rules List**

A scrollable list of when/then cards. Each card has two fill-in sections:

```
┌─────────────────────────────────────────────┐
│  WHEN  learner requests the isolation list  │
│  THEN  ● Isolation list becomes available   │
│         ● Mike says "Good call."            │
└─────────────────────────────────────────────┘
```

The author adds rules with a button. The "when" side offers structured condition builders (task completed, combination of tasks, inactivity timer, scenario start, location). The "then" side offers effect pickers (character speaks, document available, persona arrives, scenario ends, score update).

### Rule organization

A real scenario might have 40-80 rules. To keep this manageable without reintroducing steps:

- **Tags / Groups** — The author can tag rules with labels like "orientation", "walkdown", "wrap-up" for filtering and collapsing. These are purely organizational — no runtime meaning. Like folders in an email client.
- **Auto-clustering** — The UI can auto-group rules by what they reference (all rules mentioning "isolation list" cluster together, all rules mentioning "Tom" cluster together).

### Preview / Playthrough mode

The author hits Play and gets a simulated chat window:
- They type as the learner
- Rules fire visibly in a sidebar as conditions are met
- World state updates in real time (tasks checked off, personas appearing, documents dropping)
- The author can see *which* rules fired and *why*
- Makes it easy to debug, test edge cases, and verify the scenario works

---

## Three-Layer Architecture

| Layer | What it is | Who sees it | Concern of this prototype |
|---|---|---|---|
| **Authoring model** (world setup, rules, events, effects) | How the ID structures the scenario | ID/SME only | **Yes — this is what we're building** |
| **Runtime engine** (world state tracking, condition evaluation, AI classification, effect execution) | How the system manages the learner experience | Invisible | Not part of this prototype, but the data model must be consumable by it |
| **Learner experience** (continuous chat, documents, radio, environmental changes) | What the learner actually sees and does | Learner only | Not part of this prototype |

The authoring tool produces a JSON scenario definition. The runtime engine (separate system) consumes it. The learner never sees rules, tasks, or conditions — they just chat and the world reacts.

---

## Reference Scenario

The existing `scenarios-script.json` in this repo contains a well-structured example (Module 2, "Safeguard Verification: Isobutane Pump") with:
- 5 active scenes + 1 interruption + 3 outcomes
- Tasks with prerequisites and AI classification labels
- Paths with ALL/ANY/NONE conditions
- Global timer for interruption
- Multiple characters (Mike, Tom, Brad, Coach)
- Documents (PTW, SWC, LOTO isolation list)

Use this as the reference scenario to rewrite as flat rules for the prototype. The content is correct; the structure needs to be transformed from step-based to rule-based.

### How the reference maps to the new model

| Old (step-based) | New (rule-based) |
|---|---|
| Scene `A1_Orientation` with tasks T3-T6 | Tasks exist globally. Rules fire when T3/T4/T5/T6 are completed. |
| Path `{ all: [T3, T4] } → A2B` | Rule: "When T3 AND T4 → Tom becomes present, says 'Let's start at valve 1'" |
| Path `{ all: [T5], none: [T3] } → A2A` | Rule: "When T5 AND NOT T3 → Tom becomes present, says 'I don't see an isolation list...'" |
| Path `{ all: [T6], none: [T4, T5] } → A3` | Rule: "When T6 AND NOT T4 AND NOT T5 → skip to SWC dialogue context" |
| GlobalTimer → `I1_Interruption` | Rule: "When elapsed > 120s → Brad radios in requesting pump start" |
| Outcome `O1_Safe` | Rule: "When walkdown AND bleeder AND SWC reviewed AND signed off → Outcome: Green" |
| "Stuck" (no tasks done) | Rule: "When nothing for 90s → Mike nudges" + "When elapsed > 10min AND tasks < 2 → Outcome: Coaching" |

---

## Open Questions

1. **Rule evaluation order**: When multiple rules match simultaneously, which fires first? All of them? First match wins? Priority ordering?
2. **Rule chaining**: A rule's effects can change the world state, which may cause other rules to match. How deep does chaining go? Is there a risk of infinite loops?
3. **Action tracking depth**: For repeatable actions, how much history does the system keep? Last N occurrences? Time-windowed? Everything?
4. **AI classification reliability**: How do we handle false positives/negatives? Should the system ask for confirmation, or classify and move on?
5. **Environment extensibility**: Are chat/documents/radio fixed, or can the ID define custom environments (field locations, control room, etc.)?
6. **Rule conflict resolution**: What if two rules have contradictory effects (one says "Tom enters", another says "Tom exits") that both match?
7. **Authoring at scale**: For large scenarios (80+ rules), what organizational patterns keep the authoring experience manageable beyond tags/groups?
8. **Data format**: What does the JSON output look like? Needs to be consumable by the runtime engine team.
