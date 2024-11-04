const mongoose = require('mongoose');

const invitedUserSchema = new mongoose.Schema({
  user_id: { type: Number, required: true },
  username: { type: String, default: "undefined" }
});

const sponsorChannelSchema = new mongoose.Schema({
  channel_url: { type: String, required: true },
  referral_link: { type: String, required: true },
  invited_users: [invitedUserSchema],
  total_referrals: { type: Number, default: 0 }
});

const channelSchema = new mongoose.Schema({
  channel_url: { type: String, required: true },
  sponsor_channels: [sponsorChannelSchema],
  total_referrals: { type: Number, default: 0 }
});

const referralSchema = new mongoose.Schema({
  user_id: {
    type: Number,
    required: true,
    unique: true
  },
  channels: [channelSchema]
});

module.exports = mongoose.model('Donors', referralSchema);
