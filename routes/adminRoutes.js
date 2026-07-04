const express = require('express');
const router = express.Router();
const db = require('../config/db');
const verifyToken = require('../middleware/authMiddleware');
const verifyAdmin = require('../middleware/adminMiddleware');

// GET dashboard stats (admin only)
router.get('/dashboard', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const [[{ totalOrders }]] = await db.query('SELECT COUNT(*) AS totalOrders FROM orders');
    const [[{ totalProducts }]] = await db.query('SELECT COUNT(*) AS totalProducts FROM products');
    const [[{ totalCustomers }]] = await db.query('SELECT COUNT(*) AS totalCustomers FROM users WHERE is_admin = FALSE');
    const [[{ totalRevenue }]] = await db.query(
      `SELECT COALESCE(SUM(total), 0) AS totalRevenue FROM orders WHERE status != 'Cancelled'`
    );
    const [[{ todaySales }]] = await db.query(
      `SELECT COALESCE(SUM(total), 0) AS todaySales FROM orders 
       WHERE DATE(created_at) = CURDATE() AND status != 'Cancelled'`
    );

    const [statusCounts] = await db.query(
      `SELECT status, COUNT(*) AS count FROM orders GROUP BY status`
    );

    const [lowStockProducts] = await db.query(
      `SELECT id, name, stock FROM products WHERE stock < 5`
    );

    res.json({
      totalOrders,
      totalProducts,
      totalCustomers,
      totalRevenue,
      todaySales,
      statusCounts,
      lowStockProducts,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;