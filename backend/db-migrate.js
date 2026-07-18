const { Client } = require('pg');

require('dotenv').config();

const connectionString = process.env.DATABASE_URL;

const client = new Client({
  connectionString,
});

const runMigration = async () => {
  try {

    console.log('Connecting to Bharosa database...');
    await client.connect();

    console.log('Running migrations...');

    // 1. Customers Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id UUID PRIMARY KEY,
        full_name VARCHAR(255) NOT NULL,
        phone VARCHAR(50) UNIQUE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Created customers table');

    // 2. Providers Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS providers (
        id UUID PRIMARY KEY,
        full_name VARCHAR(255) NOT NULL,
        phone VARCHAR(50) UNIQUE NOT NULL,
        category VARCHAR(100) NOT NULL,
        is_verified BOOLEAN DEFAULT FALSE,
        guarantor_id UUID REFERENCES providers(id),
        trust_score INTEGER DEFAULT 0,
        avg_response_time VARCHAR(50),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Created providers table');

    // 3. Guarantor Vouches Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS guarantor_vouches (
        id SERIAL PRIMARY KEY,
        guarantor_id UUID REFERENCES providers(id) NOT NULL,
        vouchee_id UUID REFERENCES providers(id) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Created guarantor_vouches table');

    // 4. Jobs Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS jobs (
        id SERIAL PRIMARY KEY,
        customer_id UUID REFERENCES customers(id) NOT NULL,
        provider_id UUID REFERENCES providers(id) NOT NULL,
        description TEXT,
        status VARCHAR(50) DEFAULT 'requested' CHECK (status IN ('requested', 'diagnosing', 'quoted', 'in_progress', 'awaiting_next_visit', 'completed', 'disputed')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Created jobs table');

    // 5. Job Visits Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS job_visits (
        id SERIAL PRIMARY KEY,
        job_id INTEGER REFERENCES jobs(id) NOT NULL,
        visit_date TIMESTAMP WITH TIME ZONE,
        status VARCHAR(50) DEFAULT 'scheduled',
        notes TEXT
      );
    `);
    console.log('Created job_visits table');

    // 6. Job Charges Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS job_charges (
        id SERIAL PRIMARY KEY,
        job_id INTEGER REFERENCES jobs(id) NOT NULL,
        visit_id INTEGER REFERENCES job_visits(id),
        description VARCHAR(255) NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        is_estimate BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        customer_approved_at TIMESTAMP WITH TIME ZONE
      );
    `);
    console.log('Created job_charges table');

    // 7. Ratings Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS ratings (
        id SERIAL PRIMARY KEY,
        job_id INTEGER REFERENCES jobs(id) NOT NULL,
        customer_id UUID REFERENCES customers(id) NOT NULL,
        provider_id UUID REFERENCES providers(id) NOT NULL,
        rating INTEGER CHECK (rating >= 1 AND rating <= 5),
        comment TEXT,
        photo_url VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Created ratings table');

    // 8. Update Jobs Constraint and Add Push Tokens
    await client.query(`
      ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_status_check;
      ALTER TABLE jobs ADD CONSTRAINT jobs_status_check CHECK (status IN ('requested', 'diagnosing', 'quoted', 'in_progress', 'awaiting_next_visit', 'completed', 'disputed', 'cancelled'));
    `);
    console.log('Updated jobs status constraint');

    await client.query(`
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS push_token VARCHAR(255);
      ALTER TABLE providers ADD COLUMN IF NOT EXISTS push_token VARCHAR(255);
    `);
    console.log('Added push_token columns');

    // 9. Messages Table (Phase 3)
    await client.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        job_id INTEGER REFERENCES jobs(id) NOT NULL,
        sender_id UUID NOT NULL,
        content TEXT,
        photo_url TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Created messages table');

    // 10. Job Location Columns (Phase 4)
    await client.query(`
      ALTER TABLE jobs ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8);
      ALTER TABLE jobs ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);
    `);
    console.log('Added location columns to jobs table');

    console.log('Migration completed successfully!');

  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await client.end();
  }
};

runMigration();
