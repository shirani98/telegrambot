const mongoose = require('mongoose');

const withdrawSchema = new mongoose.Schema({
  userId: { type: Number, required: true },
  amount: { type: Number, required: true },
  method: { type: String, required: true }, // e.g., 'TON (Crypto)', 'Bank Card'
  accountDetails: { type: String, required: true }, // e.g., wallet address or bank account details
  status: { type: String, default: 'pending' }, // e.g., 'pending', 'completed', 'failed'
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Withdraw', withdrawSchema);