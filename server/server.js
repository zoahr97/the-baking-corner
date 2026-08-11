const express = require('express');
const cors = require('cors');
const path = require('path');

require('dotenv').config();

const productRoutes = require(
  './routes/productRoutes'
);

const authRoutes = require(
  './routes/authRoutes'
);

const orderRoutes = require(
  './routes/orderRoutes'
);

const userRoutes = require(
  './routes/userRoutes'
);

const uploadRoutes = require(
  './routes/uploadRoutes'
);

const app = express();

app.use(cors());
app.use(express.json());

/*
  מאפשר לדפדפן להציג תמונות
  מתוך תיקיית uploads.
*/
app.use(
  '/uploads',
  express.static(
    path.join(__dirname, 'uploads')
  )
);

// ==========================================
// PUBLIC ROUTE
// ==========================================

app.get('/', (req, res) => {
  res.send(
    'The Baking Corner Server is running!'
  );
});

// ==========================================
// API ROUTES
// ==========================================

app.use(
  '/api/products',
  productRoutes
);

app.use(
  '/api/auth',
  authRoutes
);

app.use(
  '/api/users',
  userRoutes
);

app.use(
  '/api/uploads',
  uploadRoutes
);

/*
  orderRoutes מכיל:
  /api/orders
  /api/my-orders
*/
app.use('/api', orderRoutes);

// ==========================================
// SERVER
// ==========================================

const PORT =
  process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(
    `Server is running on port ${PORT}`
  );
});