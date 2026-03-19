const router = require('express').Router();
const {
  getBIRInventoryList, exportBIRAnnexCSV, getProcurementSummary, getStockMovements
} = require('../controllers/reportController');
const { authenticate } = require('../middleware/auth');

router.get('/bir-inventory', authenticate, getBIRInventoryList);
router.get('/bir-inventory/export', authenticate, exportBIRAnnexCSV);
router.get('/procurement-summary', authenticate, getProcurementSummary);
router.get('/stock-movements', authenticate, getStockMovements);

module.exports = router;
