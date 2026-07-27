const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function seedGuarantor() {
  try {
    const dummyPhone = '9999999999';
    // Check if it already exists
    const res = await pool.query('SELECT * FROM providers WHERE phone = $1', [dummyPhone]);
    
    if (res.rows.length === 0) {
      await pool.query(`
        INSERT INTO providers (id, full_name, phone, category, is_verified) 
        VALUES ('11111111-1111-1111-1111-111111111111', 'Admin Guarantor', $1, 'Admin', TRUE)
      `, [dummyPhone]);
      console.log('Dummy verified Guarantor created with phone:', dummyPhone);
    } else {
      await pool.query('UPDATE providers SET is_verified = TRUE WHERE phone = $1', [dummyPhone]);
      console.log('Dummy Guarantor was already present, ensured it is verified.');
    }
  } catch (err) {
    console.error('Error seeding guarantor:', err);
  } finally {
    pool.end();
  }
}

seedGuarantor();
