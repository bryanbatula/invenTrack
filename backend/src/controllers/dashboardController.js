const db = require('../config/db');

const getDashboard = async (req, res, next) => {
  try {
    const [lowStock, pendingPR, openPO, recentMovements, totalItems, totalValue] =
      await Promise.all([
        // Low stock alerts
        db.query(`
          SELECT id, item_code, description, current_qty, reorder_point, unit_of_measure, location
          FROM items
          WHERE current_qty <= reorder_point AND is_active = TRUE
          ORDER BY (current_qty - reorder_point) ASC
          LIMIT 10
        `),

        // Pending purchase requests
        db.query(`
          SELECT pr.id, pr.pr_number, pr.department, pr.purpose, pr.created_at,
                 u.full_name AS requested_by_name,
                 COUNT(pri.id) AS item_count
          FROM purchase_requests pr
          JOIN users u ON pr.requested_by = u.id
          LEFT JOIN purchase_request_items pri ON pri.pr_id = pr.id
          WHERE pr.status = 'pending'
          GROUP BY pr.id, u.full_name
          ORDER BY pr.created_at ASC
          LIMIT 10
        `),

        // Open purchase orders
        db.query(`
          SELECT COUNT(*) AS count FROM purchase_orders WHERE status = 'open'
        `),

        // Recent stock movements
        db.query(`
          SELECT sm.id, sm.movement_type, sm.qty_change, sm.created_at,
                 i.item_code, i.description, u.full_name AS performed_by_name
          FROM stock_movements sm
          JOIN items i ON sm.item_id = i.id
          LEFT JOIN users u ON sm.performed_by = u.id
          ORDER BY sm.created_at DESC
          LIMIT 8
        `),

        // Total active items
        db.query(`SELECT COUNT(*) AS count FROM items WHERE is_active = TRUE`),

        // Total inventory value
        db.query(`SELECT COALESCE(SUM(total_value), 0) AS value FROM items WHERE is_active = TRUE`),
      ]);

    res.json({
      low_stock_alerts: lowStock.rows,
      pending_approvals: pendingPR.rows,
      open_po_count: parseInt(openPO.rows[0].count),
      recent_movements: recentMovements.rows,
      total_items: parseInt(totalItems.rows[0].count),
      total_inventory_value: parseFloat(totalValue.rows[0].value),
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getDashboard };
