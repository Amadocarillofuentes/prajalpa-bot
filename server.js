const express = require('express');
const app = express();

// Basic route to respond to keep the bot alive
app.get('/', (req, res) => {
  res.send('Bot is alive!');
});

// Start the server on port 8080 (Replit's recommended port)
app.listen(8080, () => {
  console.log('Server is running');
});

// Keep the server running
