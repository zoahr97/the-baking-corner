const pool = require('../config/db');

// שליפת כל המוצרים
const getAll = async () => {
  const [rows] = await pool.query('SELECT * FROM products');
  return rows;
};

// שליפת מוצר לפי ID
const getById = async (id) => {
  const [rows] = await pool.query('SELECT * FROM products WHERE id = ?', [id]);
  return rows[0];
};

// הוספת מוצר חדש (אדמין)
const create = async (productData) => {
  const { name, description, price, category, image_url, stock = 10 } = productData;
  const [result] = await pool.query(
    `INSERT INTO products (name, description, price, category, image_url, stock) VALUES (?, ?, ?, ?, ?, ?)`,
    [name, description, price, category, image_url, stock]
  );
  return result.insertId;
};

// עדכון מוצר (אדמין)
const update = async (id, productData) => {
  const { name, price, stock, category, image_url, description } = productData;
  const [result] = await pool.query(
    `UPDATE products SET name = ?, price = ?, stock = ?, category = ?, image_url = ?, description = ? WHERE id = ?`,
    [name, price, stock, category, image_url, description, id]
  );
  return result.affectedRows;
};

// מחיקת מוצר (אדמין)
const remove = async (id) => {
  const [result] = await pool.query('DELETE FROM products WHERE id = ?', [id]);
  return result.affectedRows;
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove
};