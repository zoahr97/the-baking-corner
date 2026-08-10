const pool = require('../config/db');

// מציאת משתמש לפי אימייל (משמש בעיקר בהתחברות)
const findByEmail = async (email) => {
  const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
  return rows[0];
};

// מציאת משתמש לפי ID
const findById = async (id) => {
  const [rows] = await pool.query('SELECT id, first_name, last_name, email, role FROM users WHERE id = ?', [id]);
  return rows[0];
};

// יצירת משתמש חדש (הרשמה)
const createUser = async (firstName, lastName, email, hashedPassword, role = 'customer') => {
  const [result] = await pool.query(
    'INSERT INTO users (first_name, last_name, email, password, role) VALUES (?, ?, ?, ?, ?)',
    [firstName, lastName, email, hashedPassword, role]
  );
  return result.insertId;
};

module.exports = {
  findByEmail,
  findById,
  createUser
};