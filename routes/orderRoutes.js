const express = require('express');
const router = express.Router();
const db = require('../config/db');
const verifyToken = require('../middleware/authMiddleware');

// CREATE an order (checkout)
router.post('/checkout', verifyToken, async (req, res) => {
  try {
    const { items, paymentMethod, address } = req.body;
    const userId = req.user.id;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    if (!address || address.trim() === '') {
      return res.status(400).json({ error: 'Delivery address is required' });
    }

    const [orderResult] = await db.query(
      'INSERT INTO orders (user_id, status, payment_method, total, address) VALUES (?, ?, ?, ?, ?)',
      [userId, 'Placed', paymentMethod, total, address]
    );

    const orderId = orderResult.insertId;

    for (const item of items) {
      await db.query(
        'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
        [orderId, item.id, item.quantity, item.price]
      );
    }

    res.status(201).json({ message: 'Order placed successfully', orderId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET all orders for logged-in user
router.get('/orders', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const [orders] = await db.query(
      'SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );
    res.json(orders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET single order with its items
router.get('/orders/:id', verifyToken, async (req, res) => {
  try {
    const [order] = await db.query('SELECT * FROM orders WHERE id = ?', [req.params.id]);
    if (order.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const [items] = await db.query(
      `SELECT order_items.*, products.name, products.weight 
       FROM order_items 
       JOIN products ON order_items.product_id = products.id 
       WHERE order_id = ?`,
      [req.params.id]
    );

    res.json({ ...order[0], items });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;