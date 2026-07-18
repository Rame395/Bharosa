const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');
const { Expo } = require('expo-server-sdk');

const expo = new Expo();
const app = express();
const port = process.env.PORT || 3000;

app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || '*' // '*' fallback for local dev if missing, but should be set in prod
}));
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const jwks = jwksClient({
  jwksUri: 'https://vulirqqauypwdnkufehy.supabase.co/auth/v1/.well-known/jwks.json'
});

function getKey(header, callback) {
  jwks.getSigningKey(header.kid, function(err, key) {
    if (err) {
      console.error('JWKS error:', err);
      return callback(err);
    }
    const signingKey = key.publicKey || key.rsaPublicKey;
    callback(null, signingKey);
  });
}

// Middleware to verify Supabase JWT
const verifySupabaseToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }

  const token = authHeader.split(' ')[1];
  
  jwt.verify(token, getKey, { algorithms: ['RS256'] }, (err, decoded) => {
    if (err || !decoded || !decoded.sub) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    req.user = decoded; // Contains user ID in `sub`
    next();
  });
};

// Sync Supabase Auth User with local DB
app.post('/users/sync', verifySupabaseToken, async (req, res) => {
  const userId = req.user.sub;
  const { name } = req.body;
  const contactInfo = req.user.phone || req.user.email || 'unknown'; 
  
  try {
    await pool.query(
      'INSERT INTO customers (id, full_name, phone) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING',
      [userId, name || 'New User', contactInfo]
    );

    // Insert into providers as well (unverified by default). They won't appear in search until verified.
    await pool.query(
      'INSERT INTO providers (id, full_name, phone, category, is_verified) VALUES ($1, $2, $3, $4, false) ON CONFLICT (id) DO NOTHING',
      [userId, name || 'New User', contactInfo, 'General']
    );

    res.json({ success: true });
  } catch (err) {
    console.error('Sync Error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Save Push Token Endpoint
app.post('/users/push-token', verifySupabaseToken, async (req, res) => {
  const userId = req.user.sub;
  const { pushToken } = req.body;

  if (!pushToken) return res.status(400).json({ error: 'Push token required' });
  if (!Expo.isExpoPushToken(pushToken)) {
    return res.status(400).json({ error: 'Invalid Expo push token' });
  }

  try {
    await pool.query('UPDATE customers SET push_token = $1 WHERE id = $2', [pushToken, userId]);
    await pool.query('UPDATE providers SET push_token = $1 WHERE id = $2', [pushToken, userId]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const sendPushNotification = async (userId, title, body, data = {}) => {
  try {
    const dbRes = await pool.query('SELECT push_token FROM customers WHERE id = $1', [userId]);
    if (dbRes.rows.length === 0 || !dbRes.rows[0].push_token) return;

    const pushToken = dbRes.rows[0].push_token;
    if (!Expo.isExpoPushToken(pushToken)) return;

    const messages = [{ to: pushToken, sound: 'default', title, body, data }];
    const chunks = expo.chunkPushNotifications(messages);
    for (let chunk of chunks) {
      await expo.sendPushNotificationsAsync(chunk);
    }
  } catch (err) {
    console.error('Push Notification Error:', err);
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
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// --- Job Routes ---

// Create a new job
app.post('/jobs', verifySupabaseToken, async (req, res) => {
  const customerId = req.user.sub;
  const { providerId, description } = req.body;
  try {
    const insertRes = await pool.query(
      'INSERT INTO jobs (customer_id, provider_id, description) VALUES ($1, $2, $3) RETURNING *',
      [customerId, providerId, description]
    );
    const newJob = insertRes.rows[0];

    await sendPushNotification(providerId, 'New Job Request', `You have a new job request!`, { jobId: newJob.id });

    res.status(201).json(newJob);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Get job details (including visits and charges)
app.get('/jobs/:id', verifySupabaseToken, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.sub;
  try {
    const jobRes = await pool.query(`
      SELECT j.*, p.phone as provider_phone
      FROM jobs j
      JOIN providers p ON j.provider_id = p.id
      WHERE j.id = $1
    `, [id]);
    if (jobRes.rowCount === 0) return res.status(404).json({ error: 'Job not found' });
    const job = jobRes.rows[0];

    if (job.customer_id !== userId && job.provider_id !== userId) {
      return res.status(403).json({ error: 'Unauthorized: You do not have access to this job' });
    }

    const visitsRes = await pool.query('SELECT * FROM job_visits WHERE job_id = $1 ORDER BY visit_date ASC', [id]);
    const chargesRes = await pool.query('SELECT * FROM job_charges WHERE job_id = $1 ORDER BY created_at ASC', [id]);

    job.visits = visitsRes.rows;
    job.charges = chargesRes.rows;
    res.json(job);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Add a visit to a job (Provider action - simplified auth for MVP)
app.post('/jobs/:id/visits', verifySupabaseToken, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.sub;
  const { visit_date, notes } = req.body;

  if (!visit_date || isNaN(Date.parse(visit_date))) {
    return res.status(400).json({ error: 'visit_date must be a valid date' });
  }

  try {
    const jobRes = await pool.query('SELECT provider_id FROM jobs WHERE id = $1', [id]);
    if (jobRes.rowCount === 0) return res.status(404).json({ error: 'Job not found' });
    if (jobRes.rows[0].provider_id !== userId) return res.status(403).json({ error: 'Unauthorized: Only the assigned provider can add a visit' });

    const { rows } = await pool.query(
      'INSERT INTO job_visits (job_id, visit_date, notes) VALUES ($1, $2, $3) RETURNING *',
      [id, visit_date, notes]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Add a charge to a job (Provider action)
app.post('/jobs/:id/charges', verifySupabaseToken, async (req, res) => {
  const { id: jobId } = req.params;
  const userId = req.user.sub;
  const { description, amount, is_estimate } = req.body;

  if (amount === undefined || isNaN(Number(amount)) || Number(amount) <= 0) {
    return res.status(400).json({ error: 'amount must be a positive number' });
  }

  try {
    const jobRes = await pool.query('SELECT provider_id FROM jobs WHERE id = $1', [jobId]);
    if (jobRes.rowCount === 0) return res.status(404).json({ error: 'Job not found' });
    if (jobRes.rows[0].provider_id !== userId) return res.status(403).json({ error: 'Unauthorized: Only the assigned provider can add a charge' });

    const chargeRes = await pool.query(
      'INSERT INTO job_charges (job_id, description, amount, is_estimate) VALUES ($1, $2, $3, $4) RETURNING *',
      [jobId, description, amount, is_estimate]
    );
    
    const customerRes = await pool.query('SELECT customer_id FROM jobs WHERE id = $1', [jobId]);
    if (customerRes.rows.length > 0) {
      await sendPushNotification(customerRes.rows[0].customer_id, 'New Charge Added', `Your provider added a charge for Rs. ${amount}`, { jobId });
    }

    // Optionally update job status to quoted
    await pool.query("UPDATE jobs SET status = 'quoted', updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND status = 'requested'", [jobId]);
    res.status(201).json(chargeRes.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// --- NEW: Status Endpoint ---
const VALID_TRANSITIONS = {
  'requested': ['diagnosing', 'cancelled'],
  'diagnosing': ['quoted', 'cancelled'],
  'quoted': ['in_progress', 'cancelled'],
  'in_progress': ['completed', 'cancelled'],
  'completed': [],
  'cancelled': []
};

app.patch('/jobs/:id/status', verifySupabaseToken, async (req, res) => {
  const providerId = req.user.sub;
  const jobId = req.params.id;
  const { status } = req.body;

  if (!status) return res.status(400).json({ error: 'Status is required' });

  try {
    const jobRes = await pool.query('SELECT provider_id, status, customer_id FROM jobs WHERE id = $1', [jobId]);
    if (jobRes.rows.length === 0) return res.status(404).json({ error: 'Job not found' });
    
    const job = jobRes.rows[0];
    if (job.provider_id !== providerId) {
      return res.status(403).json({ error: 'Only the assigned provider can update this job status' });
    }

    const currentStatus = job.status;
    const allowedNext = VALID_TRANSITIONS[currentStatus] || [];
    
    if (!allowedNext.includes(status)) {
      return res.status(400).json({ error: `Invalid transition from ${currentStatus} to ${status}` });
    }

    const updateRes = await pool.query(
      'UPDATE jobs SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [status, jobId]
    );
    const updatedJob = updateRes.rows[0];

    const title = status === 'cancelled' ? 'Job Cancelled' : 'Job Status Updated';
    const body = status === 'cancelled' ? 'Your provider has cancelled the job.' : `Your job is now: ${status.replace('_', ' ')}`;
    await sendPushNotification(updatedJob.customer_id, title, body, { jobId: updatedJob.id });

    res.json(updatedJob);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Approve a charge (Customer action)
app.post('/charges/:id/approve', verifySupabaseToken, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.sub;
  try {
    const chargeRes = await pool.query('SELECT job_id, amount FROM job_charges WHERE id = $1', [id]);
    if (chargeRes.rowCount === 0) return res.status(404).json({ error: 'Charge not found' });
    
    const jobRes = await pool.query('SELECT customer_id, provider_id FROM jobs WHERE id = $1', [chargeRes.rows[0].job_id]);
    if (jobRes.rowCount === 0 || jobRes.rows[0].customer_id !== userId) {
      return res.status(403).json({ error: 'Unauthorized: Only the customer can approve charges' });
    }

    const resCharge = await pool.query(
      'UPDATE job_charges SET customer_approved_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *',
      [id]
    );
    const charge = resCharge.rows[0];
    
    await sendPushNotification(jobRes.rows[0].provider_id, 'Charge Approved', `The customer approved your charge of Rs. ${charge.amount}`, { jobId: charge.job_id });

    res.json(charge);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
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
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Rate a completed job and update Trust Scores
app.post('/jobs/:id/rate', verifySupabaseToken, async (req, res) => {
  const customerId = req.user.sub;
  const { id } = req.params;
  const { rating, comment, photo_url } = req.body; // rating should be 1-5

  if (rating === undefined || !Number.isInteger(Number(rating)) || Number(rating) < 1 || Number(rating) > 5) {
    return res.status(400).json({ error: 'rating must be an integer between 1 and 5' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Get Job details to ensure customer owns it and get provider_id
    const jobRes = await client.query('SELECT provider_id FROM jobs WHERE id = $1 AND customer_id = $2', [id, customerId]);
    if (jobRes.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Job not found or unauthorized' });
    }
    const providerId = jobRes.rows[0].provider_id;

    // 2. Insert Rating
    const { rows } = await client.query(
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
      await client.query('UPDATE providers SET trust_score = trust_score + $1 WHERE id = $2', [trustScoreDelta, providerId]);

      // The Guarantor Penalty
      if (trustScoreDelta < 0) {
        const provRes = await client.query('SELECT guarantor_id FROM providers WHERE id = $1', [providerId]);
        const guarantorId = provRes.rows[0]?.guarantor_id;
        if (guarantorId) {
          // Guarantor takes a -5 hit for vouching for a bad provider
          await client.query('UPDATE providers SET trust_score = trust_score - 5 WHERE id = $1', [guarantorId]);
        }
      }
    }

    await client.query('COMMIT');
    res.status(201).json(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  } finally {
    client.release();
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
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
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
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.listen(port, () => {
  console.log(`Backend API listening on port ${port}`);
});
