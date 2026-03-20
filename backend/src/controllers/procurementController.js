const db = require('../config/db');

// ══════════════════════════════════════════════════════════════
//  PURCHASE REQUESTS
// ══════════════════════════════════════════════════════════════

const getPRs = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const params = [];
    let where = '';
    if (status) { params.push(status); where = `WHERE pr.status = $1`; }

    const countQ = await db.query(`SELECT COUNT(*) FROM purchase_requests pr ${where}`, params);
    params.push(limit, offset);

    const { rows } = await db.query(
      `SELECT pr.*, u.full_name AS requested_by_name, a.full_name AS approved_by_name,
              COUNT(pri.id) AS item_count
       FROM purchase_requests pr
       JOIN users u ON pr.requested_by = u.id
       LEFT JOIN users a ON pr.approved_by = a.id
       LEFT JOIN purchase_request_items pri ON pri.pr_id = pr.id
       ${where}
       GROUP BY pr.id, u.full_name, a.full_name
       ORDER BY pr.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({ data: rows, total: parseInt(countQ.rows[0].count), page: parseInt(page), limit: parseInt(limit) });
  } catch (err) { next(err); }
};

const getPRById = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT pr.*, u.full_name AS requested_by_name, a.full_name AS approved_by_name
       FROM purchase_requests pr
       JOIN users u ON pr.requested_by = u.id
       LEFT JOIN users a ON pr.approved_by = a.id
       WHERE pr.id = $1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'PR not found' });

    const { rows: items } = await db.query(
      `SELECT pri.*, i.item_code, i.description, i.unit_of_measure
       FROM purchase_request_items pri
       JOIN items i ON pri.item_id = i.id
       WHERE pri.pr_id = $1`,
      [req.params.id]
    );
    res.json({ ...rows[0], items });
  } catch (err) { next(err); }
};

const createPR = async (req, res, next) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const { department, date_needed, purpose, items } = req.body;

    const seqResult = await client.query("SELECT nextval('pr_seq') AS seq");
    const prNumber = `PR-${new Date().getFullYear()}-${String(seqResult.rows[0].seq).padStart(4, '0')}`;

    const { rows } = await client.query(
      `INSERT INTO purchase_requests (pr_number, requested_by, department, date_needed, purpose)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [prNumber, req.user.id, department, date_needed, purpose]
    );
    const pr = rows[0];

    for (const item of items) {
      await client.query(
        `INSERT INTO purchase_request_items (pr_id, item_id, qty_requested, unit_of_measure, estimated_cost, notes)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [pr.id, item.item_id, item.qty_requested, item.unit_of_measure, item.estimated_cost, item.notes]
      );
    }

    await client.query('COMMIT');
    res.status(201).json(pr);
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

// ── Manager approves or rejects PR ───────────────────────────────────────────
const approvePR = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { action, rejection_note } = req.body; // action: 'approve' | 'reject'

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ message: 'Action must be approve or reject' });
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    const { rows } = await db.query(
      `UPDATE purchase_requests
       SET status = $1, approved_by = $2, approved_at = NOW(), rejection_note = $3
       WHERE id = $4 AND status = 'pending'
       RETURNING *`,
      [newStatus, req.user.id, rejection_note || null, id]
    );

    if (!rows.length) {
      return res.status(404).json({ message: 'PR not found or already processed' });
    }
    res.json({ message: `PR ${newStatus}`, pr: rows[0] });
  } catch (err) { next(err); }
};

// ── Cancel PR (pending only) ──────────────────────────────────────────────────
const cancelPR = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rows } = await db.query(
      `UPDATE purchase_requests SET status = 'cancelled'
       WHERE id = $1 AND status = 'pending'
       RETURNING *`,
      [id]
    );
    if (!rows.length) return res.status(400).json({ message: 'PR not found or cannot be cancelled (only pending PRs can be cancelled)' });
    res.json({ message: 'PR cancelled', pr: rows[0] });
  } catch (err) { next(err); }
};

// ══════════════════════════════════════════════════════════════
//  PURCHASE ORDERS
// ══════════════════════════════════════════════════════════════

const getPOs = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const params = [];
    let where = '';
    if (status) { params.push(status); where = `WHERE po.status = $1`; }

    const countQ = await db.query(`SELECT COUNT(*) FROM purchase_orders po ${where}`, params);
    params.push(limit, offset);

    const { rows } = await db.query(
      `SELECT po.*, s.name AS supplier_name, s.tin AS supplier_tin,
              u.full_name AS prepared_by_name, pr.pr_number
       FROM purchase_orders po
       JOIN suppliers s ON po.supplier_id = s.id
       JOIN users u ON po.prepared_by = u.id
       LEFT JOIN purchase_requests pr ON po.pr_id = pr.id
       ${where}
       ORDER BY po.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({ data: rows, total: parseInt(countQ.rows[0].count), page: parseInt(page), limit: parseInt(limit) });
  } catch (err) { next(err); }
};

const getPOById = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT po.*, s.name AS supplier_name, s.tin, s.address AS supplier_address,
              s.is_vat_registered, u.full_name AS prepared_by_name
       FROM purchase_orders po
       JOIN suppliers s ON po.supplier_id = s.id
       JOIN users u ON po.prepared_by = u.id
       WHERE po.id = $1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'PO not found' });

    const { rows: items } = await db.query(
      `SELECT poi.*, i.item_code, i.description, i.unit_of_measure
       FROM purchase_order_items poi
       JOIN items i ON poi.item_id = i.id
       WHERE poi.po_id = $1`,
      [req.params.id]
    );
    res.json({ ...rows[0], items });
  } catch (err) { next(err); }
};

const createPO = async (req, res, next) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const { pr_id, supplier_id, delivery_date, terms, notes, items } = req.body;

    // Validate supplier VAT status
    const { rows: supRows } = await client.query(
      'SELECT is_vat_registered FROM suppliers WHERE id = $1',
      [supplier_id]
    );
    const isVat = supRows[0]?.is_vat_registered ?? true;

    let subtotal = 0;
    items.forEach(i => { subtotal += parseFloat(i.qty_ordered) * parseFloat(i.unit_cost); });
    const vatAmount = isVat ? subtotal * 0.12 : 0;
    const totalAmount = subtotal + vatAmount;

    const seqResult = await client.query("SELECT nextval('po_seq') AS seq");
    const poNumber = `PO-${new Date().getFullYear()}-${String(seqResult.rows[0].seq).padStart(4, '0')}`;

    const { rows } = await client.query(
      `INSERT INTO purchase_orders
         (po_number, pr_id, supplier_id, prepared_by, delivery_date, terms, subtotal, vat_amount, total_amount, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [poNumber, pr_id || null, supplier_id, req.user.id, delivery_date, terms, subtotal, vatAmount, totalAmount, notes]
    );
    const po = rows[0];

    for (const item of items) {
      const vatRate = isVat ? (item.vat_rate ?? 12) : 0;
      await client.query(
        `INSERT INTO purchase_order_items (po_id, item_id, qty_ordered, unit_cost, vat_rate)
         VALUES ($1,$2,$3,$4,$5)`,
        [po.id, item.item_id, item.qty_ordered, item.unit_cost, vatRate]
      );
    }

    // Mark PR as converted if linked
    if (pr_id) {
      await client.query(
        `UPDATE purchase_requests SET status = 'converted' WHERE id = $1`,
        [pr_id]
      );
    }

    await client.query('COMMIT');
    res.status(201).json(po);
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

// ── Cancel PO (pending only, admin only) ─────────────────────────────────────
const cancelPO = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rows } = await db.query(
      `UPDATE purchase_orders SET status = 'cancelled'
       WHERE id = $1 AND status = 'pending'
       RETURNING *`,
      [id]
    );
    if (!rows.length) return res.status(400).json({ message: 'PO not found or cannot be cancelled (only pending POs can be cancelled)' });
    res.json({ message: 'PO cancelled', po: rows[0] });
  } catch (err) { next(err); }
};

// ══════════════════════════════════════════════════════════════
//  RECEIVING REPORTS — posts stock into FIFO lots
// ══════════════════════════════════════════════════════════════

const getRRs = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const countQ = await db.query('SELECT COUNT(*) FROM receiving_reports');
    const { rows } = await db.query(
      `SELECT rr.*, po.po_number, s.name AS supplier_name, u.full_name AS received_by_name
       FROM receiving_reports rr
       JOIN purchase_orders po ON rr.po_id = po.id
       JOIN suppliers s ON rr.supplier_id = s.id
       JOIN users u ON rr.received_by = u.id
       ORDER BY rr.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    res.json({ data: rows, total: parseInt(countQ.rows[0].count), page: parseInt(page), limit: parseInt(limit) });
  } catch (err) { next(err); }
};

const getRRById = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT rr.*, po.po_number, s.name AS supplier_name, s.tin, s.address AS supplier_address,
              u.full_name AS received_by_name
       FROM receiving_reports rr
       JOIN purchase_orders po ON rr.po_id = po.id
       JOIN suppliers s ON rr.supplier_id = s.id
       JOIN users u ON rr.received_by = u.id
       WHERE rr.id = $1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'RR not found' });

    const { rows: items } = await db.query(
      `SELECT rri.*, i.item_code, i.description, i.unit_of_measure
       FROM receiving_report_items rri
       JOIN items i ON rri.item_id = i.id
       WHERE rri.rr_id = $1`,
      [req.params.id]
    );
    res.json({ ...rows[0], items });
  } catch (err) { next(err); }
};

// ── Create & Post RR: the core "Receive Stock" action ────────────────────────
const createAndPostRR = async (req, res, next) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const { po_id, receipt_date, delivery_note, invoice_number, remarks, items } = req.body;

    const { rows: poRows } = await client.query(
      'SELECT supplier_id FROM purchase_orders WHERE id = $1',
      [po_id]
    );
    if (!poRows.length) return res.status(404).json({ message: 'PO not found' });

    const seqResult = await client.query("SELECT nextval('rr_seq') AS seq");
    const rrNumber = `RR-${new Date().getFullYear()}-${String(seqResult.rows[0].seq).padStart(4, '0')}`;

    const { rows: rrRows } = await client.query(
      `INSERT INTO receiving_reports
         (rr_number, po_id, received_by, supplier_id, receipt_date, delivery_note, invoice_number, remarks, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'posted')
       RETURNING *`,
      [rrNumber, po_id, req.user.id, poRows[0].supplier_id, receipt_date || new Date().toISOString().split('T')[0], delivery_note, invoice_number, remarks]
    );
    const rr = rrRows[0];

    for (const item of items) {
      // Insert RR line item
      await client.query(
        `INSERT INTO receiving_report_items (rr_id, po_item_id, item_id, qty_received, unit_cost, lot_number, expiry_date)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [rr.id, item.po_item_id || null, item.item_id, item.qty_received, item.unit_cost, item.lot_number, item.expiry_date || null]
      );

      // Create FIFO lot
      await client.query(
        `INSERT INTO inventory_lots (item_id, lot_number, receipt_date, rr_id, qty_received, qty_remaining, unit_cost, expiry_date)
         VALUES ($1,$2,$3,$4,$5,$5,$6,$7)`,
        [item.item_id, item.lot_number, rr.receipt_date, rr.id, item.qty_received, item.unit_cost, item.expiry_date || null]
      );

      // Update item current_qty and fifo_unit_cost (weighted average of remaining lots)
      const { rows: lotRows } = await client.query(
        `SELECT SUM(qty_remaining) AS total_qty,
                SUM(qty_remaining * unit_cost) AS total_value
         FROM inventory_lots
         WHERE item_id = $1 AND qty_remaining > 0`,
        [item.item_id]
      );
      const totalQty = parseFloat(lotRows[0].total_qty) || 0;
      const fifoUnitCost = totalQty > 0 ? parseFloat(lotRows[0].total_value) / totalQty : parseFloat(item.unit_cost);

      await client.query(
        `UPDATE items SET current_qty = $1, fifo_unit_cost = $2 WHERE id = $3`,
        [totalQty, fifoUnitCost, item.item_id]
      );

      // Stock movement record
      await client.query(
        `INSERT INTO stock_movements (item_id, movement_type, reference_type, reference_id, qty_change, unit_cost, qty_after, performed_by)
         VALUES ($1,'receipt','RR',$2,$3,$4,$5,$6)`,
        [item.item_id, rr.id, item.qty_received, item.unit_cost, totalQty, req.user.id]
      );

      // Update PO item qty_received
      if (item.po_item_id) {
        await client.query(
          `UPDATE purchase_order_items
           SET qty_received = qty_received + $1
           WHERE id = $2`,
          [item.qty_received, item.po_item_id]
        );
      }
    }

    // Update PO status
    const { rows: poItemRows } = await client.query(
      `SELECT SUM(qty_ordered) AS ordered, SUM(qty_received) AS received
       FROM purchase_order_items WHERE po_id = $1`,
      [po_id]
    );
    const ordered = parseFloat(poItemRows[0].ordered);
    const received = parseFloat(poItemRows[0].received);
    const poStatus = received >= ordered ? 'received' : 'partially_received';
    await client.query(
      `UPDATE purchase_orders SET status = $1 WHERE id = $2`,
      [poStatus, po_id]
    );

    await client.query('COMMIT');
    res.status(201).json({ message: 'Stock received and inventory updated', rr });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

module.exports = {
  getPRs, getPRById, createPR, approvePR, cancelPR,
  getPOs, getPOById, createPO, cancelPO,
  getRRs, getRRById, createAndPostRR,
};
