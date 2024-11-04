const mongoose = require('mongoose');

const requestSchema = new mongoose.Schema({
  user_id: {
    type: String,
    required: true
  },
  channel_name: {
    type: String,
    required: true
  },
  invite_link: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

const Request = mongoose.model('Request', requestSchema);

module.exports = Request;
