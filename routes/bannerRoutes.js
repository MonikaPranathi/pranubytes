const express = require('express');
const router = express.Router();
const db = require('../config/db');
const verifyToken = require('../middleware/authMiddleware');
const verifyAdmin = require('../middleware/adminMiddleware');

// GET all active banners (public - for Home page)
router.get('/banners', async (req, res) => {
  try {
    const [banners] = await db.query('SELECT * FROM banners WHERE is_active = TRUE ORDER BY created_at DESC');
    res.json(banners);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET all banners (admin only - includes inactive)
router.get('/admin/banners', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const [banners] = await db.query('SELECT * FROM banners ORDER BY created_at DESC');
    res.json(banners);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// CREATE a banner (admin only)
router.post('/banners', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { image_url, title } = req.body;
    if (!image_url) {
      return res.status(400).json({ error: 'Image is required' });
    }
    const [result] = await db.query(
      'INSERT INTO banners (image_url, title) VALUES (?, ?)',
      [image_url, title || '']
    );
    res.status(201).json({ id: result.insertId, message: 'Banner added' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// TOGGLE banner active/inactive (admin only)
router.put('/banners/:id/toggle', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const [banner] = await db.query('SELECT is_active FROM banners WHERE id = ?', [req.params.id]);
    if (banner.length === 0) {
      return res.status(404).json({ error: 'Banner not found' });
    }
    const newStatus = !banner[0].is_active;
    await db.query('UPDATE banners SET is_active = ? WHERE id = ?', [newStatus, req.params.id]);
    res.json({ message: 'Banner status updated', is_active: newStatus });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE a banner (admin only)
router.delete('/banners/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    await db.query('DELETE FROM banners WHERE id = ?', [req.params.id]);
    res.json({ message: 'Banner deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;