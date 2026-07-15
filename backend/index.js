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
  connectionString: process.env.DATABASE_URL,
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

// --- Job Routes ---

// Create a new job
app.post('/jobs', verifySupabaseToken, async (req, res) => {
  const customerId = req.user.sub;
  const { providerId } = req.body;
  try {
    const { rows } = await pool.query(
      'INSERT INTO jobs (customer_id, provider_id) VALUES ($1, $2) RETURNING *',
      [customerId, providerId]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get job details (including visits and charges)
app.get('/jobs/:id', verifySupabaseToken, async (req, res) => {
  const { id } = req.params;
  try {
    const jobRes = await pool.query('SELECT * FROM jobs WHERE id = $1', [id]);
    if (jobRes.rowCount === 0) return res.status(404).json({ error: 'Job not found' });
    const job = jobRes.rows[0];

    const visitsRes = await pool.query('SELECT * FROM job_visits WHERE job_id = $1 ORDER BY visit_date ASC', [id]);
    const chargesRes = await pool.query('SELECT * FROM job_charges WHERE job_id = $1 ORDER BY created_at ASC', [id]);

    job.visits = visitsRes.rows;
    job.charges = chargesRes.rows;
    res.json(job);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add a visit to a job (Provider action - simplified auth for MVP)
app.post('/jobs/:id/visits', verifySupabaseToken, async (req, res) => {
  const { id } = req.params;
  const { visit_date, notes } = req.body;
  try {
    const { rows } = await pool.query(
      'INSERT INTO job_visits (job_id, visit_date, notes) VALUES ($1, $2, $3) RETURNING *',
      [id, visit_date, notes]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add a charge to a job (Provider action)
app.post('/jobs/:id/charges', verifySupabaseToken, async (req, res) => {
  const { id } = req.params;
  const { visit_id, description, amount, is_estimate } = req.body;
  try {
    const { rows } = await pool.query(
      'INSERT INTO job_charges (job_id, visit_id, description, amount, is_estimate) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [id, visit_id, description, amount, is_estimate]
    );
    // Optionally update job status to quoted
    await pool.query("UPDATE jobs SET status = 'quoted', updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND status = 'requested'", [id]);
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Approve a charge (Customer action)
app.post('/charges/:id/approve', verifySupabaseToken, async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await pool.query(
      'UPDATE job_charges SET customer_approved_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *',
      [id]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => {
  console.log(`Backend API listening on port ${port}`);
});
