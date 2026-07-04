const db = require('../config/db');

async function verifyAdmin(req, res, next) {
  try {
    const [users] = await db.query('SELECT is_admin FROM users WHERE id = ?', [req.user.id]);

    if (users.length === 0 || !users[0].is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    next();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

module.exports = verifyAdmin;