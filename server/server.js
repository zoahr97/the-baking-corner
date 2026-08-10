const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// ייבוא הנתיבים
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const orderRoutes = require('./routes/orderRoutes');
const productRoutes = require('./routes/productRoutes');
const uploadRoutes = require('./routes/uploadRoutes');

const app = express();

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ==========================================
// PUBLIC ROUTES
// ==========================================
app.get('/', (req, res) => {
  res.send('The Baking Corner Server is running!');
});

// ==========================================
// ROUTE MOUNTING
// ==========================================
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/products', productRoutes); // מאחד את כל פעולות המוצרים
app.use('/api/uploads', uploadRoutes);

// ==========================================
// SERVER START
// ==========================================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});