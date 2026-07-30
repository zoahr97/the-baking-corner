const express = require('express');
const cors = require('cors');
require('dotenv').config();

const pool = require('./config/db');

const productRoutes = require(
  './routes/productRoutes'
);

const authRoutes = require(
  './routes/authRoutes'
);

const {
  verifyToken,
  verifyAdmin
} = require('./middlewares/authMiddleware');

const app = express();

// General middleware
app.use(cors());
app.use(express.json());

// Public routes
app.get('/', (req, res) => {
  res.send(
    'The Baking Corner Server is running!'
  );
});

app.use('/api/products', productRoutes);
app.use('/api/auth', authRoutes);

// ==========================================
// ADMIN USERS
// ==========================================

// GET: Fetch all users
app.get(
  '/api/users',
  verifyToken,
  verifyAdmin,
  async (req, res) => {
    try {
      const [users] = await pool.query(
        `SELECT
          id,
          first_name,
          last_name,
          email,
          role
         FROM users`
      );

      res.json(users);
    } catch (error) {
      console.error(
        'Error fetching users:',
        error
      );

      res.status(500).json({
        error: 'Failed to fetch users'
      });
    }
  }
);

// ==========================================
// ADMIN ORDERS
// ==========================================

// GET: Fetch all orders
app.get(
  '/api/orders',
  verifyToken,
  verifyAdmin,
  async (req, res) => {
    try {
      const [orders] = await pool.query(
        `SELECT *
         FROM orders
         ORDER BY order_date DESC`
      );

      res.json(orders);
    } catch (error) {
      console.error(
        'Error fetching orders:',
        error
      );

      res.status(500).json({
        error: 'Failed to fetch orders'
      });
    }
  }
);

// GET: Fetch products belonging to an order
app.get(
  '/api/orders/:id/items',
  verifyToken,
  verifyAdmin,
  async (req, res) => {
    const { id } = req.params;

    try {
      const [items] = await pool.query(
        `SELECT
          oi.id,
          oi.product_id,
          p.name AS product_name,
          oi.quantity,
          oi.price_at_purchase,
          (
            oi.quantity *
            oi.price_at_purchase
          ) AS item_total
         FROM order_items oi
         JOIN products p
           ON p.id = oi.product_id
         WHERE oi.order_id = ?`,
        [id]
      );

      res.json(items);
    } catch (error) {
      console.error(
        'Error fetching order items:',
        error
      );

      res.status(500).json({
        error: 'Failed to fetch order items'
      });
    }
  }
);

// PUT: Update order status and inventory
app.put(
  '/api/orders/:id/status',
  verifyToken,
  verifyAdmin,
  async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    const allowedStatuses = [
      'pending',
      'processing',
      'shipped',
      'delivered',
      'cancelled'
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        error: 'Invalid order status'
      });
    }

    const connection =
      await pool.getConnection();

    try {
      await connection.beginTransaction();

      const [orderRows] =
        await connection.query(
          `SELECT status
           FROM orders
           WHERE id = ?
           FOR UPDATE`,
          [id]
        );

      if (orderRows.length === 0) {
        await connection.rollback();

        return res.status(404).json({
          error: 'Order not found'
        });
      }

      const previousStatus =
        orderRows[0].status;

      /*
        When an active order is cancelled,
        return its products to inventory.
      */
      if (
        previousStatus !== 'cancelled' &&
        status === 'cancelled'
      ) {
        await connection.query(
          `UPDATE products p
           JOIN order_items oi
             ON oi.product_id = p.id
           SET p.stock =
             p.stock + oi.quantity
           WHERE oi.order_id = ?`,
          [id]
        );
      }

      /*
        When a cancelled order is reopened,
        verify inventory and reduce it again.
      */
      if (
        previousStatus === 'cancelled' &&
        status !== 'cancelled'
      ) {
        const [items] =
          await connection.query(
            `SELECT
              oi.product_id,
              oi.quantity,
              p.name,
              p.stock
             FROM order_items oi
             JOIN products p
               ON p.id = oi.product_id
             WHERE oi.order_id = ?
             FOR UPDATE`,
            [id]
          );

        for (const item of items) {
          if (item.stock < item.quantity) {
            throw new Error(
              `Cannot reopen order. Not enough stock for ${item.name}`
            );
          }
        }

        for (const item of items) {
          await connection.query(
            `UPDATE products
             SET stock = stock - ?
             WHERE id = ?`,
            [
              item.quantity,
              item.product_id
            ]
          );
        }
      }

      await connection.query(
        `UPDATE orders
         SET status = ?
         WHERE id = ?`,
        [status, id]
      );

      await connection.commit();

      res.json({
        message:
          'Order status and inventory updated successfully'
      });
    } catch (error) {
      await connection.rollback();

      console.error(
        'Error updating order status:',
        error
      );

      res.status(500).json({
        error:
          error.message ||
          'Failed to update order status'
      });
    } finally {
      connection.release();
    }
  }
);

// ==========================================
// CUSTOMER CHECKOUT
// ==========================================

// POST: Create a new order
app.post(
  '/api/orders',
  verifyToken,
  async (req, res) => {
    const {
      cart,
      totalPrice,
      customerDetails
    } = req.body;

    // The user ID comes from the verified JWT
    const userId = req.user.id;

    if (!cart || cart.length === 0) {
      return res.status(400).json({
        error: 'Cart is empty'
      });
    }

    if (
      !customerDetails ||
      !customerDetails.fullName ||
      !customerDetails.email ||
      !customerDetails.phone ||
      !customerDetails.city ||
      !customerDetails.address
    ) {
      return res.status(400).json({
        error:
          'Customer and shipping details are required'
      });
    }

    const allowedPaymentMethods = [
      'credit-card',
      'cash'
    ];

    if (
      !allowedPaymentMethods.includes(
        customerDetails.paymentMethod
      )
    ) {
      return res.status(400).json({
        error: 'Invalid payment method'
      });
    }

    const connection =
      await pool.getConnection();

    try {
      await connection.beginTransaction();

      const [orderResult] =
        await connection.query(
          `INSERT INTO orders (
            user_id,
            total_amount,
            status,
            customer_name,
            customer_email,
            customer_phone,
            shipping_city,
            shipping_address,
            payment_method
          ) VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?, ?
          )`,
          [
            userId,
            totalPrice,
            'pending',
            customerDetails.fullName,
            customerDetails.email,
            customerDetails.phone,
            customerDetails.city,
            customerDetails.address,
            customerDetails.paymentMethod
          ]
        );

      const orderId =
        orderResult.insertId;

      for (const item of cart) {
        const [productRows] =
          await connection.query(
            `SELECT
              name,
              stock
             FROM products
             WHERE id = ?
             FOR UPDATE`,
            [item.id]
          );

        if (productRows.length === 0) {
          throw new Error(
            `Product ${item.id} was not found`
          );
        }

        const product = productRows[0];

        if (
          Number(product.stock) <
          Number(item.quantity)
        ) {
          throw new Error(
            `Not enough stock for ${product.name}. Available: ${product.stock}`
          );
        }

        await connection.query(
          `INSERT INTO order_items (
            order_id,
            product_id,
            quantity,
            price_at_purchase
          ) VALUES (?, ?, ?, ?)`,
          [
            orderId,
            item.id,
            item.quantity,
            item.price
          ]
        );

        await connection.query(
          `UPDATE products
           SET stock = stock - ?
           WHERE id = ?`,
          [
            item.quantity,
            item.id
          ]
        );
      }

      await connection.commit();

      res.status(201).json({
        message:
          'Order placed successfully',
        orderId
      });
    } catch (error) {
      await connection.rollback();

      console.error(
        'Error processing order:',
        error
      );

      res.status(500).json({
        error:
          error.message ||
          'Server error processing order'
      });
    } finally {
      connection.release();
    }
  }
);

// ==========================================
// ADMIN PRODUCTS
// ==========================================

// POST: Add a new product
app.post(
  '/api/products',
  verifyToken,
  verifyAdmin,
  async (req, res) => {
    const {
      name,
      description,
      price,
      category,
      image_url,
      stock = 10
    } = req.body;

    try {
      const [result] = await pool.query(
        `INSERT INTO products (
          name,
          description,
          price,
          category,
          image_url,
          stock
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          name,
          description,
          price,
          category,
          image_url,
          stock
        ]
      );

      res.status(201).json({
        id: result.insertId,
        name,
        description,
        price,
        category,
        image_url,
        stock
      });
    } catch (error) {
      console.error(
        'Error adding product:',
        error
      );

      res.status(500).json({
        error: 'Failed to add product'
      });
    }
  }
);

// PUT: Update an existing product
app.put(
  '/api/products/:id',
  verifyToken,
  verifyAdmin,
  async (req, res) => {
    const { id } = req.params;

    const {
      name,
      price,
      stock,
      category,
      image_url,
      description
    } = req.body;

    try {
      const [result] = await pool.query(
        `UPDATE products
         SET
           name = ?,
           price = ?,
           stock = ?,
           category = ?,
           image_url = ?,
           description = ?
         WHERE id = ?`,
        [
          name,
          price,
          stock,
          category,
          image_url,
          description,
          id
        ]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({
          error: 'Product not found'
        });
      }

      res.json({
        message:
          'Product updated successfully'
      });
    } catch (error) {
      console.error(
        'Error updating product:',
        error
      );

      res.status(500).json({
        error: 'Failed to update product'
      });
    }
  }
);

// DELETE: Delete a product
app.delete(
  '/api/products/:id',
  verifyToken,
  verifyAdmin,
  async (req, res) => {
    const { id } = req.params;

    try {
      const [result] = await pool.query(
        `DELETE FROM products
         WHERE id = ?`,
        [id]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({
          error: 'Product not found'
        });
      }

      res.json({
        message:
          'Product deleted successfully'
      });
    } catch (error) {
      console.error(
        'Error deleting product:',
        error
      );

      res.status(500).json({
        error:
          'Failed to delete product. It may belong to an existing order.'
      });
    }
  }
);

// ==========================================
// SERVER
// ==========================================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(
    `Server is running on port ${PORT}`
  );
});