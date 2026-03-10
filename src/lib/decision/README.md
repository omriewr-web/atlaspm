# AtlasPM Decision Engine v1

This package contains a rule-based decision engine derived from `OMRI_OPERATING_PLAYBOOK.md`.

## Included modules

- Vacancy alerts and suggestions
- Collections / legal escalation suggestions
- Violation priority suggestions
- Work-order routing suggestions
- Move-out charge rules
- Owner summary generator

## Usage

Import `runDecisionEngine` and pass current operational records. The engine returns structured suggestions that can power:

- dashboard alerts
- PM review queues
- owner monthly summaries

## Important

This engine is suggestion-first. It should not auto-execute critical actions without PM review.
