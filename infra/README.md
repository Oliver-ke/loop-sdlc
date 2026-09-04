# infra

Terraform for the demo's sandbox AWS account (S3 + CloudFront + a Budgets alarm).

Built in Plan 2 (Phase 3). Two rules that never change:

- The agent may edit these files and run `terraform plan`. It may **never** run `terraform apply`.
- Apply happens from a GitHub Environment with a required human reviewer, using credentials
  that are separate from (and broader than) the read-only credentials `plan` uses.

This directory is a protected path: `harness/src/protected.mjs` lists `infra/`, and the
`pr-rules` CI job fails any bot-authored pull request that touches it.
