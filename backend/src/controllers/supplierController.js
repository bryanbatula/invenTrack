const db = require('../config/db');

const getSuppliers = async (req, res, next) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const params = [];
    let where = 'WHERE is_active = TRUE';
    if (search) {
      params.push(`%${search}%`);
      where += ` AND (name ILIKE $1 OR tin ILIKE $1 OR supplier_code ILIKE $1)`;
    }
    const countQ = await db.query(`SELECT COUNT(*) FROM suppliers ${where}`, params);
    params.push(limit, offset);
    const { rows } = await db.query(
      `SELECT * FROM suppliers ${where} ORDER BY name ASC LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );
    res.json({ data: rows, total: parseInt(countQ.rows[0].count), page: parseInt(page), limit: parseInt(limit) });
  } catch (err) { next(err); }
};

const getSupplierById = async (req, res, next) => {
  try {
    const { rows } = await db.query('SELECT * FROM suppliers WHERE id = $1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ message: 'Supplier not found' });
    res.json(rows[0]);
  } catch (err) { next(err); }
};

const createSupplier = async (req, res, next) => {
  try {
    const { supplier_code, name, tin, address, contact_person, contact_number, email, is_vat_registered } = req.body;
    const { rows } = await db.query(
      `INSERT INTO suppliers (supplier_code, name, tin, address, contact_person, contact_number, email, is_vat_registered)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [supplier_code, name, tin, address, contact_person, contact_number, email, is_vat_registered ?? true]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ message: 'Supplier code already exists' });
    next(err);
  }
};

const updateSupplier = async (req, res, next) => {
  try {
    const { name, tin, address, contact_person, contact_number, email, is_vat_registered } = req.body;
    const { rows } = await db.query(
      `UPDATE suppliers
       SET name=$1, tin=$2, address=$3, contact_person=$4, contact_number=$5, email=$6, is_vat_registered=$7
       WHERE id=$8 RETURNING *`,
      [name, tin, address, contact_person, contact_number, email, is_vat_registered, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Supplier not found' });
    res.json(rows[0]);
  } catch (err) { next(err); }
};

const deleteSupplier = async (req, res, next) => {
  try {
    await db.query('UPDATE suppliers SET is_active = FALSE WHERE id = $1', [req.params.id]);
    res.json({ message: 'Supplier deactivated' });
  } catch (err) { next(err); }
};

module.exports = { getSuppliers, getSupplierById, createSupplier, updateSupplier, deleteSupplier };
