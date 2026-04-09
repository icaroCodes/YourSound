const axios = require('axios');

async function test(url) {
  try {
    console.log('Testing import for:', url);
    const res = await axios.post('http://localhost:5000/api/songs/from-link', {
      url: url,
      title: 'Test Song',
      artist: 'Test Artist',
      is_public: 'false'
    }, {
      headers: {
        'Authorization': 'Bearer YOUR_TOKEN_HERE' // I need a valid token
      },
      timeout: 60000
    });
    console.log('Response:', res.data);
  } catch (err) {
    console.error('Error:', err.response?.data || err.message);
  }
}
// This needs a token, so I can't run it easily without one.
