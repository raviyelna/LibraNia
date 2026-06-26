---
name: agent-verification
description: Use when researching a complex topic that needs multi-angle deep analysis with cross-validation — "research X thoroughly", "spawn agents to research X", "get multiple perspectives on X", or any research task where a single pass would miss technical, competitive, practical, business, and risk blind spots. Also use when the user asks to verify or fact-check a research document using subagents.
---

# Agent Verification

## Overview

Five specialized agents research a topic from independent angles in parallel. A sixth conflict-resolution agent then reads all five outputs plus the original source, finds every conflict, re-validates each one against authoritative sources, deletes unconfirmable claims, and writes the final research report.

**Core principle:** Independent parallel research catches what a single agent misses. The conflict pass is mandatory — parallel agents will contradict each other, and those contradictions surface real ambiguity in the source material.

---

## When to Use

- User wants deep, multi-angle research on any topic
- A research note needs independent verification before being treated as authoritative
- You have an existing research document and want to stress-test its claims
- The topic is technical, competitive, or regulatory enough that single-agent research will have blind spots

---

## Phase 1 — Dispatch 5 Parallel Research Agents

Dispatch all five in a **single message** so they run concurrently. Each agent gets:
- The topic and all available source material (note IDs, URLs, raw text)
- A single assigned angle — do not let angles overlap
- A specific output target (LibraNia note ID to create/update, or scratchpad file)
- A clear instruction: cite claims with sources; flag anything unconfirmed explicitly

### The 5 Angles

| Agent | Angle | Focus |
|---|---|---|
| 1 | **Technical / Architecture** | How it works: APIs, integrations, data flows, supported platforms, version constraints, infrastructure |
| 2 | **Competitive / Comparative** | Market landscape: direct competitors, feature matrix, pricing comparisons, analyst positioning, category context |
| 3 | **Practical / Implementation** | Real-world usage: developer/operator workflows, CI/CD integration, tooling, scan times, friction points, false positive handling |
| 4 | **Business / Commercial** | Economics: pricing models, ROI evidence, compliance framework support, enterprise readiness, procurement, CISO pitch |
| 5 | **Critical / Risk** | What can go wrong: gaps, limitations, unverified claims, failure modes, lock-in, security of the tool itself, community skepticism |

### Agent Prompt Template

Brief each agent with this structure (adapt per angle):

```
You are a [ANGLE] research agent. Your task: research [TOPIC] from the [ANGLE] angle only.

Source material: [note IDs / URLs / raw content]

Your deliverables:
1. Read the source material first.
2. Do targeted web searches to go deeper on your specific angle.
3. For every factual claim, note whether it is CONFIRMED (official source), INFERRED (logical deduction), or UNCONFIRMED (not found in sources). Label each explicitly.
4. Write your findings to [LibraNia note ID / scratchpad path].

Constraints:
- Stay within your angle. Do not duplicate other agents' work.
- Do not speculate without labeling it as such.
- Do not summarize the source material — add depth beyond it.
- Return a one-paragraph summary of your top 3 findings when done.
```

---

## Phase 2 — Wait for All 5 Agents

All five agents must complete before proceeding. Do not dispatch the conflict agent until all five have returned.

Collect from each agent:
- The note ID or file path where they stored findings
- Their one-paragraph summary of top findings
- Any explicit flags they raised about unconfirmed claims

---

## Phase 3 — Dispatch the Conflict Resolution Agent

After all five complete, dispatch a single conflict-resolution agent with:
- The original source note (ID or content)
- All 5 agent output notes (IDs or paths)
- The full conflict-check mandate below

### Conflict Agent Mandate

```
You are a conflict-resolution and fact-checking agent.

You have access to:
- Original source note: [ID/content]
- Agent 1 output (Technical): [ID/path]
- Agent 2 output (Competitive): [ID/path]
- Agent 3 output (Practical): [ID/path]
- Agent 4 output (Business): [ID/path]
- Agent 5 output (Critical): [ID/path]

Your task in order:

STEP 1 — READ ALL 6 DOCUMENTS
Read every note in full before doing anything else.

STEP 2 — FIND ALL CONFLICTS
Check for conflicts of these types:
- Agent vs Agent: two agents make contradictory factual claims
- Agent vs Source: an agent's claim contradicts the original source
- Internal: a single note contradicts itself within its own body
- Omission conflict: one agent includes a fact another agent explicitly denies

List every conflict as:
  Conflict N: [Type] — "[Claim A from Source X]" vs "[Claim B from Source Y]"

STEP 3 — RE-VALIDATE EACH CONFLICT
For each conflict:
1. Search the most authoritative source for that type of claim (official docs, product pages, primary sources).
2. Determine: CONFIRMED TRUE / CONFIRMED FALSE / UNCONFIRMABLE.
3. For UNCONFIRMABLE: mark for deletion. Do not keep speculative claims dressed as facts.
4. For CONFIRMED TRUE/FALSE: document which source resolves it and how.

STEP 4 — WRITE THE FINAL RESEARCH REPORT
Write one single cohesive research report that:
- Integrates confirmed findings from all 5 agents and the original source
- Removes every unconfirmable claim
- Corrects every confirmed-false claim
- Is written as a research blog (flowing prose with structured sections), not a bullet dump
- Includes a "Conflicts Resolved" section at the end listing what was changed and why

Write the final report to [destination note ID].

Return a structured summary: N conflicts found, N resolved, N deleted, and a one-line description of each.
```

---

## Phase 4 — Review the Final Report

After the conflict agent completes:
1. Read the "Conflicts Resolved" section to verify the agent did the work
2. Spot-check 2–3 of the most important factual claims against the cited sources
3. If the conflict agent missed obvious contradictions, send it back with specific conflicts to re-examine

---

## Output Structure (Final Report)

The final report should flow as:

1. **Introduction** — why this topic matters, research scope
2. **What it is** — core concept, how it works, platform status
3. **Technical architecture** — integrations, supported environments, APIs
4. **Workflow** — step-by-step operational flow (diagram if appropriate)
5. **Capability deep dives** — one section per major capability
6. **Practical integration** — how teams actually use it, tooling, workflows
7. **Competitive landscape** — market context, head-to-head comparisons, matrix
8. **Business case** — pricing, ROI, compliance, enterprise features
9. **Critical assessment** — confirmed gaps, real risks, who should not use it
10. **Verdict** — clear guidance on who should use it now vs wait
11. **Conflicts Resolved** — what the conflict agent changed and why

---

## Common Mistakes

| Mistake | Fix |
|---|---|
| Dispatching conflict agent before all 5 finish | Wait for all five — partial input produces partial conflict detection |
| Letting agents overlap angles | Assign angles strictly; overlap creates redundancy not depth |
| Skipping the conflict step because "agents probably agree" | They will contradict each other. Always run the conflict pass. |
| Conflict agent appends rather than rewrites | The final report must be one clean document, not 6 appended sections |
| Accepting "unconfirmable" claims in the final report | If the conflict agent cannot find an authoritative source, the claim is deleted |
| Not reading the Conflicts Resolved section | That section is your audit trail — always read it |

---

## Adapting for LibraNia

When research is stored in LibraNia:
- Have each research agent create a new note with `create_note` and return the note ID
- Pass all 6 note IDs (5 agents + original) to the conflict agent
- Have the conflict agent write the final report with `update_note` on the main/primary note
- After completion, the 5 agent notes can be kept as reference or archived

## Adapting for File-Based Research

When research lives in files:
- Have each agent write to a named scratchpad file (e.g. `agent1-technical.md`)
- Pass all file paths to the conflict agent
- Conflict agent writes the final report to a specified output file
