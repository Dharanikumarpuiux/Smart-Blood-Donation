# LifeDrop — Smart Blood Donation & Emergency Response Platform

LifeDrop is a full-stack web platform connecting blood donors, hospitals, and patients in real time with dynamic matching, urgent broadcast alerts, and modern visual effects.

---

## Architecture & Production Deployment

- **Frontend**: Hosted on **Vercel** (Static multi-page web application with optimized routing and visual effects layer).
- **Backend**: Hosted on **Render** as a persistent Node.js/Express Web Service.
- **Database**: **MongoDB Atlas** (Cloud-hosted M0 cluster with Mongoose ODM).

---

## 1. Environment Variables Configuration

### Backend (Render Dashboard)
Set these in your Render Web Service dashboard under **Environment**:

| Variable | Description | Example / Required Value |
| :--- | :--- | :--- |
| `NODE_ENV` | Runtime environment mode | `production` |
| `PORT` | Web service listening port | `5000` |
| `MONGODB_URI` | MongoDB Atlas cluster connection string | `mongodb+srv://<user>:<password>@cluster.mongodb.net/blood-donation?retryWrites=true&w=majority` |
| `JWT_SECRET` | Secure cryptographic secret for signing JWT auth tokens | `<generate-64-character-random-hex-key>` |
| `CORS_ORIGIN` | Allowed production frontend origin | `https://your-lifedrop-frontend.vercel.app` |

### Frontend (Vercel Dashboard)
Set these in your Vercel project settings under **Environment Variables**:

| Variable | Description | Example / Required Value |
| :--- | :--- | :--- |
| `VITE_API_BASE_URL` | Render backend public service URL | `https://lifedrop-backend.onrender.com` |

---

## 2. Step-by-Step Deployment Instructions

### A. Deploy Backend to Render
1. Push this repository to your GitHub account.
2. In [Render Dashboard](https://dashboard.render.com), click **New +** → **Blueprint** (or **Web Service**).
3. Connect your repository. Render will automatically detect [`render.yaml`](render.yaml).
4. Fill in the non-synced environment variables (`MONGODB_URI`, `JWT_SECRET`, `CORS_ORIGIN`).
5. Click **Apply** / **Deploy**. Once finished, copy your public service URL (e.g. `https://lifedrop-backend.onrender.com`).

### B. Deploy Frontend to Vercel
1. In [Vercel Dashboard](https://vercel.com/dashboard), click **Add New...** → **Project**.
2. Import the GitHub repository.
3. Keep default settings (Framework Preset: **Other**; Root Directory: `./`).
4. Under **Environment Variables**, add:
   - `VITE_API_BASE_URL`: `https://your-render-service.onrender.com`
5. Click **Deploy**. Copy your production Vercel URL (e.g. `https://lifedrop.vercel.app`).

### C. Connect & Verify
1. Go back to Render Dashboard → Environment, and update `CORS_ORIGIN` to your exact Vercel URL (e.g. `https://lifedrop.vercel.app`).
2. Verify connectivity by hitting `https://your-render-service.onrender.com/api/health`.

---

## 3. Cold Start Mitigation (Render Free Tier)

> [!NOTE]
> **Known Limitation (Free Tier Spin-Down)**:
> Render's free web services automatically spin down after 15 minutes of inactivity. When a new request arrives, the first cold start may take 45–60 seconds before responding. Subsequent requests respond in <100ms.

### Recommended Free Keep-Alive Setup:
To prevent cold start delays during live demos or evaluations, configure a free HTTP pinger (such as [cron-job.org](https://cron-job.org) or [UptimeRobot](https://uptimerobot.com)):
- **Target URL**: `https://<your-render-service>.onrender.com/api/health`
- **Method**: `GET`
- **Schedule**: Every 10 minutes (`*/10 * * * *`)

---

## 4. Local Development

```bash
# 1. Install backend dependencies
cd backend
npm install

# 2. Configure .env
cp .env.example .env
# Fill in your MONGODB_URI and JWT_SECRET

# 3. Start local development server
npm start
# Server starts at http://localhost:5000 serving both API and frontend
```
