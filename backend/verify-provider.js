const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function verifyProvider() {
  const phoneArgs = process.argv.slice(2);
  if (phoneArgs.length === 0) {
    console.error('Please provide a phone number. Example: node verify-provider.js 9812345678');
    process.exit(1);
  }

  const phone = phoneArgs[0];

  try {
    const res = await pool.query('UPDATE providers SET is_verified = TRUE WHERE phone = $1 RETURNING *', [phone]);
    if (res.rows.length > 0) {
      console.log(`Success! Provider with phone ${phone} is now VERIFIED and can be used as a Guarantor.`);
    } else {
      console.log(`No provider found with phone ${phone}. Make sure they have logged into the app first!`);
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    pool.end();
  }
}

verifyProvider();
