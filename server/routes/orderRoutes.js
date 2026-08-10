const express = require('express');
const router = express.Router();
const { verifyToken, verifyAdmin } = require('../middlewares/authMiddleware');
const {
  getMyOrders,
  getMyOrderItems,
  cancelMyOrder,
  getAllOrders,
  getOrderItems,
  updateOrderStatus,
  createOrder
} = require('../controllers/orderController');

// Customer Routes
router.post('/', verifyToken, createOrder);
router.get('/my-orders', verifyToken, getMyOrders);
router.get('/my-orders/:id/items', verifyToken, getMyOrderItems);
router.put('/my-orders/:id/cancel', verifyToken, cancelMyOrder);

// Admin Routes
router.get('/', verifyToken, verifyAdmin, getAllOrders);
router.get('/:id/items', verifyToken, verifyAdmin, getOrderItems);
router.put('/:id/status', verifyToken, verifyAdmin, updateOrderStatus);

module.exports = router;