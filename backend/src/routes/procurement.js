const router = require('express').Router();
const {
  getPRs, getPRById, createPR, approvePR, cancelPR,
  getPOs, getPOById, createPO, cancelPO,
  getRRs, getRRById, createAndPostRR,
} = require('../controllers/procurementController');
const { authenticate, authorize } = require('../middleware/auth');

// ── Purchase Requests ─────────────────────────────────────────────────────────
router.get('/purchase-requests', authenticate, getPRs);
router.get('/purchase-requests/:id', authenticate, getPRById);
router.post('/purchase-requests', authenticate, createPR);
router.patch('/purchase-requests/:id/approve', authenticate, authorize('admin', 'manager'), approvePR);
router.patch('/purchase-requests/:id/cancel', authenticate, cancelPR);

// ── Purchase Orders ───────────────────────────────────────────────────────────
router.get('/purchase-orders', authenticate, getPOs);
router.get('/purchase-orders/:id', authenticate, getPOById);
router.post('/purchase-orders', authenticate, authorize('admin', 'manager'), createPO);
router.patch('/purchase-orders/:id/cancel', authenticate, authorize('admin'), cancelPO);

// ── Receiving Reports ─────────────────────────────────────────────────────────
router.get('/receiving-reports', authenticate, getRRs);
router.get('/receiving-reports/:id', authenticate, getRRById);
router.post('/receiving-reports', authenticate, createAndPostRR);

module.exports = router;
