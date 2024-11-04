const User = require('../models/user');
const Donor = require('../models/donor');

exports.createUser = async (user_id, username) => {
  try {
    if (!user_id) {
      throw new Error('user_id is required and cannot be null');
    }
    if (!username) {
      throw new Error('username is required and cannot be null');
    }
    const existingUser = await User.findOne({ user_id });
    if (existingUser) {
      return existingUser;
    }
    const user = new User({
      user_id,
      username,
      donor_count: 0,
      referral_count: 0,
      channels: [],
      Total_withdraw: 0,
      isAdmin: false
    });
    await user.save();
    return user;
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
};

exports.getUser = async (user_id) => {
  try {
    return await User.findOne({ user_id });
  } catch (error) {
    console.error('Error getting user:', error);
    throw error;
  }
};

exports.updateDonorCount = async (user_id, amount) => {
  try {
    const user = await User.findOne({ user_id });
    if (!user) throw new Error('User not found');
    user.donor_count += amount;
    await user.save();
    return user;
  } catch (error) {
    console.error('Error updating donor count:', error);
    throw error;
  }
};
exports.setDonorCount = async (user_id, amount) => {
  try {
    const user = await User.findOne({ user_id });
    if (!user) throw new Error('User not found');
    user.donor_count = amount;
    await user.save();
    return user;
  } catch (error) {
    console.error('Error updating donor count:', error);
    throw error;
  }
};

exports.addChannel = async (user_id, channelData) => {
  try {
    const user = await User.findOne({ user_id });
    if (!user) throw new Error('User not found');
    user.channels.push(channelData);
    await user.save();
    return user;
  } catch (error) {
    console.error('Error adding channel:', error);
    throw error;
  }
};

exports.updateTotalWithdraw = async (user_id, amount) => {
  try {
    const user = await User.findOne({ user_id });
    if (!user) throw new Error('User not found');
    user.Total_withdraw += amount;
    await user.save();
    return user;
  } catch (error) {
    console.error('Error updating total withdraw:', error);
    throw error;
  }
};

exports.isAdmin = async (user_id) => {
  try {
    const user = await User.findOne({ user_id });
    if (!user) throw new Error('User not found');
    return user.isAdmin;
  } catch (error) {
    console.error('Error checking admin status:', error);
    throw error;
  }
};

exports.getInviteLink = async (user_id, channelName) => {
  try {
    const user = await User.findOne({ user_id });
    if (!user) {
      return null;
    }
    
    const channel = user.channels.find(ch => ch.name === channelName);
    
    if (channel) {
      console.log(`Found existing invite link for user ${user_id} and channel ${channelName}: ${channel.invite_link}`);
    } else {
      console.log(`No existing invite link found for user ${user_id} and channel ${channelName}`);
    }
    
    return channel ? channel.invite_link : null;
  } catch (error) {
    console.error('Error getting invite link:', error);
    throw error;
  }
};

exports.getAllUsers = async () => {
  try {
    const users = await User.find();
    return users; // Ensure this returns an array
  } catch (error) {
    console.error('Error getting all users:', error);
    throw error;
  }
};

exports.getUsersWithChannels = async (channelName) => {
  try {
    return await User.find({
      'channels.name': channelName
    });
  } catch (error) {
    console.error('Error getting users with channels:', error);
    throw error;
  }
};

exports.removeAllChannelsWithName = async (channelName) => {
  try {
    const result = await User.updateMany(
      { 'channels.name': channelName },
      { $pull: { channels: { name: channelName } } }
    );
    console.log(`Removed channels named ${channelName} from ${result.modifiedCount} users.`);
    return result;
  } catch (error) {
    console.error('Error removing channels:', error);
    throw error;
  }
};

exports.updateDonorCountFromChannels = async (user_id) => {
  try {
    const user = await User.findOne({ user_id });
    if (!user) throw new Error('User not found');

    let totalDonors = 0;

    for (const channel of user.channels) {
      const donorCount = await this.getDonorCountForChannel(user_id, channel.invite_link);
      totalDonors += donorCount;
    }

    user.donor_count = totalDonors;
    await user.save();
    
    return user;
  } catch (error) {
    console.error('Error updating donor count from channels:', error);
    throw error;
  }
};



exports.getUserByChannelId = async (channelId) => {
  try {
    return await User.findOne({ 'channels.invite_link': channelId });
  } catch (error) {
    console.error('Error getting user by channel ID:', error);
    throw error;
  }
};

exports.getChannelByInviteLink = async (inviteLink) => {
  try {
    const user = await User.findOne({ 'channels.invite_link': inviteLink });
    return user ? user.channels.find(ch => ch.invite_link === inviteLink) : null;
  } catch (error) {
    console.error('Error getting channel by invite link:', error);
    throw error;
  }
};

exports.getAllAdmins = async () => {
  try {
    const admins = await User.find({ isAdmin: true }); // Find users where isAdmin is true
    return admins; // Return the array of admin users
  } catch (error) {
    console.error('Error getting all admins:', error);
    throw error;
  }
};

exports.addChannelToUser = async (userId, channelName, inviteLink) => {
    console.log(`Attempting to add channel ${channelName} to user ${userId}`);
    const user = await User.findOne({ user_id: userId });
    if (!user) {
        throw new Error('User not found');
    }

    const newChannel = {
        name: channelName,
        invite_link: inviteLink,
        isVerified: true
    };

    user.channels.push(newChannel);

    try {
        await user.save();
        console.log(`Channel ${channelName} added successfully to user ${userId}`);
        return user;
    } catch (error) {
        console.error('Error saving user with new channel:', error);
        throw error;
    }
};

exports.getUserChannels = async (userId) => {
  try {
    const user = await User.findOne({ user_id: userId });
    if (!user) {
      throw new Error('User not found');
    }
    return user.channels;
  } catch (error) {
    console.error('Error getting user channels:', error);
    throw error;
  }
};

exports.getDonorCountForChannel = async (userId, inviteLink) => {
  try {
    const user = await User.findOne({ user_id: userId });
    if (!user) {
      throw new Error('User not found');
    }
    const channel = user.channels.find(ch => ch.invite_link === inviteLink);
    if (!channel) {
      throw new Error('Channel not found');
    }
    // Assuming donor_count is stored at the channel level
    // If it's not, you may need to query the Donor model instead
    return channel.donor_count || 0;
  } catch (error) {
    console.error('Error getting donor count for channel:', error);
    throw error;
  }
};


exports.getAllUsersSortedByDonors = async () => {
  try {
    const users = await User.find({}).sort({ donor_count: -1 }).exec();
    return users;
  } catch (error) {
    console.error('Error getting all users sorted by donors:', error);
    throw error;
  }
};

exports.getReferralCount = async (user_id) => {
  try {
    const user = await User.findOne({ user_id });
    if (!user) throw new Error('User not found');
    return user.referral_count;
  } catch (error) {
    console.error('Error getting referral count:', error);
    throw error;
  }
};

exports.updateReferralCount = async (user_id, amount) => {
  try {
    const user = await User.findOne({ user_id });
    if (!user) throw new Error('User not found');
    user.referral_count += amount;
    await user.save();
    return user;
  } catch (error) {
    console.error('Error updating referral count:', error);
    throw error;
  }
};