const db = require('../config/db');

// ── BIR-ready Inventory List ──────────────────────────────────────────────────
const getBIRInventoryList = async (req, res, next) => {
  try {
    const { as_of } = req.query; // optional date filter
    const { rows } = await db.query(
      `SELECT
         i.item_code          AS "Item Code",
         i.description        AS "Item Description",
         c.name               AS "Category",
         i.unit_of_measure    AS "Unit",
         i.location           AS "Location/Warehouse",
         i.current_qty        AS "Quantity on Hand",
         i.fifo_unit_cost     AS "Unit Cost (FIFO)",
         i.total_value        AS "Total Value",
         CASE WHEN i.is_vatable THEN 'VAT' ELSE 'Non-VAT' END AS "VAT Status"
       FROM items i
       LEFT JOIN categories c ON i.category_id = c.id
       WHERE i.is_active = TRUE
       ORDER BY i.item_code ASC`,
      []
    );
    res.json(rows);
  } catch (err) { next(err); }
};

// ── BIR Annex CSV (simplified format for BIR submission) ─────────────────────
const exportBIRAnnexCSV = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT
         i.item_code, i.description, c.name AS category,
         i.unit_of_measure, i.location, i.current_qty,
         i.fifo_unit_cost, i.total_value,
         CASE WHEN i.is_vatable THEN 'VAT' ELSE 'Non-VAT' END AS vat_status
       FROM items i
       LEFT JOIN categories c ON i.category_id = c.id
       WHERE i.is_active = TRUE
       ORDER BY i.item_code`,
      []
    );

    const headers = [
      'Item Code', 'Description', 'Category', 'Unit of Measure',
      'Location/Warehouse', 'Quantity on Hand', 'Unit Cost (FIFO)',
      'Total Value', 'VAT Status'
    ];

    const escape = (val) => {
      if (val == null) return '';
      const str = String(val);
      return str.includes(',') || str.includes('"') || str.includes('\n')
        ? `"${str.replace(/"/g, '""')}"` : str;
    };

    const csvLines = [
      headers.join(','),
      ...rows.map(r => [
        r.item_code, r.description, r.category, r.unit_of_measure,
        r.location, r.current_qty, r.fifo_unit_cost, r.total_value, r.vat_status
      ].map(escape).join(','))
    ];

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="BIR_Inventory_${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csvLines.join('\r\n'));
  } catch (err) { next(err); }
};

// ── Procurement Summary ───────────────────────────────────────────────────────
const getProcurementSummary = async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const params = [];
    let dateFilter = '';
    if (from) { params.push(from); dateFilter += ` AND po.po_date >= $${params.length}`; }
    if (to)   { params.push(to);   dateFilter += ` AND po.po_date <= $${params.length}`; }

    const { rows } = await db.query(
      `SELECT po.po_number, po.po_date, s.name AS supplier, s.tin,
              po.subtotal, po.vat_amount, po.total_amount, po.status
       FROM purchase_orders po
       JOIN suppliers s ON po.supplier_id = s.id
       WHERE TRUE ${dateFilter}
       ORDER BY po.po_date DESC`,
      params
    );
    res.json(rows);
  } catch (err) { next(err); }
};

// ── Stock movement history ────────────────────────────────────────────────────
const getStockMovements = async (req, res, next) => {
  try {
    const { item_id, from, to, type, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    const params = [];
    const conditions = [];
    if (item_id) { params.push(item_id); conditions.push(`sm.item_id = $${params.length}`); }
    if (type)    { params.push(type);    conditions.push(`sm.movement_type = $${params.length}`); }
    if (from)    { params.push(from);    conditions.push(`sm.created_at >= $${params.length}`); }
    if (to)      { params.push(to);      conditions.push(`sm.created_at <= $${params.length}`); }
    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    const countQ = await db.query(`SELECT COUNT(*) FROM stock_movements sm ${where}`, params);
    params.push(limit, offset);

    const { rows } = await db.query(
      `SELECT sm.*, i.item_code, i.description, u.full_name AS performed_by_name
       FROM stock_movements sm
       JOIN items i ON sm.item_id = i.id
       LEFT JOIN users u ON sm.performed_by = u.id
       ${where}
       ORDER BY sm.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({ data: rows, total: parseInt(countQ.rows[0].count), page: parseInt(page), limit: parseInt(limit) });
  } catch (err) { next(err); }
};

module.exports = { getBIRInventoryList, exportBIRAnnexCSV, getProcurementSummary, getStockMovements };
