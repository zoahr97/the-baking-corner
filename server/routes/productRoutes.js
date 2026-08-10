const express = require('express');
const router = express.Router();

const { verifyToken, verifyAdmin } = require('../middlewares/authMiddleware');

const { 
  getAllProducts, 
  createProduct, 
  updateProduct, 
  deleteProduct 
} = require('../controllers/productController');

router.get('/', getAllProducts);

router.post('/', verifyToken, verifyAdmin, createProduct);
router.put('/:id', verifyToken, verifyAdmin, updateProduct);
router.delete('/:id', verifyToken, verifyAdmin, deleteProduct);

module.exports = router;

