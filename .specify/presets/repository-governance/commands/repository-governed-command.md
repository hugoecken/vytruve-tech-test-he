---
description: "Run a Spec Kit phase under repository-local agent guidance"
---

## Repository Guidance Preflight

Before following the upstream command below:

1. Read `AGENTS.md` and every repository skill, policy, overlay, source, or runbook it routes for the requested Spec Kit
   phase and affected boundary.
2. Treat Spec Kit artifacts as subordinate to the repository's selected specification, task, dependency, priority,
   assignment, scope, review, and release authorities. Local files, branch names, and conversation state do not
   replace those authorities.
3. Require every repository-defined claim, scope lock, specification binding or no-spec declaration, planning gate,
   source gate, and validation policy before writing.
4. Fail closed when a required authority, binding, approval, dependency, source decision, lock, or validation rule is
   missing or ambiguous. Return to the owning authority instead of inventing a value.
5. Use the repository's real paths, tools, applications, contracts, documentation, and design coordinates selected by
   its guidance. Do not infer a generic layout from upstream examples.
6. Do not mutate Git branches, external task state, pull requests, review state, merge state, or releases unless the
   repository guidance explicitly delegates that operation to this phase.
7. Treat local active-feature selection as workstation state unless repository guidance explicitly defines otherwise.

{CORE_TEMPLATE}

## Repository Guidance Completion Guard

Before reporting completion, verify that every changed path is within the repository-defined scope, that no generated
core Spec Kit file was edited by hand, and that the result identifies the next canonical repository gate without
changing operational state itself.
