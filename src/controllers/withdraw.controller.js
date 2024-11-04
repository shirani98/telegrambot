const Withdraw = require('../models/withdraw'); // Import the Withdraw model

// Function to handle withdrawal requests
exports.createWithdrawal = async (userId, amount, method, accountDetails) => {
    try {
        const existingRequest = await Withdraw.findOne({ userId, status: 'pending' });
        if (existingRequest) {
            return false;
        }
        const withdrawRequest = new Withdraw({
            userId,
            amount,
            method,
            accountDetails,
            status: 'pending',
            createdAt: new Date()
        });
        await withdrawRequest.save();
        return withdrawRequest;
    } catch (error) {
        console.error('Error creating withdrawal request:', error);
        throw error;
    }
};

// Function to update a withdrawal request
exports.updateWithdrawRequest = async (withdrawRequestId, updateData) => {
    try {
        const withdrawRequest = await Withdraw.findByIdAndUpdate(withdrawRequestId, updateData, { new: true });
        return withdrawRequest;
    } catch (error) {
        console.error('Error updating withdrawal request:', error);
        throw error;
    }
};

// Function to get all withdrawal requests
exports.getAllWithdrawRequests = async () => {
    try {
        const withdrawRequests = await Withdraw.find();
        return withdrawRequests;
    } catch (error) {
        console.error('Error getting all withdrawal requests:', error);
        throw error;
    }
};

// Function to get withdrawal requests by status
exports.getWithdrawRequestsByStatus = async (status) => {
    try {
        const withdrawRequests = await Withdraw.find({ status });
        return withdrawRequests;
    } catch (error) {
        console.error('Error getting withdrawal requests by status:', error);
        throw error;
    }
};

// Function to get withdrawal requests by user ID
exports.getWithdrawRequestsByUserId = async (userId) => {
    try {
        const withdrawRequests = await Withdraw.find({ userId });
        return withdrawRequests;
    } catch (error) {
        console.error('Error getting withdrawal requests by user ID:', error);
        throw error;
    }
};

// Function to get a withdrawal request by ID
exports.getWithdrawalRequestByUserId = async (userId) => {
    try {
        const withdrawRequest = await Withdraw.findOne({ userId: userId, status: 'pending' });
        return withdrawRequest;
    } catch (error) {
        console.error('Error getting withdrawal request by user ID:', error);
        throw error;
    }
};

// Function to process a withdrawal request
exports.processWithdrawal = async (withdrawalRequest) => {
    try {
        if (!withdrawalRequest) {
            throw new Error('Withdrawal request not found');
        }

        // Update the status to 'completed'
        withdrawalRequest.status = 'completed';
        
        // Save the updated withdrawal request
        await withdrawalRequest.save();

        console.log(`Withdrawal request ${withdrawalRequest._id} has been approved`);
        return withdrawalRequest;
    } catch (error) {
        console.error('Error processing withdrawal request:', error);
        throw error;
    }
};

// Function to reject a withdrawal request
exports.rejectWithdrawal = async (userId) => {
    try {
        const withdrawalRequest = await Withdraw.findOne({ userId: userId, status: 'pending' });
        if (!withdrawalRequest) {
            throw new Error('Pending withdrawal request not found');
        }

        // Update the status to 'rejected'
        withdrawalRequest.status = 'rejected';
        
        // Save the updated withdrawal request
        await withdrawalRequest.save();

        console.log(`Withdrawal request ${withdrawalRequest._id} has been rejected`);
        return withdrawalRequest;
    } catch (error) {
        console.error('Error rejecting withdrawal request:', error);
        throw error;
    }
};


// Function to get all pending withdrawal requests
exports.getPendingWithdrawals = async () => {
    try {
        const pendingWithdrawals = await Withdraw.find({ status: 'pending' });
        
        if (pendingWithdrawals.length === 0) {
            console.log('No pending withdrawal requests found');
            return [];
        }

        console.log(`Found ${pendingWithdrawals.length} pending withdrawal requests`);
        return pendingWithdrawals;
    } catch (error) {
        console.error('Error getting pending withdrawal requests:', error);
        throw error;
    }
};
