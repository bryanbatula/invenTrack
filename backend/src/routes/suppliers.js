const router = require('express').Router();
const {
  getSuppliers, getSupplierById, createSupplier, updateSupplier, deleteSupplier
} = require('../controllers/supplierController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', authenticate, getSuppliers);
router.get('/:id', authenticate, getSupplierById);
router.post('/', authenticate, authorize('admin', 'manager'), createSupplier);
router.put('/:id', authenticate, authorize('admin', 'manager'), updateSupplier);
router.delete('/:id', authenticate, authorize('admin'), deleteSupplier);

module.exports = router;
