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

// GET all products WITH their variants (optionally filter by category)
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

    const productIds = products.map((p) => p.id);
    let variants = [];
    if (productIds.length > 0) {
      const [variantRows] = await db.query(
        `SELECT * FROM product_variants WHERE product_id IN (${productIds.map(() => '?').join(',')})`,
        productIds
      );
      variants = variantRows;
    }

    const productsWithVariants = products.map((product) => ({
      ...product,
      variants: variants.filter((v) => v.product_id === product.id),
    }));

    res.json(productsWithVariants);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET single product by id WITH variants
router.get('/products/:id', async (req, res) => {
  try {
    const [product] = await db.query('SELECT * FROM products WHERE id = ?', [req.params.id]);
    if (product.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const [variants] = await db.query('SELECT * FROM product_variants WHERE product_id = ?', [req.params.id]);

    res.json({ ...product[0], variants });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// CREATE a product WITH variants (admin only)
router.post('/products', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { category_id, name, image_url, description, discount, variants } = req.body;

    if (!name || !category_id || !variants || variants.length === 0) {
      return res.status(400).json({ error: 'Name, category, and at least one variant are required' });
    }

    const firstVariant = variants[0];

    const [result] = await db.query(
      `INSERT INTO products (category_id, name, price, weight, image_url, description, stock, discount) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        category_id,
        name,
        firstVariant.price,
        firstVariant.weight,
        image_url || '',
        description || '',
        firstVariant.stock || 0,
        discount || 0,
      ]
    );

    const productId = result.insertId;

    for (const v of variants) {
      await db.query(
        'INSERT INTO product_variants (product_id, weight, price, stock) VALUES (?, ?, ?, ?)',
        [productId, v.weight, v.price, v.stock || 0]
      );
    }

    res.status(201).json({ message: 'Product created', id: productId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// UPDATE a product WITH variants (admin only)
router.put('/products/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { category_id, name, image_url, description, discount, variants } = req.body;
    const productId = req.params.id;

    const firstVariant = variants[0];

    await db.query(
      `UPDATE products SET 
        category_id = ?, name = ?, price = ?, weight = ?, 
        image_url = ?, description = ?, stock = ?, discount = ?
       WHERE id = ?`,
      [
        category_id,
        name,
        firstVariant.price,
        firstVariant.weight,
        image_url,
        description,
        firstVariant.stock || 0,
        discount,
        productId,
      ]
    );

    // Replace all variants: delete old ones, insert new ones
    await db.query('DELETE FROM product_variants WHERE product_id = ?', [productId]);

    for (const v of variants) {
      await db.query(
        'INSERT INTO product_variants (product_id, weight, price, stock) VALUES (?, ?, ?, ?)',
        [productId, v.weight, v.price, v.stock || 0]
      );
    }

    res.json({ message: 'Product updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE a product (admin only) - variants auto-delete via ON DELETE CASCADE
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