const mongoose = require('mongoose');

const sponsorSchema = new mongoose.Schema({
  channel_id: {
    type: String,
    required: true,
    unique: true
  },
  channel_url: {
    type: String,
    required: true,
    unique: true
  }
});

// Index on channel_id and channel_url for faster queries
sponsorSchema.index({ channel_id: 1, channel_url: 1 });

const Sponsor = mongoose.model('Sponsor', sponsorSchema);

module.exports = Sponsor;

