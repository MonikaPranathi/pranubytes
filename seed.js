require('dotenv').config();
const db = require('./config/db');

async function seed() {
  try {
    const categories = ['Veg Pickles', 'Non-Veg Pickles', 'Biscuits', 'Snacks', 'Healthy Sweets'];
    for (const name of categories) {
      await db.query('INSERT INTO categories (name) VALUES (?)', [name]);
    }

    const [cats] = await db.query('SELECT * FROM categories');

    const products = [
      { name: 'Mango Pickle', category: 'Veg Pickles', price: 150, weight: '250g' },
      { name: 'Lemon Pickle', category: 'Veg Pickles', price: 120, weight: '250g' },
      { name: 'Chicken Pickle', category: 'Non-Veg Pickles', price: 280, weight: '250g' },
      { name: 'Butter Biscuits', category: 'Biscuits', price: 90, weight: '200g' },
      { name: 'Mixture Snack', category: 'Snacks', price: 100, weight: '200g' },
      { name: 'Kaju Katli', category: 'Healthy Sweets', price: 350, weight: '250g' },
    ];

    for (const p of products) {
      const cat = cats.find(c => c.name === p.category);
      await db.query(
        'INSERT INTO products (category_id, name, price, weight, image_url, description) VALUES (?, ?, ?, ?, ?, ?)',
        [cat.id, p.name, p.price, p.weight, '', `Delicious ${p.name}`]
      );
    }

    console.log('Seeding done!');
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

seed();