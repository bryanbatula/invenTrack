const db = require('../config/db');

// ── List items with search & filter ──────────────────────────────────────────
const getItems = async (req, res, next) => {
  try {
    const { search, category_id, low_stock, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const params = [];
    const conditions = ['i.is_active = TRUE'];

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(i.item_code ILIKE $${params.length} OR i.description ILIKE $${params.length})`);
    }
    if (category_id) {
      params.push(category_id);
      conditions.push(`i.category_id = $${params.length}`);
    }
    if (low_stock === 'true') {
      conditions.push('i.current_qty <= i.reorder_point');
    }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    const countResult = await db.query(
      `SELECT COUNT(*) FROM items i ${where}`,
      params
    );

    params.push(limit, offset);
    const { rows } = await db.query(
      `SELECT i.id, i.item_code, i.description, i.unit_of_measure, i.location,
              i.current_qty, i.reorder_point, i.fifo_unit_cost, i.total_value,
              i.is_vatable, i.created_at,
              c.name AS category_name
       FROM items i
       LEFT JOIN categories c ON i.category_id = c.id
       ${where}
       ORDER BY i.item_code ASC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({
      data: rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (err) {
    next(err);
  }
};

// ── Get single item with FIFO lots ───────────────────────────────────────────
const getItemById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rows } = await db.query(
      `SELECT i.*, c.name AS category_name
       FROM items i LEFT JOIN categories c ON i.category_id = c.id
       WHERE i.id = $1`,
      [id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Item not found' });

    const { rows: lots } = await db.query(
      `SELECT * FROM inventory_lots
       WHERE item_id = $1 AND qty_remaining > 0
       ORDER BY receipt_date ASC`,
      [id]
    );

    const { rows: movements } = await db.query(
      `SELECT sm.*, u.full_name AS performed_by_name
       FROM stock_movements sm
       LEFT JOIN users u ON sm.performed_by = u.id
       WHERE sm.item_id = $1
       ORDER BY sm.created_at DESC LIMIT 20`,
      [id]
    );

    res.json({ ...rows[0], fifo_lots: lots, recent_movements: movements });
  } catch (err) {
    next(err);
  }
};

// ── Create item ───────────────────────────────────────────────────────────────
const createItem = async (req, res, next) => {
  try {
    const { item_code, description, category_id, unit_of_measure, location, reorder_point, is_vatable } = req.body;
    const { rows } = await db.query(
      `INSERT INTO items (item_code, description, category_id, unit_of_measure, location, reorder_point, is_vatable)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING *`,
      [item_code, description, category_id, unit_of_measure || 'pc', location, reorder_point || 0, is_vatable ?? true]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ message: 'Item code already exists' });
    next(err);
  }
};

// ── Update item ───────────────────────────────────────────────────────────────
const updateItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { description, category_id, unit_of_measure, location, reorder_point, is_vatable } = req.body;
    const { rows } = await db.query(
      `UPDATE items
       SET description=$1, category_id=$2, unit_of_measure=$3, location=$4,
           reorder_point=$5, is_vatable=$6
       WHERE id=$7
       RETURNING *`,
      [description, category_id, unit_of_measure, location, reorder_point, is_vatable, id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Item not found' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};

// ── Manual stock adjustment ───────────────────────────────────────────────────
const adjustStock = async (req, res, next) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const { id } = req.params;
    const { qty_change, unit_cost, reason } = req.body;

    const { rows: itemRows } = await client.query(
      'SELECT current_qty, fifo_unit_cost FROM items WHERE id = $1 FOR UPDATE',
      [id]
    );
    if (!itemRows.length) return res.status(404).json({ message: 'Item not found' });

    const newQty = parseFloat(itemRows[0].current_qty) + parseFloat(qty_change);
    if (newQty < 0) return res.status(400).json({ message: 'Adjustment would result in negative stock' });

    await client.query(
      'UPDATE items SET current_qty = $1 WHERE id = $2',
      [newQty, id]
    );

    if (parseFloat(qty_change) > 0 && unit_cost) {
      await client.query(
        `INSERT INTO inventory_lots (item_id, qty_received, qty_remaining, unit_cost)
         VALUES ($1, $2, $2, $3)`,
        [id, qty_change, unit_cost]
      );
    }

    await client.query(
      `INSERT INTO stock_movements (item_id, movement_type, reference_type, qty_change, unit_cost, qty_after, performed_by, notes)
       VALUES ($1,'adjustment','ADJ',$2,$3,$4,$5,$6)`,
      [id, qty_change, unit_cost, newQty, req.user.id, reason]
    );

    await client.query('COMMIT');
    res.json({ message: 'Stock adjusted', new_qty: newQty });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

// ── Get categories ────────────────────────────────────────────────────────────
const getCategories = async (req, res, next) => {
  try {
    const { rows } = await db.query('SELECT * FROM categories ORDER BY name');
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

module.exports = { getItems, getItemById, createItem, updateItem, adjustStock, getCategories };
