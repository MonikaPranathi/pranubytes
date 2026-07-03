const express = require('express');
const router = express.Router();
const db = require('../config/db');

// GET all categories
router.get('/categories', async (req, res) => {
  try {
    const [categories] = await db.query('SELECT * FROM categories');
    res.json(categories);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET all products (optionally filter by category)
router.get('/products', async (req, res) => {
  try {
    const { category_id } = req.query;
    let query = 'SELECT * FROM products';
    let params = [];

    if (category_id) {
      query += ' WHERE category_id = ?';
      params.push(category_id);
    }

    const [products] = await db.query(query, params);
    res.json(products);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET single product by id
router.get('/products/:id', async (req, res) => {
  try {
    const [product] = await db.query('SELECT * FROM products WHERE id = ?', [req.params.id]);
    if (product.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(product[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;