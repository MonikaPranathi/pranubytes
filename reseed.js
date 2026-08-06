require('dotenv').config();
const db = require('./config/db');

async function reseed() {
  try {
    const categories = [
      'Veg Pickles',
      'Non-Veg Pickles',
      'Biscuits',
      'Snacks',
      'Healthy Sweets',
      'dairy sweets',
      'Choclates',
      'Fruits',
      'Dry Fruits',
    ];

    for (const name of categories) {
      await db.query('INSERT INTO categories (name) VALUES (?)', [name]);
    }
    console.log('✓ Categories seeded');

    const [cats] = await db.query('SELECT * FROM categories');

    const products = [
      { name: 'Mango Pickle', category: 'Veg Pickles', price: 150, weight: '250g', stock: 20 },
      { name: 'Lemon Pickle', category: 'Veg Pickles', price: 120, weight: '250g', stock: 20 },
      { name: 'Chicken Pickle', category: 'Non-Veg Pickles', price: 280, weight: '250g', stock: 20 },
      { name: 'Butter Biscuits', category: 'Biscuits', price: 90, weight: '200g', stock: 20 },
      { name: 'Mixture Snack', category: 'Snacks', price: 100, weight: '200g', stock: 20 },
      { name: 'Kaju Katli', category: 'Healthy Sweets', price: 350, weight: '250g', stock: 20 },
    ];

    for (const p of products) {
      const cat = cats.find((c) => c.name === p.category);
      const [result] = await db.query(
        'INSERT INTO products (category_id, name, price, weight, image_url, description, stock, discount) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [cat.id, p.name, p.price, p.weight, '', `Delicious ${p.name}`, p.stock, 0]
      );

      await db.query(
        'INSERT INTO product_variants (product_id, weight, price, stock) VALUES (?, ?, ?, ?)',
        [result.insertId, p.weight, p.price, p.stock]
      );
    }
    console.log('✓ Products seeded');

    console.log('\n✅ Reseeding complete!');
    process.exit();
  } catch (err) {
    console.error('Error reseeding:', err);
    process.exit(1);
  }
}

reseed();