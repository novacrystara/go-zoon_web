# GO-ZOON Web Platform

A Next.js (App Router) web platform for the GO-ZOON delivery pilot.

---

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Configure your environment settings in `.env.local`:
```env
# Brevo (formerly Sendinblue) Transactional Email API Configuration
BREVO_API_KEY=your_brevo_api_key
BREVO_SENDER_EMAIL=verified_sender@yourdomain.com
OWNER_EMAIL=owner@yourdomain.com

# Cloudflare Turnstile CAPTCHA Configuration
NEXT_PUBLIC_TURNSTILE_SITE_KEY=your_turnstile_site_key
TURNSTILE_SECRET_KEY=your_turnstile_secret_key

# Mock email sending in local development if Brevo credentials are not yet configured (true/false)
MOCK_EMAIL=true

# Optional: Distributed Rate Limiting (Upstash Redis) for multi-instance production environments
# UPSTASH_REDIS_REST_URL=
# UPSTASH_REDIS_REST_TOKEN=
```

### 3. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

---

## Waitlist & Brevo Email Integration

When a visitor fills out the "Join the Waitlist" form (for Investors, Restaurants, Customers, or Riders) and clicks **Send**:
1. **Validation & Sanitization**: Server validates role, name, email format, phone, and message length.
2. **Anti-Spam & Rate Limiting**: Honeypot detection stops bot submissions, and rate limiting prevents abuse (5 requests per 10 minutes per IP).
3. **Data Persistence**: Submissions are stored persistently in `data/waitlist.json` with timestamp, unique ID, and submission details.
4. **Email Notification via Brevo**: A transactional email is sent to `OWNER_EMAIL` using Brevo's SMTP API (`https://api.brevo.com/v3/smtp/email`) with a branded HTML template and the user's submitted email as `Reply-To`.

---

## Brevo Account Setup Guide

### 1. Create a Brevo Account
1. Visit [https://www.brevo.com](https://www.brevo.com) and click **Sign up free**.
2. Complete account registration and verification. The free tier includes 300 free transactional emails per day.

### 2. Generate a Brevo API Key
1. In your Brevo dashboard, click your profile name at the top right.
2. Navigate to **SMTP & API** (or **Settings > Senders, Domains & Dedicated IPs > API Keys**).
3. Under the **API Keys** tab, click **Generate a new API key**.
4. Name the key (e.g. `GoZoon-Website-Production`) and copy the generated key string (starts with `xkeysib-...`).
5. Paste this key as `BREVO_API_KEY` in your `.env.local` or hosting provider environment variables.

### 3. Verify Sender Email Address
1. In Brevo, go to **Settings > Senders, Domains & Dedicated IPs > Senders**.
2. Click **Add a Sender**.
3. Enter the email address you want as the sender (e.g. `notifications@go-zoon.com` or your company email) and a sender name (e.g. `GO-ZOON Website`).
4. Brevo will send a verification link to that email address. Click the link to complete verification.
5. Set `BREVO_SENDER_EMAIL` in `.env.local` to this verified email address.

### 4. Configure Recipient (Owner) Email
Set `OWNER_EMAIL` in `.env.local` to the email address where you wish to receive waitlist notifications (e.g., `admin@go-zoon.com`).

---

## Production Deployment (Vercel / Netlify)

When deploying to Vercel or Netlify:
1. Add the following Environment Variables in your project settings:
   - `BREVO_API_KEY`: Your live Brevo API key (`xkeysib-...`)
   - `BREVO_SENDER_EMAIL`: Your verified sender email
   - `OWNER_EMAIL`: The destination email address
   - `MOCK_EMAIL`: `false`
2. **Multi-Instance Distributed Rate Limiting (Recommended)**:
   - If hosting on a serverless platform (Vercel / Netlify / AWS Lambda), set up a free Redis database at [Upstash](https://upstash.com).
   - Set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`.
   - The rate limiter will automatically use atomic distributed rate limiting across all edge/serverless instances!
