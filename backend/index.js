const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

if (!process.env.JWT_SECRET) {
  console.error('Missing JWT_SECRET in backend/.env. Auth cannot start safely.');
  process.exit(1);
}

const app = express();

app.use(cors({
  origin: function(origin, callback) {
    if (!origin || origin.startsWith('http://localhost')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

app.use('/api/auth', require('./src/routes/auth.routes'));
app.use('/api/prescriptions', require('./src/routes/prescriptions.routes'));
app.use('/api/patients', require('./src/routes/patients.routes'));
app.use('/api/regulator', require('./src/routes/regulator.routes'));
app.use('/api/insurance', require('./src/routes/insurance.routes'));
app.use('/api/pharmacy', require('./src/routes/pharmacy.routes'));

app.get('/api/health', (req, res) => {
  res.json({ success: true, data: { status: 'MedAxis API running', timestamp: new Date() } });
});

app.use(require('./src/middleware/error.middleware'));

const PORT = process.env.PORT || 3005;
app.listen(PORT, () => {
  console.log(`MedAxis API running on port ${PORT}`);
});
