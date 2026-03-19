-- ============================================================
-- Inventory & Procurement System - PostgreSQL Schema
-- Philippine MSME / BIR-Audit Ready
-- PAS 2 Compliant (FIFO Inventory Valuation)
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- USERS & AUTHENTICATION
-- ============================================================
CREATE TABLE users (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name    VARCHAR(150) NOT NULL,
  email        VARCHAR(150) UNIQUE NOT NULL,
  password     VARCHAR(255) NOT NULL,
  role         VARCHAR(30) NOT NULL DEFAULT 'staff'
                 CHECK (role IN ('admin','manager','staff')),
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SUPPLIERS MASTER  (stores TIN & address for BIR compliance)
-- ============================================================
CREATE TABLE suppliers (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_code    VARCHAR(30) UNIQUE NOT NULL,
  name             VARCHAR(200) NOT NULL,
  tin              VARCHAR(20),               -- BIR TIN (xxx-xxx-xxx-xxxV)
  address          TEXT,
  contact_person   VARCHAR(150),
  contact_number   VARCHAR(30),
  email            VARCHAR(150),
  is_vat_registered BOOLEAN NOT NULL DEFAULT TRUE,  -- VAT 12% toggle
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ITEM CATEGORIES
-- ============================================================
CREATE TABLE categories (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code         VARCHAR(20) UNIQUE NOT NULL,
  name         VARCHAR(100) NOT NULL,
  description  TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ITEMS / INVENTORY MASTER
-- ============================================================
CREATE TABLE items (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_code         VARCHAR(50) UNIQUE NOT NULL,       -- BIR Item Code
  description       VARCHAR(255) NOT NULL,
  category_id       UUID REFERENCES categories(id),
  unit_of_measure   VARCHAR(30) NOT NULL DEFAULT 'pc',
  location          VARCHAR(100),                      -- BIR: storage location
  reorder_point     NUMERIC(12,2) NOT NULL DEFAULT 0,  -- triggers low-stock alert
  current_qty       NUMERIC(12,2) NOT NULL DEFAULT 0,  -- running balance
  fifo_unit_cost    NUMERIC(12,4) NOT NULL DEFAULT 0,  -- weighted FIFO cost
  total_value       NUMERIC(16,2) GENERATED ALWAYS AS (current_qty * fifo_unit_cost) STORED,
  is_vatable        BOOLEAN NOT NULL DEFAULT TRUE,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- FIFO INVENTORY LOTS
-- Each inbound receipt creates a lot; FIFO consumption deducts
-- from the oldest lot first (PAS 2 compliance).
-- ============================================================
CREATE TABLE inventory_lots (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id         UUID NOT NULL REFERENCES items(id),
  lot_number      VARCHAR(50),
  receipt_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  rr_id           UUID,                               -- linked Receiving Report
  qty_received    NUMERIC(12,2) NOT NULL,
  qty_remaining   NUMERIC(12,2) NOT NULL,
  unit_cost       NUMERIC(12,4) NOT NULL,             -- cost excl. VAT (PAS 2)
  expiry_date     DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_lots_item_date ON inventory_lots(item_id, receipt_date);

-- ============================================================
-- PURCHASE REQUESTS (PR)
-- ============================================================
CREATE TABLE purchase_requests (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pr_number       VARCHAR(30) UNIQUE NOT NULL,
  requested_by    UUID NOT NULL REFERENCES users(id),
  department      VARCHAR(100),
  date_needed     DATE,
  purpose         TEXT,
  status          VARCHAR(30) NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','approved','rejected','converted')),
  approved_by     UUID REFERENCES users(id),
  approved_at     TIMESTAMPTZ,
  rejection_note  TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE purchase_request_items (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pr_id           UUID NOT NULL REFERENCES purchase_requests(id) ON DELETE CASCADE,
  item_id         UUID NOT NULL REFERENCES items(id),
  qty_requested   NUMERIC(12,2) NOT NULL,
  unit_of_measure VARCHAR(30),
  estimated_cost  NUMERIC(12,4),
  notes           TEXT
);

-- ============================================================
-- PURCHASE ORDERS (PO)  — generated from approved PR
-- ============================================================
CREATE TABLE purchase_orders (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  po_number       VARCHAR(30) UNIQUE NOT NULL,
  pr_id           UUID REFERENCES purchase_requests(id),
  supplier_id     UUID NOT NULL REFERENCES suppliers(id),
  prepared_by     UUID NOT NULL REFERENCES users(id),
  po_date         DATE NOT NULL DEFAULT CURRENT_DATE,
  delivery_date   DATE,
  terms           VARCHAR(100) DEFAULT 'Cash',
  subtotal        NUMERIC(16,2) NOT NULL DEFAULT 0,
  vat_amount      NUMERIC(16,2) NOT NULL DEFAULT 0,   -- 12% if VAT-registered
  total_amount    NUMERIC(16,2) NOT NULL DEFAULT 0,
  status          VARCHAR(30) NOT NULL DEFAULT 'open'
                    CHECK (status IN ('open','partially_received','received','cancelled')),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE purchase_order_items (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  po_id           UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  item_id         UUID NOT NULL REFERENCES items(id),
  qty_ordered     NUMERIC(12,2) NOT NULL,
  unit_cost       NUMERIC(12,4) NOT NULL,             -- excl. VAT
  vat_rate        NUMERIC(5,2) NOT NULL DEFAULT 12.00, -- 0 or 12
  qty_received    NUMERIC(12,2) NOT NULL DEFAULT 0,
  line_total      NUMERIC(16,2) GENERATED ALWAYS AS (qty_ordered * unit_cost) STORED
);

-- ============================================================
-- RECEIVING REPORTS (RR) — triggers FIFO lot creation
-- ============================================================
CREATE TABLE receiving_reports (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rr_number       VARCHAR(30) UNIQUE NOT NULL,
  po_id           UUID NOT NULL REFERENCES purchase_orders(id),
  received_by     UUID NOT NULL REFERENCES users(id),
  supplier_id     UUID NOT NULL REFERENCES suppliers(id),
  receipt_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  delivery_note   VARCHAR(100),
  invoice_number  VARCHAR(100),                       -- BIR Sales Invoice ref
  status          VARCHAR(30) NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft','posted')),
  remarks         TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE receiving_report_items (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rr_id           UUID NOT NULL REFERENCES receiving_reports(id) ON DELETE CASCADE,
  po_item_id      UUID REFERENCES purchase_order_items(id),
  item_id         UUID NOT NULL REFERENCES items(id),
  qty_received    NUMERIC(12,2) NOT NULL,
  unit_cost       NUMERIC(12,4) NOT NULL,
  lot_number      VARCHAR(50),
  expiry_date     DATE,
  notes           TEXT
);

-- ============================================================
-- STOCK MOVEMENTS (audit trail for every inventory change)
-- ============================================================
CREATE TABLE stock_movements (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id         UUID NOT NULL REFERENCES items(id),
  movement_type   VARCHAR(30) NOT NULL
                    CHECK (movement_type IN ('receipt','issue','adjustment','return')),
  reference_type  VARCHAR(30),   -- 'RR', 'PO', 'ADJ'
  reference_id    UUID,
  qty_change      NUMERIC(12,2) NOT NULL,            -- positive=in, negative=out
  unit_cost       NUMERIC(12,4),
  qty_after       NUMERIC(12,2) NOT NULL,
  performed_by    UUID REFERENCES users(id),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_movements_item ON stock_movements(item_id, created_at);

-- ============================================================
-- AUTO-INCREMENT SEQUENCES for document numbers
-- ============================================================
CREATE SEQUENCE pr_seq START 1;
CREATE SEQUENCE po_seq START 1;
CREATE SEQUENCE rr_seq START 1;

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at       BEFORE UPDATE ON users       FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_suppliers_updated_at   BEFORE UPDATE ON suppliers   FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_items_updated_at       BEFORE UPDATE ON items       FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_pr_updated_at          BEFORE UPDATE ON purchase_requests FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_po_updated_at          BEFORE UPDATE ON purchase_orders   FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_rr_updated_at          BEFORE UPDATE ON receiving_reports FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- ============================================================
-- SEED DATA
-- ============================================================
INSERT INTO categories (code, name) VALUES
  ('RAW','Raw Materials'),
  ('PKG','Packaging'),
  ('SUP','Office Supplies'),
  ('EQP','Equipment'),
  ('FIN','Finished Goods');

-- Default admin user (password: Admin@1234 — change on first login)
INSERT INTO users (full_name, email, password, role) VALUES
  ('System Admin', 'admin@msme.ph', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin');
