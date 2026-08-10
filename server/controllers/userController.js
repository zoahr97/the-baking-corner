const pool = require('../config/db'); 

const getAllUsers = async (req, res) => {
  try {
    const [users] = await pool.query(
      `SELECT id, first_name, last_name, email, role FROM users`
    );
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

module.exports = { getAllUsers };