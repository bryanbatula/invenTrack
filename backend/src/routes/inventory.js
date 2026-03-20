const router = require('express').Router();
const {
  getItems, getItemById, createItem, updateItem, adjustStock, getCategories, deleteItem
} = require('../controllers/inventoryController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/categories', authenticate, getCategories);
router.get('/', authenticate, getItems);
router.get('/:id', authenticate, getItemById);
router.post('/', authenticate, authorize('admin', 'manager'), createItem);
router.put('/:id', authenticate, authorize('admin', 'manager'), updateItem);
router.post('/:id/adjust', authenticate, authorize('admin', 'manager'), adjustStock);
router.delete('/:id', authenticate, authorize('admin'), deleteItem);

module.exports = router;
