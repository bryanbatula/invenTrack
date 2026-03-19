const router = require('express').Router();
const { login, me, register, changePassword, getUsers, deleteUser } = require('../controllers/authController');
const { authenticate, authorize } = require('../middleware/auth');

router.post('/login', login);
router.get('/me', authenticate, me);
router.get('/users', authenticate, authorize('admin'), getUsers);
router.delete('/users/:id', authenticate, authorize('admin'), deleteUser);
router.post('/register', authenticate, authorize('admin'), register);
router.put('/change-password', authenticate, changePassword);

module.exports = router;
