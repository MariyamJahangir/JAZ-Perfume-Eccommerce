const cron = require('node-cron');
const OTP = require('../model/otpModel'); // Import the OTP model

// Schedule a cron job to clean up expired OTPs
cron.schedule('0 * * * *', async () => {
    try {
        const now = new Date();
        await OTP.deleteMany({ createdAt: { $lte: now } });
        console.log('Expired OTPs cleaned up.');
    } catch (error) {
        console.error('Error cleaning up expired OTPs:', error);
    }
});

module.exports = cron;
