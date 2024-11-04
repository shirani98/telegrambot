require('dotenv').config();
const connectDB = require('./config/database');
const bot = require('./bot/bot');

// Connect to MongoDB
connectDB()
  .then(() => {
    // Start the bot
    bot.startPolling();
    console.log('Bot is running...');
  })
  .catch((error) => {
    console.error('Failed to start the bot:', error);
    process.exit(1);
  });