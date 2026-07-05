const express = require('express');
const router = express.Router();
const db = require('../config/db');
const verifyToken = require('../middleware/authMiddleware');
const verifyAdmin = require('../middleware/adminMiddleware');

// GET all active, non-expired coupons (public - for display/banner)
router.get('/coupons', async (req, res) => {
  try {
    const [coupons] = await db.query(
      `SELECT * FROM coupons WHERE is_active = TRUE AND (expiry_date IS NULL OR expiry_date >= CURDATE())`
    );
    res.json(coupons);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET all coupons (admin only - includes inactive/expired)
router.get('/admin/coupons', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const [coupons] = await db.query('SELECT * FROM coupons ORDER BY created_at DESC');
    res.json(coupons);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// CREATE a coupon (admin only)
router.post('/coupons', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { code, discount_type, discount_value, min_order_amount, expiry_date } = req.body;

    if (!code || !discount_value) {
      return res.status(400).json({ error: 'Code and discount value are required' });
    }

    const [result] = await db.query(
      `INSERT INTO coupons (code, discount_type, discount_value, min_order_amount, expiry_date) 
       VALUES (?, ?, ?, ?, ?)`,
      [code.toUpperCase(), discount_type || 'percent', discount_value, min_order_amount || 0, expiry_date || null]
    );

    res.status(201).json({ id: result.insertId, message: 'Coupon created' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Coupon code already exists' });
    }
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// TOGGLE coupon active/inactive (admin only)
router.put('/coupons/:id/toggle', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const [coupon] = await db.query('SELECT is_active FROM coupons WHERE id = ?', [req.params.id]);
    if (coupon.length === 0) return res.status(404).json({ error: 'Coupon not found' });

    const newStatus = !coupon[0].is_active;
    await db.query('UPDATE coupons SET is_active = ? WHERE id = ?', [newStatus, req.params.id]);
    res.json({ message: 'Coupon status updated', is_active: newStatus });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE a coupon (admin only)
router.delete('/coupons/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    await db.query('DELETE FROM coupons WHERE id = ?', [req.params.id]);
    res.json({ message: 'Coupon deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// VALIDATE/apply a coupon code (used at checkout)
router.post('/coupons/apply', verifyToken, async (req, res) => {
  try {
    const { code, orderTotal } = req.body;

    const [coupons] = await db.query(
      `SELECT * FROM coupons WHERE code = ? AND is_active = TRUE AND (expiry_date IS NULL OR expiry_date >= CURDATE())`,
      [code.toUpperCase()]
    );

    if (coupons.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired coupon code' });
    }

    const coupon = coupons[0];

    if (orderTotal < coupon.min_order_amount) {
      return res.status(400).json({
        error: `Minimum order amount of ₹${coupon.min_order_amount} required for this coupon`,
      });
    }

    let discountAmount;
    if (coupon.discount_type === 'percent') {
      discountAmount = (orderTotal * coupon.discount_value) / 100;
    } else {
      discountAmount = coupon.discount_value;
    }

    discountAmount = Math.min(discountAmount, orderTotal);

    res.json({
      code: coupon.code,
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
      discountAmount: Math.round(discountAmount * 100) / 100,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;