const pool = require('../config/db');

// --- CUSTOMER ACTIONS ---

const getMyOrders = async (req, res) => {
  try {
    const [orders] = await pool.query(
      `SELECT id, total_amount, status, order_date, shipping_city, shipping_address, payment_method 
       FROM orders WHERE user_id = ? ORDER BY order_date DESC`,
      [req.user.id]
    );
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch your orders' });
  }
};

const getMyOrderItems = async (req, res) => {
  const { id } = req.params;
  try {
    const [items] = await pool.query(
      `SELECT oi.id, p.name AS product_name, oi.quantity, oi.price_at_purchase, 
       (oi.quantity * oi.price_at_purchase) AS item_total 
       FROM orders o JOIN order_items oi ON oi.order_id = o.id 
       JOIN products p ON p.id = oi.product_id 
       WHERE o.id = ? AND o.user_id = ?`,
      [id, req.user.id]
    );
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch order details' });
  }
};

const cancelMyOrder = async (req, res) => {
  const { id } = req.params;
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [orderRows] = await connection.query(
      `SELECT status FROM orders WHERE id = ? AND user_id = ? FOR UPDATE`,
      [id, req.user.id]
    );
    if (orderRows.length === 0) return res.status(404).json({ error: 'Order not found' });
    if (orderRows[0].status !== 'pending') return res.status(400).json({ error: 'Only pending orders can be cancelled' });

    await connection.query(
      `UPDATE products p JOIN order_items oi ON oi.product_id = p.id 
       SET p.stock = p.stock + oi.quantity WHERE oi.order_id = ?`, [id]
    );
    await connection.query(
      `UPDATE orders SET status = 'cancelled' WHERE id = ? AND user_id = ?`, [id, req.user.id]
    );
    await connection.commit();
    res.json({ message: 'Order cancelled successfully' });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: 'Failed to cancel order' });
  } finally {
    connection.release();
  }
};

const createOrder = async (req, res) => {
  const { cart, customerDetails } = req.body;
  const userId = req.user.id;
  // (כאן נכנסת בדיוק אותה הלוגיקה העסקית הארוכה שכתבת ליצירת הזמנה מהקובץ המקורי)
  // ... [הכנס את בלוק ה-try/catch הארוך של יצירת ההזמנה כאן] ...
};

// --- ADMIN ACTIONS ---

const getAllOrders = async (req, res) => {
  try {
    const [orders] = await pool.query(`SELECT * FROM orders ORDER BY order_date DESC`);
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
};

const getOrderItems = async (req, res) => {
  const { id } = req.params;
  try {
    const [items] = await pool.query(
      `SELECT oi.id, oi.product_id, p.name AS product_name, oi.quantity, oi.price_at_purchase, 
       (oi.quantity * oi.price_at_purchase) AS item_total 
       FROM order_items oi JOIN products p ON p.id = oi.product_id WHERE oi.order_id = ?`,
      [id]
    );
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch order items' });
  }
};

const updateOrderStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  // (כאן נכנסת לוגיקת העדכון והמלאי של האדמין מהקובץ המקורי)
  // ... [הכנס את בלוק העדכון והבדיקות כאן] ...
};

module.exports = {
  getMyOrders, getMyOrderItems, cancelMyOrder, createOrder,
  getAllOrders, getOrderItems, updateOrderStatus
};