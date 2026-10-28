# Skills provenance

Official instruction files were downloaded and read directly before implementation; no third-party installer scripts were executed. They are agent instructions, not shipped runtime dependencies. The `npx skills add` manager was not installed or claimed as active.

Consulted and applied:

- [Anthropic frontend-design](https://github.com/anthropics/skills/tree/main/skills/frontend-design): deliberate visual direction, neon color tokens, arcade type, court-led composition and screenshot critique.
- [Anthropic webapp-testing](https://github.com/anthropics/skills/tree/main/skills/webapp-testing): real headless Chromium, DOM inspection, screenshots and browser error checks. TypeScript Playwright tests use its supported runner rather than the reference Python wrapper.
- [obra test-driven-development](https://github.com/obra/superpowers/tree/main/skills/test-driven-development), including writing-good-tests: initial red physics and protocol tests, real simulation and WebSocket assertions before implementation.
- [obra verification-before-completion](https://github.com/obra/superpowers/tree/main/skills/verification-before-completion): actual test, lint, type and build evidence before delivery.
- [Vercel React best practices](https://github.com/vercel-labs/agent-skills/tree/main/skills/react-best-practices): lazy-load Phaser, isolate the frame loop from React renders, use refs for frequent network state.
- [Vercel web-design-guidelines](https://github.com/vercel-labs/agent-skills/tree/main/skills/web-design-guidelines) and current web-interface-guidelines: accessible names, focus indication, input labels, reduced motion, responsive layout and skip navigation.

`vercel-labs/open-agents/main/skills/web-animation-design/SKILL.md` returned HTTP 404. That skill was not installed or used. Transitions use explicit transform/opacity changes and honor reduced motion independently.

The cloud environment onboarding and runtime skills were also used for setup, safe network configuration, validation and reusable start instructions.
