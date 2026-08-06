require('dotenv').config();
const db = require('./config/db');

async function makeAdmin() {
  try {
    const email = 'monikapranathireddy@gmail.com';
    await db.query('UPDATE users SET is_admin = TRUE WHERE email = ?', [email]);
    console.log(`✅ ${email} is now an admin`);
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

makeAdmin();