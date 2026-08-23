# 🎬 FrameCraft Studio — Video Editing Queue

A sleek full-stack app for managing video editing requests. Clients join a queue, get email updates at every stage, and rate the result — all from a beautiful dark-themed dashboard.

![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-4.x-000?logo=express&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-DB-003B57?logo=sqlite&logoColor=white)

## ✨ Features

- **Request Form** — clients fill name, phone, email and describe their video. Suggestion pills for quick type selection.
- **Live Queue** — public page showing who's up next (names masked for privacy). Auto-refreshes every 15s.
- **Admin Dashboard** — password-protected. Stats, top video types bar chart, request management with search/filter, toast notifications.
- **3-Stage Email Notifications** — all sent from your own Gmail:
  1. 📩 **Acknowledgement** — "You're #N in the queue"
  2. 🔥 **Editing Started** — "We're working on your video"
  3. 🎉 **Completed + Rating** — 3 emoji tap-to-rate (😐 😃 🤩)
- **Emoji Ratings** — clients rate via email link; ratings show on your dashboard.
- **No build step** — plain HTML/CSS/JS + Express. Deploy and go.

## 🚀 Quick Start

### 1. Install
Requires **Node.js 18+**.
```bash
cd video-queue-app
npm install
cp .env.example .env
```

### 2. Configure `.env`
Open `.env` and fill in:

| Variable | What to put |
| :--- | :--- |
| `ADMIN_PASSWORD` | Password for `/admin.html` |
| `SECRET` | Any random string (signs rating links) |
| `SMTP_USER` | Your Gmail (e.g. `mohdsinan707@gmail.com`) |
| `SMTP_PASS` | Gmail **App Password** (not your regular password) |
| `APP_URL` | Your live URL once deployed |
| `AVG_TURNAROUND_HOURS` | Hours per video (shown as ETA in emails) |

**Getting a Gmail App Password:**
1. Turn on **2-Step Verification** on your Google account
2. Go to https://myaccount.google.com/apppasswords
3. Create an app password → copy the 16-character code into `SMTP_PASS`

### 3. Run locally
```bash
npm start
```
Visit:
- `http://localhost:3000` — Submit a request
- `http://localhost:3000/queue.html` — View the queue
- `http://localhost:3000/admin.html` — Admin dashboard

Data is stored in a local SQLite file (`queue.db`).

## 🚂 Deploy to Railway

1. Push this repo to GitHub
2. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**
3. Add environment variables in Railway's **Variables** tab (copy from your `.env`)
4. Optionally add a **Volume** mounted at `/app/queue.db` for database persistence
5. Railway will auto-detect Node.js and run `npm start`
6. Once deployed, update `APP_URL` in Railway's variables to your live Railway URL

> **Note:** Railway's free trial gives you $5 of usage. After that, the Hobby plan is $5/month.

## 📁 Project Structure

```
video-queue-app/
├── server.js          # Express API server
├── db.js              # SQLite database setup
├── mailer.js          # Email templates (ack, started, completion)
├── package.json
├── .env.example       # Environment config template
├── .gitignore
└── public/
    ├── index.html     # Request form (client-facing)
    ├── queue.html     # Live queue display
    ├── admin.html     # Admin dashboard
    ├── rate.html      # Emoji rating page
    └── style.css      # Design system (dark glass theme)
```

## 🎨 Customization

- **Video type suggestions** — edit the suggestion pills in `index.html`
- **Brand name** — change "FrameCraft Studio" in the HTML files and `FROM_NAME` in `.env`
- **Email templates** — modify `mailer.js` to change the email design
- **Colors** — all CSS variables are in `:root` in `style.css`

## 📝 Notes

- The public queue only shows `requested` and `in_progress` items — completed ones drop off
- Delete button permanently removes a request (no email sent)
- Rating links are cryptographically signed — can't be faked
- Everything runs on a single Express server — no external databases needed
