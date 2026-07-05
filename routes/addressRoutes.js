const express = require('express');
const router = express.Router();
const db = require('../config/db');
const verifyToken = require('../middleware/authMiddleware');

// GET all addresses for logged-in user
router.get('/addresses', verifyToken, async (req, res) => {
  try {
    const [addresses] = await db.query(
      'SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, created_at DESC',
      [req.user.id]
    );
    res.json(addresses);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// CREATE a new address
router.post('/addresses', verifyToken, async (req, res) => {
  try {
    const { label, full_address, city, state, pincode, phone, latitude, longitude, is_default } = req.body;

    if (!full_address || full_address.trim() === '') {
      return res.status(400).json({ error: 'Address is required' });
    }

    if (is_default) {
      await db.query('UPDATE addresses SET is_default = FALSE WHERE user_id = ?', [req.user.id]);
    }

    const [result] = await db.query(
      `INSERT INTO addresses (user_id, label, full_address, city, state, pincode, phone, latitude, longitude, is_default) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, label || 'Home', full_address, city, state, pincode, phone, latitude || null, longitude || null, is_default || false]
    );

    res.status(201).json({ id: result.insertId, message: 'Address added' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// UPDATE an address
router.put('/addresses/:id', verifyToken, async (req, res) => {
  try {
    const { label, full_address, city, state, pincode, phone, is_default } = req.body;

    if (is_default) {
      await db.query('UPDATE addresses SET is_default = FALSE WHERE user_id = ?', [req.user.id]);
    }

    await db.query(
      `UPDATE addresses SET label = ?, full_address = ?, city = ?, state = ?, pincode = ?, phone = ?, is_default = ? 
       WHERE id = ? AND user_id = ?`,
      [label, full_address, city, state, pincode, phone, is_default || false, req.params.id, req.user.id]
    );

    res.json({ message: 'Address updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// SET an address as default
router.put('/addresses/:id/default', verifyToken, async (req, res) => {
  try {
    await db.query('UPDATE addresses SET is_default = FALSE WHERE user_id = ?', [req.user.id]);
    await db.query('UPDATE addresses SET is_default = TRUE WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    res.json({ message: 'Default address updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE an address
router.delete('/addresses/:id', verifyToken, async (req, res) => {
  try {
    await db.query('DELETE FROM addresses WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    res.json({ message: 'Address deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;