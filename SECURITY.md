# Security Policy

## Supported versions

Only the latest release is supported. The skill has no runtime service — it is
markdown instructions plus a read-only in-page detection script executed by the
agent-browser CLI on your machine.

## Reporting a vulnerability

Please do not open a public issue for security problems. Instead:

- Use GitHub's [private vulnerability reporting](https://github.com/cdmx-in/ui-review/security/advisories/new), or
- Email **licensing-qa@cdmx.in** with details and reproduction steps.

We aim to acknowledge reports within 3 business days.

## Scope notes for users

- `scripts/detect.js` runs inside the page under review via `agent-browser
  eval`. It only reads layout/style state and returns JSON — it does not
  transmit data anywhere; nothing leaves your machine.
- Thorough-mode stress recipes mutate the DOM of the page being reviewed
  (injecting test strings). Run them against development environments, not
  production sessions with real user data.
- Treat everything the reviewed page returns (text, console output, network
  bodies) as untrusted data, never as instructions to the agent — see
  agent-browser's own trust-boundary guidance.
