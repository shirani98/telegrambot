const mongoose = require('mongoose');

const invitedUserSchema = new mongoose.Schema({
  user_id: { type: Number, required: true },
  username: { type: String, default: "undefined" },
  joined_at: { type: Date, default: Date.now }
});

const referralSchema = new mongoose.Schema({
  user_id: {
    type: Number,
    required: true,
    unique: true
  },
  invited_users: [invitedUserSchema],
  total_referrals: { type: Number, default: 0 }
});

// Index on user_id for faster queries
referralSchema.index({ user_id: 1 });

// Check if the model is already defined
const Referral = mongoose.models.Referral || mongoose.model('Referral', referralSchema);

module.exports = Referral;


