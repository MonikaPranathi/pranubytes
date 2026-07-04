const express = require('express');
const router = express.Router();
const db = require('../config/db');
const verifyToken = require('../middleware/authMiddleware');
const verifyAdmin = require('../middleware/adminMiddleware');

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

// CREATE a category (admin only)
router.post('/categories', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Category name is required' });
    }
    const [result] = await db.query('INSERT INTO categories (name) VALUES (?)', [name]);
    res.status(201).json({ id: result.insertId, name });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE a category (admin only)
router.delete('/categories/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    await db.query('DELETE FROM categories WHERE id = ?', [req.params.id]);
    res.json({ message: 'Category deleted' });
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

// CREATE a product (admin only)
router.post('/products', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { category_id, name, price, weight, image_url, description, stock, discount } = req.body;

    if (!name || !price || !category_id) {
      return res.status(400).json({ error: 'Name, price, and category are required' });
    }

    const [result] = await db.query(
      `INSERT INTO products (category_id, name, price, weight, image_url, description, stock, discount) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [category_id, name, price, weight || '', image_url || '', description || '', stock || 0, discount || 0]
    );

    res.status(201).json({ message: 'Product created', id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// UPDATE a product (admin only)
router.put('/products/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { category_id, name, price, weight, image_url, description, stock, discount } = req.body;

    await db.query(
      `UPDATE products SET 
        category_id = ?, name = ?, price = ?, weight = ?, 
        image_url = ?, description = ?, stock = ?, discount = ?
       WHERE id = ?`,
      [category_id, name, price, weight, image_url, description, stock, discount, req.params.id]
    );

    res.json({ message: 'Product updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE a product (admin only)
router.delete('/products/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    await db.query('DELETE FROM products WHERE id = ?', [req.params.id]);
    res.json({ message: 'Product deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;