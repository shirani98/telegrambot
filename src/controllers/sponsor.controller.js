const Sponsor = require('../models/sponsor');

exports.getAllSponsorChannels = async () => {
    try {
        const sponsors = await Sponsor.find({});
        return sponsors;
    } catch (error) {
        console.error('Error getting all sponsor channels:', error);
        throw error;
    }
};

exports.getSponsorChannel = async (channelId) => {
    try {
        const sponsor = await Sponsor.findOne({ channel_id: channelId });
        if (!sponsor) {
            throw new Error('Sponsor channel not found');
        }
        return sponsor;
    } catch (error) {
        console.error('Error getting specific sponsor channel:', error);
        throw error;
    }
};

exports.addSponsorChannel = async (channelId, channelUrl) => {
    try {
        const newSponsor = new Sponsor({
            channel_id: channelId,
            channel_url: channelUrl
        });
        const savedSponsor = await newSponsor.save();
        return savedSponsor;
    } catch (error) {
        console.error('Error adding new sponsor channel:', error);
        throw error;
    }
};

exports.removeSponsorChannel = async (channelId) => {
    try {
        const result = await Sponsor.findOneAndDelete({ channel_id: channelId });
        if (!result) {
            throw new Error('Sponsor channel not found');
        }
        return result;
    } catch (error) {
        console.error('Error removing sponsor channel:', error);
        throw error;
    }
};
