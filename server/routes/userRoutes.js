const express = require('express');
const router = express.Router();
const { verifyToken, verifyAdmin } = require('../middlewares/authMiddleware');
const { getAllUsers } = require('../controllers/userController');

router.get('/', verifyToken, verifyAdmin, getAllUsers);

module.exports = router;