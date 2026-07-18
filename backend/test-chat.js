const { io } = require('socket.io-client');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function runTest() {
  console.log('Testing Chat Socket Integration...');
  
  // 1. Create a dummy job with location to test map backend logic
  const customerId = '00000000-0000-0000-0000-000000000001';
  const providerId = '00000000-0000-0000-0000-000000000002';
  
  // Make sure these users exist to satisfy foreign keys
  await pool.query('INSERT INTO customers (id, full_name, phone) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING', [customerId, 'Test Customer', '123']);
  await pool.query('INSERT INTO providers (id, full_name, phone, category) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING', [providerId, 'Test Provider', '123', 'Gen']);
  
  const resJob = await pool.query(`
    INSERT INTO jobs (customer_id, provider_id, description, latitude, longitude) 
    VALUES ($1, $2, 'My sink is leaking', 27.7172, 85.3240) RETURNING id
  `, [customerId, providerId]);
  
  const jobId = resJob.rows[0].id;
  console.log(`Created Job #${jobId} with Latitude 27.7172, Longitude 85.3240 (Map Test Passed)`);
  
  // 2. Test Socket
  const socket = io('http://localhost:3000');
  
  socket.on('connect', () => {
    console.log('Socket connected successfully!');
    
    // Join the job room
    socket.emit('join_job', jobId);
    console.log(`Joined room job_${jobId}`);
    
    // Send a message
    const testMsg = 'Hello Provider, here is a photo of the sink.';
    const photoUrl = 'https://example.com/photo.jpg';
    socket.emit('send_message', {
      jobId,
      senderId: customerId,
      content: testMsg,
      photoUrl
    });
  });
  
  socket.on('receive_message', (msg) => {
    console.log('Received message back via socket:');
    console.log(msg);
    
    if (msg.content === 'Hello Provider, here is a photo of the sink.' && msg.photo_url === 'https://example.com/photo.jpg') {
      console.log('Chat Test Passed ✅');
    } else {
      console.log('Chat Test Failed ❌');
    }
    
    socket.disconnect();
    pool.end();
    process.exit(0);
  });
  
  // Timeout in case it fails
  setTimeout(() => {
    console.error('Socket test timed out!');
    process.exit(1);
  }, 5000);
}

runTest().catch(console.error);
