const Donor = require('../models/donor');

exports.createDonor = async (userId, channelUrl, sponsor_url, referralLink) => {
  try {
    let donor = await Donor.findOne({ user_id: userId });
    
    if (!donor) {
      donor = new Donor({ 
        user_id: userId,
        channels: [{
          channel_url: channelUrl,
          sponsor_channels: [{
            channel_url: sponsor_url,
            referral_link: referralLink,
            invited_users: [],
            total_referrals: 0
          }],
          total_referrals: 0
        }]
      });
    } else {
      let channel = donor.channels.find(ch => ch.channel_url === channelUrl);
      if (!channel) {
        donor.channels.push({
          channel_url: channelUrl,
          sponsor_channels: [{
            channel_url: sponsor_url,
            referral_link: referralLink,
            invited_users: [],
            total_referrals: 0
          }],
          total_referrals: 0
        });
      } else {
        let existingSponsorChannel = channel.sponsor_channels.find(sc => sc.channel_url === sponsor_url);
        if (!existingSponsorChannel) {
          channel.sponsor_channels.push({
            channel_url: sponsor_url,
            referral_link: referralLink,
            invited_users: [],
            total_referrals: 0
          });
        } else {
          existingSponsorChannel.referral_link = referralLink;
        }
      }
    }

    await donor.save();
    return donor;
  } catch (error) {
    console.error('Error creating/updating donor:', error);
    throw error;
  }
};

exports.getDonors = async (userId) => {
  try {
    return await Donor.findOne({ user_id: userId });
  } catch (error) {
    console.error('Error getting donors:', error);
    throw error;
  }
};

exports.updateDonorCount = async (userId, channel_url, referral_link, invitedUserId, invitedUsername) => {
  try {
    const donor = await Donor.findOne({ user_id: userId });
    if (!donor) throw new Error('Donor not found');

    const channel = donor.channels.find(ch => ch.channel_url === channel_url);
    if (channel) {
      channel.total_referrals += 1;
      
      // Find the sponsor channel that matches the referral link
      const sponsorChannel = channel.sponsor_channels.find(sc => sc.referral_link === referral_link);
      if (sponsorChannel) {
        sponsorChannel.total_referrals += 1;
        
        // Check if the invited user already exists
        const existingUser = sponsorChannel.invited_users.find(user => user.user_id === invitedUserId);
        
        if (!existingUser) {
          // Add the invited user only if they don't already exist
          sponsorChannel.invited_users.push({
            user_id: invitedUserId,
            username: invitedUsername || "undefined"
          });
        }
      } else {
        console.error(`Sponsor channel not found for referral link ${referral_link}`);
      }
    } else {
      console.error(`Channel ${channel_url} not found for user ${userId}`);
    }

    await donor.save();
    return donor;
  } catch (error) {
    console.error('Error updating donor count:', error);
    throw error;
  }
};

exports.getTotalDonors = async (userId) => {
  try {
    const donor = await Donor.findOne({ user_id: userId });
    if (!donor) return 0;

    const totalCount = donor.channels.reduce((total, channel) => total + channel.total_referrals, 0);
    return totalCount;
  } catch (error) {
    console.error('Error getting total donors:', error);
    throw error;
  }
};

exports.getDonorOwnerByLink = async (referralLink) => {
  try {
    const donor = await Donor.findOne({ 'channels.sponsor_channels.referral_link': referralLink });
    if (!donor) {
      throw new Error('Donor not found for the provided link');
    }
    return { user_id: donor.user_id }; // Return the user ID associated with the donor
  } catch (error) {
    console.error('Error getting donor owner by link:', error);
    throw error;
  }
};

exports.getChannelsSortedByDonors = async () => {
  try {
    const donors = await Donor.find({});
    const channels = [];

    donors.forEach(donor => {
      donor.channels.forEach(channel => {
        channels.push({
          channel_url: channel.channel_url,
          total_referrals: channel.total_referrals
        });
      });
    });

    // Sort channels by total_referrals in descending order
    channels.sort((a, b) => b.total_referrals - a.total_referrals);
    return channels;
  } catch (error) {
    console.error('Error getting channels sorted by donors:', error);
    throw error;
  }
};

exports.getUserChannelsSortedByDonors = async (userId) => {
  try {
    const donor = await Donor.findOne({ user_id: userId });
    if (!donor) return []; // Return an empty array if no donor found

    const channels = donor.channels.map(channel => ({
      channel_url: channel.channel_url,
      total_referrals: channel.total_referrals
    }));

    // Sort channels by total_referrals in descending order
    channels.sort((a, b) => b.total_referrals - a.total_referrals);
    return channels;
  } catch (error) {
    console.error('Error getting user channels sorted by donors:', error);
    throw error;
  }
};

exports.getChannelInvitedUsers = async (channelUrl) => {
  try {
    const donors = await Donor.find({ 'channels.channel_url': channelUrl });
    const invitedUsers = [];

    donors.forEach(donor => {
      const channel = donor.channels.find(ch => ch.channel_url === channelUrl);
      if (channel) {
        channel.sponsor_channels.forEach(sponsorChannel => {
          invitedUsers.push(...sponsorChannel.invited_users);
        });
      }
    });

    return invitedUsers; // Return the list of invited users
  } catch (error) {
    console.error('Error getting invited users for channel:', error);
    throw error;
  }
};


exports.getDonor = async (userId, channelUrl, SponsorChannelUrl) => {
  try {
    const donor = await Donor.findOne({ user_id: userId });
    if (!donor) return null;

    const channel = donor.channels.find(ch => ch.channel_url === channelUrl);
    if (!channel) return null;

    const sponsorChannel = channel.sponsor_channels.find(sc => sc.channel_url === SponsorChannelUrl);
    if (!sponsorChannel) return null;

    return {
      user_id: donor.user_id,
      channel_url: channel.channel_url,
      referral_link: sponsorChannel.referral_link
    };
  } catch (error) {
    console.error('Error getting donor:', error);
    throw error;
  }
};

exports.getTotalReferralsForChannel = async (userId, channelUrl) => {
  try {
    const donor = await Donor.findOne({ user_id: userId });
    if (!donor) {
      return 0; // Return 0 if no donor is found for the given userId
    }

    const channel = donor.channels.find(ch => ch.channel_url === channelUrl);
    if (!channel) {
      return 0; // Return 0 if no matching channel is found for the given channelUrl
    }

    return channel.total_referrals;
  } catch (error) {
    console.error('Error getting total referrals for channel:', error);
    throw error;
  }
};

