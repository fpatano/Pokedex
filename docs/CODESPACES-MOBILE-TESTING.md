# Codespaces Mobile Testing Guide

Use this when handing off a sprint build for Frank to test on mobile.

## 1) Open this repo in Codespaces

1. In GitHub, open the repository page.
2. Click **Code** → **Codespaces**.
3. Create a new codespace (or resume an existing one).
4. Wait for setup to finish (`npm install` runs from devcontainer post-create).

## 2) Run the app in Codespaces

From the Codespaces terminal:

```bash
npm run dev:cloud
```

This binds Next.js to `0.0.0.0:3000`, which is required for remote/mobile access.

## 3) Share a mobile test link

1. Open the **Ports** tab in Codespaces.
2. Confirm port **3000** is forwarded.
3. Set visibility on port 3000 to **Public** (or org policy equivalent that Frank can access).
4. Copy the forwarded HTTPS URL for port 3000.
5. Send that URL in the sprint handoff.

## 4) Caveats

- **Codespace sleep:** idle codespaces can stop/sleep; the link will fail until resumed.
- **Link lifecycle:** forwarded URLs can rotate after restart/rebuild/new codespace.
- **Always re-verify link** right before handoff and include a refresh note.

## 5) Security Notes (required)

- A **Public** forwarded port URL is internet-reachable, not just visible to Frank.
- Do **not** expose secrets, admin routes, debug endpoints, or sensitive sample data.
- Share test links only in private/restricted channels.
- After the testing window, switch port visibility back to private (or stop the codespace).
- If a link is accidentally shared broadly, rotate/regenerate by restarting the app/codespace and share the new URL only to intended testers.
