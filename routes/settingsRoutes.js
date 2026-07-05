const express = require('express');
const router = express.Router();
const db = require('../config/db');
const verifyToken = require('../middleware/authMiddleware');
const verifyAdmin = require('../middleware/adminMiddleware');

// GET settings (public - needed at checkout)
router.get('/settings', async (req, res) => {
  try {
    const [settings] = await db.query('SELECT * FROM settings LIMIT 1');
    res.json(settings[0] || { delivery_fee: 0, platform_fee: 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// UPDATE settings (admin only)
router.put('/settings', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { delivery_fee, platform_fee } = req.body;
    await db.query('UPDATE settings SET delivery_fee = ?, platform_fee = ?', [
      delivery_fee || 0,
      platform_fee || 0,
    ]);
    res.json({ message: 'Settings updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;