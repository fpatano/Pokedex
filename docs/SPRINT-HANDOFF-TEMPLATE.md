# Sprint Handoff Template

Use this at the end of each sprint.

- **Prepared By:**
- **Generated At (America/Chicago):**
- **Test Link (Codespaces forwarded URL):**
- **Commit SHA:**
- **Test Scope (what Frank should validate):**
- **Known Issues / Risks:**
- **Expiration / Refresh Note:** (e.g., "Codespace may sleep; ping me to refresh link")

## Mobile Test-Link Artifact (copy/paste)

- **Feature Flag State:** `ENABLE_RECOMMENDATIONS=<0|1>`, `RECOMMENDATIONS_KILL_SWITCH=<0|1>`
- **Scenario 1 (Guided Builder):** Open app → choose type/goal/min damage → tap **Use Builder Query** → verify query auto-fills and results update.
- **Scenario 2 (Optimization Copy):** Verify optimization panel shows actionable recommendation text and **Apply** buttons.
- **Scenario 3 (Card Clarity Modal):** Tap a result card → verify modal shows set/type/HP/ability/attacks clearly → close modal.
- **Scenario 4 (Kill Switch):** Set `RECOMMENDATIONS_KILL_SWITCH=1` and confirm recommendation issuance is disabled.
- **Pass/Fail + Notes:**

