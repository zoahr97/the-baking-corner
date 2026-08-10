const express = require('express');
const router = express.Router();
const { verifyToken, verifyAdmin } = require('../middlewares/authMiddleware');
const { uploadImage } = require('../controllers/uploadController');

router.post('/product-image', verifyToken, verifyAdmin, uploadImage);

module.exports = router;