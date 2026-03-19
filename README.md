# InvenTrack PH — Inventory & Procurement System

A full-stack, BIR-audit-ready Inventory and Procurement System built for **Philippine MSMEs**.

- **Frontend:** React 18 + Vite + Tailwind CSS
- **Backend:** Node.js + Express
- **Database:** PostgreSQL (FIFO valuation, PAS 2 compliant)
- **Deployment:** Supabase (DB) · Render (API) · Vercel (Frontend) — **all free tiers**

---

## Features

| Module | Capabilities |
|---|---|
| **Dashboard** | Low-stock alerts, pending PR approvals, KPI cards, recent stock movements |
| **Inventory** | FIFO lots viewer, search/filter, VAT toggle, manual adjustment, BIR CSV export |
| **Purchase Requests** | Create → Manager Approval → Reject with notes |
| **Purchase Orders** | Link to approved PR, VAT/Non-VAT by supplier, 12% computation |
| **Receiving Reports** | Post stock into FIFO lots, auto-updates inventory count |
| **Suppliers** | TIN, registered address, VAT-registration toggle |
| **BIR Reports** | BIR Annex inventory list, Procurement VAT summary, Stock movement ledger |
| **Users** | Admin / Manager / Staff roles with route-level protection |

---

## Free Deployment Stack

```
Supabase  (PostgreSQL)  →  free 500 MB
Render    (Express API)  →  free 750 hrs/month
Vercel    (React/Vite)   →  free unlimited deploys
```

---

## Local Development Setup

### Prerequisites
- Node.js 18+
- PostgreSQL 14+ (or use Supabase free tier)

### 1. Clone & Install

```bash
# Backend
cd backend
npm install
cp .env.example .env    # fill in your DATABASE_URL and JWT_SECRET

# Frontend
cd ../frontend
npm install
cp .env.example .env    # set VITE_API_URL=http://localhost:5000
```

### 2. Run Database Migration

```bash
cd backend
npm run migrate
```

This runs `migrations/001_schema.sql` which creates all tables and seeds:
- 5 default categories
- 1 default admin user: `admin@msme.ph` / `password`

### 3. Start Development Servers

```bash
# Terminal 1 — Backend (port 5000)
cd backend
npm run dev

# Terminal 2 — Frontend (port 5173)
cd frontend
npm run dev
```

Open http://localhost:5173 and login with `admin@msme.ph` / `password`.

---

## Free Cloud Deployment Guide

### Step 1 — Supabase (Free PostgreSQL)

1. Go to [supabase.com](https://supabase.com) → **New Project**
2. Project Settings → **Database** → copy the **Connection String (URI)**
3. In Supabase SQL Editor, paste and run the contents of `backend/migrations/001_schema.sql`

### Step 2 — Render (Free Backend)

1. Go to [render.com](https://render.com) → **New Web Service**
2. Connect your GitHub repo
3. Set **Root Directory** to `backend`
4. **Build Command:** `npm install`
5. **Start Command:** `npm start`
6. Add Environment Variables:
   ```
   DATABASE_URL   = (your Supabase connection string)
   JWT_SECRET     = (generate a random 64-char string)
   CLIENT_URL     = (your Vercel URL, added after Step 3)
   NODE_ENV       = production
   ```
7. Deploy — copy your Render URL e.g. `https://your-api.onrender.com`

> **Note:** Render free tier spins down after 15 min inactivity. First request may be slow (cold start).

### Step 3 — Vercel (Free Frontend)

1. Go to [vercel.com](https://vercel.com) → **New Project**
2. Connect your GitHub repo
3. Set **Root Directory** to `frontend`
4. Add Environment Variable:
   ```
   VITE_API_URL = https://your-api.onrender.com
   ```
5. Deploy → copy your Vercel URL
6. Go back to Render → update `CLIENT_URL` to your Vercel URL (for CORS)

---

## Project Structure

```
├── backend/
│   ├── migrations/
│   │   └── 001_schema.sql          ← Full PostgreSQL schema
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.js               ← pg pool connection
│   │   │   └── migrate.js          ← migration runner
│   │   ├── middleware/
│   │   │   ├── auth.js             ← JWT middleware + role guard
│   │   │   └── errorHandler.js
│   │   ├── controllers/
│   │   │   ├── authController.js
│   │   │   ├── dashboardController.js
│   │   │   ├── inventoryController.js
│   │   │   ├── procurementController.js  ← PR/PO/RR + FIFO posting
│   │   │   ├── supplierController.js
│   │   │   └── reportController.js       ← BIR Annex CSV export
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── dashboard.js
│   │   │   ├── inventory.js
│   │   │   ├── procurement.js
│   │   │   ├── suppliers.js
│   │   │   └── reports.js
│   │   └── server.js
│   └── render.yaml
│
└── frontend/
    └── src/
        ├── api/axios.js            ← Axios + JWT interceptors
        ├── context/AuthContext.jsx ← Auth state
        ├── components/
        │   ├── layout/             ← Sidebar, Header, Layout
        │   └── ui/                 ← Modal, StatusBadge, Pagination
        └── pages/
            ├── Login.jsx
            ├── Dashboard.jsx
            ├── Inventory.jsx
            ├── Suppliers.jsx
            ├── Reports.jsx
            ├── Users.jsx
            └── procurement/
                ├── PurchaseRequests.jsx  ← PR + Manager Approval
                ├── PurchaseOrders.jsx    ← PO + VAT computation
                └── ReceivingReports.jsx  ← Receive Stock → FIFO lots
```

---

## Database Schema Highlights

### FIFO Lot Tracking (PAS 2)
```sql
inventory_lots (
  item_id, receipt_date, qty_received, qty_remaining, unit_cost
)
-- Oldest lots consumed first on issue
-- RR posting creates new lots automatically
```

### Procurement Workflow
```
purchase_requests → [Manager Approve] → purchase_orders → receiving_reports
                                                              ↓
                                                    inventory_lots (FIFO)
                                                    stock_movements (audit trail)
```

### BIR Compliance Fields
- `suppliers.tin` — BIR TIN (xxx-xxx-xxx-xxxV format)
- `suppliers.address` — Registered business address
- `suppliers.is_vat_registered` — 12% VAT toggle
- `items.item_code` — BIR Item Code
- `items.location` — Warehouse location for physical count
- `receiving_reports.invoice_number` — BIR Sales Invoice reference

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login, returns JWT |
| GET | `/api/dashboard` | Dashboard KPIs |
| GET | `/api/inventory` | List items (search, filter, pagination) |
| POST | `/api/inventory/:id/adjust` | Manual stock adjustment |
| GET | `/api/procurement/purchase-requests` | List PRs |
| POST | `/api/procurement/purchase-requests` | Create PR |
| PATCH | `/api/procurement/purchase-requests/:id/approve` | Approve/Reject PR |
| POST | `/api/procurement/purchase-orders` | Create PO (auto VAT) |
| POST | `/api/procurement/receiving-reports` | Post RR → updates FIFO stock |
| GET | `/api/reports/bir-inventory/export` | Download BIR Annex CSV |
| GET | `/api/reports/stock-movements` | Audit trail |

---

## BIR Compliance Notes

1. **PAS 2 (FIFO)** — Every stock receipt creates a dated lot. Issues always consume the oldest lot first.
2. **VAT (12%)** — Computed automatically based on supplier VAT registration. Stored separately for input tax claims.
3. **BIR Inventory List** — Export includes Item Code, Description, Location, Qty, Unit Cost, Total Value, VAT Status.
4. **Audit Trail** — `stock_movements` table logs every quantity change with user and timestamp.
5. **Supplier TIN** — Stored on every PO for BIR Summary List of Purchases (Annex B).
