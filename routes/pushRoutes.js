const express = require('express');
const router = express.Router();
const webpush = require('web-push');
const db = require('../config/db');
const verifyToken = require('../middleware/authMiddleware');
const verifyAdmin = require('../middleware/adminMiddleware');

webpush.setVapidDetails(
  'mailto:admin@pranubytes.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

// SUBSCRIBE to push notifications
router.post('/push/subscribe', verifyToken, async (req, res) => {
  try {
    const { endpoint, keys } = req.body;
    const userId = req.user.id;

    const [existing] = await db.query('SELECT id FROM push_subscriptions WHERE endpoint = ?', [endpoint]);
    if (existing.length > 0) {
      return res.json({ message: 'Already subscribed' });
    }

    await db.query(
      'INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth) VALUES (?, ?, ?, ?)',
      [userId, endpoint, keys.p256dh, keys.auth]
    );

    res.status(201).json({ message: 'Subscribed successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Helper function: send a push notification to a specific user
async function sendPushToUser(userId, payload) {
  try {
    const [subs] = await db.query('SELECT * FROM push_subscriptions WHERE user_id = ?', [userId]);

    for (const sub of subs) {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      };

      try {
        await webpush.sendNotification(pushSubscription, JSON.stringify(payload));
      } catch (err) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          await db.query('DELETE FROM push_subscriptions WHERE id = ?', [sub.id]);
        }
      }
    }
  } catch (err) {
    console.error('Push send error:', err);
  }
}

// Helper function: send a push notification to ALL subscribed users
async function sendPushToAll(payload) {
  try {
    const [subs] = await db.query('SELECT * FROM push_subscriptions');

    for (const sub of subs) {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      };

      try {
        await webpush.sendNotification(pushSubscription, JSON.stringify(payload));
      } catch (err) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          await db.query('DELETE FROM push_subscriptions WHERE id = ?', [sub.id]);
        }
      }
    }
  } catch (err) {
    console.error('Push send error:', err);
  }
}

// ADMIN: broadcast a notification to all subscribed customers
router.post('/push/broadcast', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { title, body } = req.body;
    if (!title || !body) {
      return res.status(400).json({ error: 'Title and body are required' });
    }

    await sendPushToAll({ title, body });
    res.json({ message: 'Broadcast sent' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = { router, sendPushToUser, sendPushToAll };