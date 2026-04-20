# MockConnect

MockConnect is a **networking practice simulator**: you set a target profile and job context, run a live AI conversation, then review structured feedback so you can rehearse before real chats. It is aimed at anyone who wants a low-pressure way to practice professional networking.

## What you can do

- **Sign in** with a display name (stored locally in the browser).
- **Dashboard** — start a new session and browse past practice runs.
- **Setup** — describe the person or role you are networking toward and optional job context; pick a conversation persona.
- **Simulation** — a live session powered by **Google Gemini** (requires an API key).
- **Feedback** — scores and notes; you can **retry** a run with adjustments from prior feedback.

## Tech stack

| Area | Choice |
| --- | --- |
| UI | React 19, TypeScript, Tailwind CSS 4 |
| Build | Vite 6 |
| Routing | React Router 7 |
| AI | `@google/genai` (Gemini) |
| Charts | Recharts |

## Prerequisites

- **Node.js** (current LTS is fine)
- A **Gemini API key** from [Google AI Studio](https://aistudio.google.com/apikey)

## Run locally

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Configure the API key**

   Create a file named `.env.local` in the project root:

   ```bash
   GEMINI_API_KEY=your_key_here
   ```

   Vite loads this variable at build/dev time. **Restart** `npm run dev` after changing `.env.local`.

3. **Start the app**

   ```bash
   npm run dev
   ```

   The dev server listens on **port 3000** by default (see `vite.config.ts`): open `http://localhost:3000`.

## Other commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Development server with hot reload |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Typecheck with `tsc --noEmit` |

## Troubleshooting

- **“Missing Gemini API key”** — ensure `.env.local` exists in the repo root, contains `GEMINI_API_KEY=...`, and you restarted Vite.
- **Live session errors** — confirm the key is valid, billing/API access is enabled for Gemini, and your network can reach Google’s API.

## Origin and how it was built

The first version came from [Google AI Studio](https://ai.studio/apps/911483f8-c04a-49d4-863a-ce8f19ff54e5). Everything since then has been **vibe coding**—iterative, AI-assisted work in Cursor without a formal spec or design doc. The **system prompt** used for the simulation is the one part that was **edited manually** so behaviour stays intentional and reviewable.
