const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const pool = require('./config/db');
const productRoutes = require('./routes/productRoutes');
const authRoutes = require('./routes/authRoutes');

const {
  verifyToken,
  verifyAdmin
} = require('./middlewares/authMiddleware');

const {
  uploadProductImage
} = require(
  './middlewares/uploadMiddleware'
);

const app = express();

app.use(cors());
app.use(express.json());
app.use(
  '/uploads',
  express.static(
    path.join(__dirname, 'uploads')
  )
);

// ==========================================
// PUBLIC ROUTES
// ==========================================

app.get('/', (req, res) => {
  res.send('The Baking Corner Server is running!');
});

app.use('/api/products', productRoutes);
app.use('/api/auth', authRoutes);

// ==========================================
// ADMIN USERS
// ==========================================

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
      console.error('Error fetching users:', error);

      res.status(500).json({
        error: 'Failed to fetch users'
      });
    }
  }
);

// ==========================================
// CUSTOMER ORDERS
// ==========================================

// Get orders belonging to the logged-in user
app.get(
  '/api/my-orders',
  verifyToken,
  async (req, res) => {
    try {
      const [orders] = await pool.query(
        `SELECT
          id,
          total_amount,
          status,
          order_date,
          shipping_city,
          shipping_address,
          payment_method
         FROM orders
         WHERE user_id = ?
         ORDER BY order_date DESC`,
        [req.user.id]
      );

      res.json(orders);
    } catch (error) {
      console.error(
        'Error fetching customer orders:',
        error
      );

      res.status(500).json({
        error: 'Failed to fetch your orders'
      });
    }
  }
);

// Get products from one of the user's orders
app.get(
  '/api/my-orders/:id/items',
  verifyToken,
  async (req, res) => {
    const { id } = req.params;

    try {
      const [items] = await pool.query(
        `SELECT
          oi.id,
          p.name AS product_name,
          oi.quantity,
          oi.price_at_purchase,
          (
            oi.quantity *
            oi.price_at_purchase
          ) AS item_total
         FROM orders o
         JOIN order_items oi
           ON oi.order_id = o.id
         JOIN products p
           ON p.id = oi.product_id
         WHERE o.id = ?
           AND o.user_id = ?`,
        [id, req.user.id]
      );

      res.json(items);
    } catch (error) {
      console.error(
        'Error fetching customer order items:',
        error
      );

      res.status(500).json({
        error: 'Failed to fetch order details'
      });
    }
  }
);

// Customer cancels their own pending order
app.put(
  '/api/my-orders/:id/cancel',
  verifyToken,
  async (req, res) => {
    const { id } = req.params;
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const [orderRows] = await connection.query(
        `SELECT status
         FROM orders
         WHERE id = ?
           AND user_id = ?
         FOR UPDATE`,
        [id, req.user.id]
      );

      if (orderRows.length === 0) {
        await connection.rollback();

        return res.status(404).json({
          error: 'Order not found'
        });
      }

      if (orderRows[0].status !== 'pending') {
        await connection.rollback();

        return res.status(400).json({
          error: 'Only pending orders can be cancelled'
        });
      }

      // Return all ordered quantities to inventory
      await connection.query(
        `UPDATE products p
         JOIN order_items oi
           ON oi.product_id = p.id
         SET p.stock = p.stock + oi.quantity
         WHERE oi.order_id = ?`,
        [id]
      );

      await connection.query(
        `UPDATE orders
         SET status = 'cancelled'
         WHERE id = ?
           AND user_id = ?`,
        [id, req.user.id]
      );

      await connection.commit();

      res.json({
        message: 'Order cancelled successfully'
      });
    } catch (error) {
      await connection.rollback();

      console.error(
        'Error cancelling order:',
        error
      );

      res.status(500).json({
        error: 'Failed to cancel order'
      });
    } finally {
      connection.release();
    }
  }
);

// ==========================================
// ADMIN ORDERS
// ==========================================

// Get every order for the Admin Panel
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
      console.error('Error fetching orders:', error);

      res.status(500).json({
        error: 'Failed to fetch orders'
      });
    }
  }
);

// Get products belonging to an order
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

// Admin updates order status and inventory
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

    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const [orderRows] = await connection.query(
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

      const previousStatus = orderRows[0].status;

      // Cancelling an active order returns its products
      if (
        previousStatus !== 'cancelled' &&
        status === 'cancelled'
      ) {
        await connection.query(
          `UPDATE products p
           JOIN order_items oi
             ON oi.product_id = p.id
           SET p.stock = p.stock + oi.quantity
           WHERE oi.order_id = ?`,
          [id]
        );
      }

      // Reopening a cancelled order reduces inventory again
      if (
        previousStatus === 'cancelled' &&
        status !== 'cancelled'
      ) {
        const [items] = await connection.query(
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
          if (
            Number(item.stock) <
            Number(item.quantity)
          ) {
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
            [item.quantity, item.product_id]
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

app.post(
  '/api/orders',
  verifyToken,
  async (req, res) => {
    const {
      cart,
      customerDetails
    } = req.body;

    const userId = req.user.id;

    if (
      !Array.isArray(cart) ||
      cart.length === 0
    ) {
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

    /*
      Combine repeated products and validate
      product IDs and quantities.
    */
    const quantitiesByProduct =
      new Map();

    for (const item of cart) {
      const productId = Number(item.id);
      const quantity =
        Number(item.quantity);

      if (
        !Number.isInteger(productId) ||
        productId <= 0 ||
        !Number.isInteger(quantity) ||
        quantity <= 0
      ) {
        return res.status(400).json({
          error:
            'Invalid product or quantity'
        });
      }

      const existingQuantity =
        quantitiesByProduct.get(
          productId
        ) || 0;

      quantitiesByProduct.set(
        productId,
        existingQuantity + quantity
      );
    }

    const connection =
      await pool.getConnection();

    try {
      await connection.beginTransaction();

      const validatedItems = [];
      let serverTotal = 0;

      /*
        Read the real price and stock from
        MySQL. Do not trust client prices.
      */
      for (
        const [
          productId,
          quantity
        ] of quantitiesByProduct
      ) {
        const [productRows] =
          await connection.query(
            `SELECT
              id,
              name,
              price,
              stock
             FROM products
             WHERE id = ?
             FOR UPDATE`,
            [productId]
          );

        if (productRows.length === 0) {
          throw new Error(
            `Product ${productId} was not found`
          );
        }

        const product =
          productRows[0];

        if (
          Number(product.stock) <
          quantity
        ) {
          throw new Error(
            `Not enough stock for ${product.name}. Available: ${product.stock}`
          );
        }

        const realPrice =
          Number(product.price);

        serverTotal +=
          realPrice * quantity;

        validatedItems.push({
          productId,
          name: product.name,
          quantity,
          price: realPrice
        });
      }

      serverTotal = Number(
        serverTotal.toFixed(2)
      );

      /*
        The total saved in the order is the
        value calculated by the server.
      */
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
            serverTotal,
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

      /*
        Save the real database price and
        reduce inventory.
      */
      for (
        const item of validatedItems
      ) {
        await connection.query(
          `INSERT INTO order_items (
            order_id,
            product_id,
            quantity,
            price_at_purchase
          ) VALUES (?, ?, ?, ?)`,
          [
            orderId,
            item.productId,
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
            item.productId
          ]
        );
      }

      await connection.commit();

      res.status(201).json({
        message:
          'Order placed successfully',
        orderId,
        totalPrice: serverTotal
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
app.post(
  '/api/uploads/product-image',
  verifyToken,
  verifyAdmin,
  (req, res) => {
    uploadProductImage.single('image')(
      req,
      res,
      (error) => {
        if (error) {
          return res.status(400).json({
            error: error.message
          });
        }

        if (!req.file) {
          return res.status(400).json({
            error: 'Please select an image'
          });
        }

        const imageUrl =
          `${req.protocol}://${req.get('host')}` +
          `/uploads/products/${req.file.filename}`;

        res.status(201).json({
          message:
            'Image uploaded successfully',
          imageUrl
        });
      }
    );
  }
);
// ==========================================
// ADMIN PRODUCTS
// ==========================================

// Add a new product
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

// Update an existing product
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
        message: 'Product updated successfully'
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

// Delete a product
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
        message: 'Product deleted successfully'
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
  console.log(`Server is running on port ${PORT}`);
});