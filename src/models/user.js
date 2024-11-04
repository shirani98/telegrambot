const mongoose = require('mongoose');

const channelSchema = new mongoose.Schema({
  name: { type: String, required: true },
  invite_link: { type: String, required: true },
  isVerified: { type: Boolean, default: false },
});

const userSchema = new mongoose.Schema({
  user_id: { type: Number, required: true, unique: true },
  username: { type: String, required: true, default: "undefined" },
  channels: [channelSchema],
  donor_count: { type: Number, default: 0 },
  referral_count: { type: Number, default: 0 },
  Total_withdraw: { type: Number, default: 0 },
  isAdmin: { type: Boolean, default: false }
});

module.exports = mongoose.model('User', userSchema);
