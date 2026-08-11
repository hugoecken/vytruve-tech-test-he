# Specification-Driven Development

Read this reference before authoring, accepting, deriving, claiming, implementing, reviewing, or releasing work
governed by GitHub Spec Kit.

## Repository Contract

The repository router and profile must select:

- the repository instruction authority and Spec Kit constitution;
- the feature-specification, technical-plan, supporting-design, and derived-task locations;
- the specification-acceptance and execution authority;
- the exact immutable binding and no-spec schemas;
- the integration authority used to prove that accepted intent is available;
- the accepted requirement and success-criterion identifier formats;
- the feature-persistence model and artifact language; and
- the repository-specific validation and conformance evidence.

Fail closed when any selected authority, integration, artifact, mechanism, or value is missing or ambiguous. This
portable policy never supplies repository identities, paths, branches, commands, versions, providers, ports, design
identifiers, or project-specific taxonomy.

## Authority Boundaries

- The repository instruction authority governs every agent. The Spec Kit constitution is a concise adapter and may
  neither override nor duplicate that authority.
- The accepted `spec.md` owns future observable intent: user outcomes, scenarios, functional requirements, success
  criteria, boundaries, and assumptions.
- The corresponding `plan.md` owns the technical translation of that exact accepted intent, subject to current
  architecture, contracts, source gates, and repository policies.
- Supporting research, data models, design contracts, and quickstarts explain the plan. They never replace a current
  source contract, delivered runtime authority, or accepted requirement.
- `tasks.md` is a derived, dependency-ordered implementation checklist for one feature. It never owns authorization,
  priority, assignment, dependencies, scope, delivery state, or completion.
- The repository-selected execution item owns those operational decisions and every work reservation.
- Current contracts, source code, and tests remain the authority for delivered behavior until an accepted change is
  integrated.
- Review evidence proves conformance only for the exact implementation head it names. Specification acceptance,
  planning approval, implementation review, and release authorization remain separate decisions.

No generated artifact, local feature selector, conversation state, screenshot, plan, or checklist becomes a parallel
instruction, specification, execution, or delivery authority.

## Bounded Workflow

Establish the constitution once, then use these per-feature phases:

1. Specification authoring records what and why without selecting an implementation.
2. Clarification resolves decision-bearing ambiguity in `spec.md` before technical planning.
3. Technical planning translates the accepted intent into the repository's real architecture and sources.
4. Task derivation creates a bounded checklist from the specification and plan.
5. Consistency analysis checks the artifacts before implementation and reports findings to the artifact that owns the
   correction.

Use a specification checklist only when ambiguity or task risk warrants another requirements-quality gate.
Implementation may begin only after the repository's stable claim, valid specification binding, and applicable human
planning gate all pass. Post-implementation convergence may find missing work, but it does not prove acceptance,
review, delivery, or completion and may not expand scope without the execution authority's visible scope-change
protocol.

When the repository already owns GitFlow and execution tracking, do not enable a Spec Kit Git workflow, convert the
derived checklist into execution items, or maintain Markdown delivery status. Feature selection that exists only to
let Spec Kit resolve a working directory remains local tool state and never reserves work.

## Applicability And Decomposition

Apply the repository's specification-applicability matrix before work becomes executable.

- Work that creates observable product intent requires an accepted Spec Kit feature specification.
- Specification-authoring work identifies the feature artifact it changes without presenting unaccepted content as
  executable intent.
- A no-spec declaration is valid only when the repository authority permits it and its visible reason proves that no
  product, experience, permission, contract, or runtime-architecture decision is being made.
- A rollup is non-executable and has no specification binding.

One independently deliverable execution feature maps to exactly one bounded Spec Kit feature directory. A larger
outcome is decomposed into multiple independently specified execution features under the repository's native rollup.
Never use task identifiers from `tasks.md` as execution-item identifiers.

## Acceptance, Binding, And Change

The repository-selected human acceptance mechanism binds one exact `spec.md` snapshot before execution becomes
ready. The execution item records only:

- one repository-relative specification path combined with one full immutable Git commit; and
- the applicable requirement and success-criterion identifiers resolved in that pinned content.

Do not add a second specification identifier, semantic version, revision counter, supersession ledger, lifecycle
field, or structured approval comment when the immutable Git snapshot and execution authority already own those
concerns.

Before delivery, clarification may create a new candidate snapshot. It replaces an execution binding only after a new
human acceptance and the repository's visible scope-change and conflict checks. After delivery, changed intent starts
a new Spec Kit feature and a new execution feature; the delivered feature directory remains historical evidence.

Changing the specification pin or acceptance set never happens implicitly. It invalidates dependent plans, tasks,
analysis, implementation evidence, and approvals until each affected artifact is reconciled against the new binding.

## Binding Validation

Before claim or implementation, prove all of the following through repository-selected mechanisms:

1. The pinned specification is readable at the immutable commit.
2. The commit is available from the repository's integration authority.
3. The execution item contains the exact repository binding schema and its human acceptance gate passed.
4. Every referenced requirement and success-criterion identifier resolves in the pinned `spec.md`.
5. The feature directory is not already bound to another executable feature.
6. The accepted snapshot is not withdrawn, replaced through a visible execution decision, or stale against a newer
   binding on the same item.
7. The plan and derived checklist, when present, identify and conform to that same accepted snapshot.

Discovery excludes an invalid target. Acquisition and resumed execution stop before editing when validation fails.
Missing integration or generated Spec Kit infrastructure is a blocker, not permission to reconstruct it from
convention.

## Planning And Implementation Gates

A planning-required claim reserves its declared scope but authorizes no task-file edit until the current user approves
the plan. Specification-authoring approval authorizes only its declared specification artifacts. Planning approval
authorizes the bounded technical and derived-task artifacts. Runtime implementation additionally requires the stable
execution claim, valid binding, conflict-free scope, and every repository source gate.

Derived tasks cannot expand the execution workset, create execution items, change priority or dependencies, or mark
the feature delivered. Discoveries outside scope return to the owning specification, plan, or execution item before
work continues.

## Conformance Evidence

For governed work, the current-head review record includes:

- the full implementation head;
- the accepted specification path and immutable commit;
- every applicable requirement and success-criterion identifier;
- the exact plan and task artifacts used; and
- a mapping from each accepted identifier to changed behavior and exact test, runtime, accessibility, visual, or
  other authoritative evidence.

For an allowed no-spec task, the current-head record repeats and challenges the visible no-spec reason. A new
implementation head or accepted specification binding invalidates the affected conformance evidence. Neither form
authorizes release or waives a failed check, unresolved finding, scope violation, or required human decision.
