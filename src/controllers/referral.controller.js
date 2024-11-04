const Referral = require('../models/referral');

exports.addNewReferral = async (referrerId, invitedUserId, invitedUsername) => {
  try {
    // Find the referrer's document or create a new one if it doesn't exist
    let referral = await Referral.findOne({ user_id: referrerId });
    
    if (!referral) {
      referral = new Referral({
        user_id: referrerId,
        invited_users: [],
        total_referrals: 0
      });
    }

    // Add the new invited user
    referral.invited_users.push({
      user_id: invitedUserId,
      username: invitedUsername
    });

    // Increase the total referrals count
    referral.total_referrals += 1;

    // Save the updated or new referral document
    await referral.save();

    return referral;
  } catch (error) {
    console.error('Error adding new referral:', error);
    throw error;
  }
};

exports.getTopReferrers = async () => {
  try {
    // Fetch all referrals and sort by total_referrals in descending order
    const topReferrers = await Referral.find({})
      .sort({ total_referrals: -1 })
      .exec();

    return topReferrers;
  } catch (error) {
    console.error('Error getting top referrers:', error);
    throw error;
  }
};
exports.getReferral = async (referrerId, invitedUserId) => {
  try {
    const referral = await Referral.findOne({
      user_id: referrerId,
      'invited_users.user_id': invitedUserId
    });

    return referral;
  } catch (error) {
    console.error('Error getting referral:', error);
    throw error;
  }
};
