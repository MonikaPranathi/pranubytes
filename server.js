require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');
const adminRoutes = require('./routes/adminRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const addressRoutes = require('./routes/addressRoutes');
const bannerRoutes = require('./routes/bannerRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const couponRoutes = require('./routes/couponRoutes');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api', productRoutes);
app.use('/api', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', uploadRoutes);
app.use('/api', paymentRoutes);
app.use('/api', addressRoutes);
app.use('/api', bannerRoutes);
app.use('/api', settingsRoutes);
app.use('/api', couponRoutes);


app.get('/', (req, res) => {
  res.send('Pranu Bytes API is running');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});