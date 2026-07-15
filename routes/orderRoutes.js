const express = require('express');
const router = express.Router();
const db = require('../config/db');
const verifyToken = require('../middleware/authMiddleware');
const verifyAdmin = require('../middleware/adminMiddleware');
const { sendPushToUser } = require('./pushRoutes');

// CREATE an order (checkout)
router.post('/checkout', verifyToken, async (req, res) => {
  try {
    const { items, paymentMethod, address, deliveryFee, platformFee, discount } = req.body;
    const userId = req.user.id;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const total = subtotal + (Number(deliveryFee) || 0) + (Number(platformFee) || 0) - (Number(discount) || 0);

    if (!address || address.trim() === '') {
      return res.status(400).json({ error: 'Delivery address is required' });
    }

    const [orderResult] = await db.query(
      'INSERT INTO orders (user_id, status, payment_method, total, address) VALUES (?, ?, ?, ?, ?)',
      [userId, 'Pending', paymentMethod, total, address]
    );

    const orderId = orderResult.insertId;

    for (const item of items) {
      await db.query(
        'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
        [orderId, item.id, item.quantity, item.price]
      );
    }

    // Notify all admins about the new order
    const [admins] = await db.query('SELECT id FROM users WHERE is_admin = TRUE');
    for (const admin of admins) {
      sendPushToUser(admin.id, {
        title: 'New Order Received!',
        body: `Order #${orderId} placed — Total: ₹${total}`,
      });
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

// GET all orders (admin only)
router.get('/admin/orders', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const [orders] = await db.query(
      `SELECT orders.*, users.name AS customer_name, users.email AS customer_email
       FROM orders
       JOIN users ON orders.user_id = users.id
       ORDER BY orders.created_at DESC`
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

// UPDATE order status (admin only)
// UPDATE order status (admin only)
router.put('/orders/:id/status', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = [
      'Pending',
      'Accepted',
      'Packing',
      'Packed',
      'Shipped',
      'Out for Delivery',
      'Delivered',
      'Cancelled',
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    await db.query('UPDATE orders SET status = ? WHERE id = ?', [status, req.params.id]);

    // Send push notification to the customer
    const [orderRows] = await db.query('SELECT user_id FROM orders WHERE id = ?', [req.params.id]);
    if (orderRows.length > 0) {
      const customerId = orderRows[0].user_id;
      sendPushToUser(customerId, {
        title: 'Order Update',
        body: `Your order #${req.params.id} is now ${status}`,
      });
    }

    res.json({ message: 'Order status updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});
module.exports = router;