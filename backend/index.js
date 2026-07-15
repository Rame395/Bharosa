const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();
const jwt = require('jsonwebtoken');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:admin123@localhost:5432/project_name?schema=public',
});

// Middleware to verify Supabase JWT
const verifySupabaseToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }

  const token = authHeader.split(' ')[1];
  try {
    // Note: In production, verify the JWT signature using Supabase JWT secret
    const decoded = jwt.decode(token); // For now, just decode to extract user ID. 
    // Ideally: jwt.verify(token, process.env.SUPABASE_JWT_SECRET)
    if (!decoded || !decoded.sub) {
      throw new Error('Invalid token structure');
    }
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

app.get('/', (req, res) => {
  res.send('Bharosa API is running');
});

// Example protected route: Get jobs for a customer
app.get('/jobs', verifySupabaseToken, async (req, res) => {
  const userId = req.user.sub;
  try {
    const { rows } = await pool.query('SELECT * FROM jobs WHERE customer_id = $1', [userId]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => {
  console.log(`Backend API listening on port ${port}`);
});
