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

// Get all verified providers
app.get('/providers', verifySupabaseToken, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT p.*, g.full_name as guarantor_name 
      FROM providers p
      LEFT JOIN providers g ON p.guarantor_id = g.id
      WHERE p.is_verified = TRUE
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
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

// --- Trust Layer Routes ---

// Guarantor Vouches for a New Provider
app.post('/guarantor/vouch', verifySupabaseToken, async (req, res) => {
  const guarantorId = req.user.sub;
  const { voucheeId } = req.body;
  try {
    const { rows } = await pool.query(
      "INSERT INTO guarantor_vouches (guarantor_id, vouchee_id, status) VALUES ($1, $2, 'pending_admin') RETURNING *",
      [guarantorId, voucheeId]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Rate a completed job and update Trust Scores
app.post('/jobs/:id/rate', verifySupabaseToken, async (req, res) => {
  const customerId = req.user.sub;
  const { id } = req.params;
  const { rating, comment, photo_url } = req.body; // rating should be 1-5

  try {
    // 1. Get Job details to ensure customer owns it and get provider_id
    const jobRes = await pool.query('SELECT provider_id FROM jobs WHERE id = $1 AND customer_id = $2', [id, customerId]);
    if (jobRes.rowCount === 0) return res.status(404).json({ error: 'Job not found or unauthorized' });
    const providerId = jobRes.rows[0].provider_id;

    // 2. Insert Rating
    const { rows } = await pool.query(
      'INSERT INTO ratings (job_id, customer_id, provider_id, rating, comment, photo_url) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [id, customerId, providerId, rating, comment, photo_url]
    );

    // 3. Trust Score Algorithm
    let trustScoreDelta = 0;
    if (rating === 5) {
      trustScoreDelta = 5;
    } else if (rating <= 2) {
      trustScoreDelta = -10; // Complaint penalty
    }

    if (trustScoreDelta !== 0) {
      // Update Provider Trust Score
      await pool.query('UPDATE providers SET trust_score = trust_score + $1 WHERE id = $2', [trustScoreDelta, providerId]);

      // The Guarantor Penalty
      if (trustScoreDelta < 0) {
        const provRes = await pool.query('SELECT guarantor_id FROM providers WHERE id = $1', [providerId]);
        const guarantorId = provRes.rows[0]?.guarantor_id;
        if (guarantorId) {
          // Guarantor takes a -5 hit for vouching for a bad provider
          await pool.query('UPDATE providers SET trust_score = trust_score - 5 WHERE id = $1', [guarantorId]);
        }
      }
    }

    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Cancel a job (Fast, Forgiving Cancellation)
app.post('/jobs/:id/cancel', verifySupabaseToken, async (req, res) => {
  const customerId = req.user.sub;
  const { id } = req.params;

  try {
    const jobRes = await pool.query('SELECT status FROM jobs WHERE id = $1 AND customer_id = $2', [id, customerId]);
    if (jobRes.rowCount === 0) return res.status(404).json({ error: 'Job not found or unauthorized' });

    // Allow instant cancellation unless completed or cancelled
    if (jobRes.rows[0].status === 'completed') {
      return res.status(400).json({ error: 'Cannot cancel a completed job' });
    }

    const { rows } = await pool.query(
      "UPDATE jobs SET status = 'cancelled' WHERE id = $1 RETURNING *",
      [id]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Provider Routes ---

// Get jobs assigned to the logged-in provider
app.get('/provider/jobs', verifySupabaseToken, async (req, res) => {
  const providerUserId = req.user.sub; // This is the user's UUID
  try {
    // First find the provider record for this user
    const provRes = await pool.query('SELECT id FROM providers WHERE id = $1', [providerUserId]);
    if (provRes.rowCount === 0) return res.status(404).json({ error: 'Provider profile not found' });
    
    const providerId = provRes.rows[0].id;
    
    const { rows } = await pool.query(`
      SELECT j.*, 
        COALESCE(
          json_agg(
            json_build_object(
              'id', jc.id,
              'description', jc.description,
              'amount', jc.amount,
              'is_estimate', jc.is_estimate,
              'status', jc.status
            )
          ) FILTER (WHERE jc.id IS NOT NULL),
          '[]'
        ) as charges
      FROM jobs j
      LEFT JOIN job_charges jc ON j.id = jc.job_id
      WHERE j.provider_id = $1
      GROUP BY j.id
      ORDER BY j.created_at DESC
    `, [providerId]);
    
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => {
  console.log(`Backend API listening on port ${port}`);
});
