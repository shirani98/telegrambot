const Request = require('../models/requests');

exports.createRequest = async (user_id, channel_name, invite_link) => {
  try {
    const request = new Request({
      user_id,
      channel_name,
      invite_link
    });
    await request.save();
    return request;
  } catch (error) {
    console.error('Error creating request:', error);
    throw error;
  }
};

exports.getRequestsByUserId = async (user_id) => {
  try {
    return await Request.find({ user_id });
  } catch (error) {
    console.error('Error getting requests by user ID:', error);
    throw error;
  }
};

exports.getPendingRequests = async () => {
  try {
    return await Request.find({ status: 'pending' });
  } catch (error) {
    console.error('Error getting pending requests:', error);
    throw error;
  }
};

exports.updateRequestStatus = async (requestId, status) => {
  try {
    const request = await Request.findById(requestId);
    if (!request) throw new Error('Request not found');
    request.status = status;
    await request.save();
    return request;
  } catch (error) {
    console.error('Error updating request status:', error);
    throw error;
  }
};

exports.deleteRequest = async (requestId) => {
  try {
    const result = await Request.findByIdAndDelete(requestId);
    if (!result) throw new Error('Request not found');
    return result;
  } catch (error) {
    console.error('Error deleting request:', error);
    throw error;
  }
};

exports.getRequestById = async (requestId) => {
  try {
    const request = await Request.findById(requestId);
    if (!request) throw new Error('Request not found');
    return request;
  } catch (error) {
    console.error('Error getting request by ID:', error);
    throw error;
  }
};

exports.getPendingChannelRequests = async () => {
  try {
    return await Request.find({ 
      status: 'pending'
    });
  } catch (error) {
    console.error('Error getting pending channel requests:', error);
    throw error;
  }
};
