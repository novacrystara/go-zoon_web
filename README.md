# GoZoon

GoZoon is a full-stack, multi-app food delivery platform for the UK market — think Deliveroo/Just Eat, built as a single Node.js + React codebase with four dedicated front ends sharing one backend:

- **Customer** — browse UK restaurants by postcode, order food, track deliveries live, manage addresses/promo codes/reviews.
- **Business (Partner Portal)** — restaurant dashboard for managing menus, stock, and incoming orders.
- **Road King** — the delivery rider app: go on/off duty, accept or reject gigs, track earnings.
- **Admin** — approve restaurants and riders, manage promotions, view real finance/order reporting.

## Tech Stack

- **Frontend:** React 19 + Vite 6, TypeScript, Tailwind CSS, Framer Motion
- **Backend:** Express (`server.ts`), running as a Vite middleware server in dev and a bundled Node server in production
- **Data:** PostgreSQL (via `pg`) and Firebase Admin/Firestore, with an in-memory fallback so the app runs without any database configured (useful for local dev/demos)
- **Mobile:** Capacitor wraps the built web app for iOS and Android — see [CAPACITOR_MOBILE_GUIDE.md](CAPACITOR_MOBILE_GUIDE.md)
- **AI:** `@google/genai` (Gemini) integration

## Project Structure

```
server.ts                    # Express API + Vite dev server entrypoint
src/
  App.tsx                    # App shell / routing between the four apps
  api.ts                     # Client-side API layer
  types.ts                   # Shared TypeScript types
  data/restaurants.ts        # Seed restaurant/menu data
  components/
    apps/
      GoZoonCustomer.tsx     # Customer-facing ordering app
      GoZoonBusiness.tsx     # Restaurant partner portal
      GoZoonRoadKing.tsx     # Delivery rider app
      GoZoonAdmin.tsx        # Admin portal
    Header.tsx, PhoneLogin.tsx, LegalModal.tsx, ErrorBoundary.tsx
android/, ios/                # Capacitor native projects
```

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   ```bash
   npm install
   ```
2. Configure environment variables in `.env` / `.env.local` (see [.env.example](.env.example)) — e.g. `GEMINI_API_KEY`, `DATABASE_URL`, Firebase credentials. Without these, the server falls back to in-memory data so it still runs for local development.
3. Run the app:
   ```bash
   npm run dev
   ```
   The app serves at `http://localhost:3000`.

## Build & Deploy

```bash
npm run build   # builds the client (Vite) and bundles the server (esbuild) into dist/
npm start        # runs the production server from dist/server.cjs
```

## Mobile Builds

See [CAPACITOR_MOBILE_GUIDE.md](CAPACITOR_MOBILE_GUIDE.md) for the full guide to packaging the Customer, Business, and Road King apps as native iOS/Android apps via Capacitor.
