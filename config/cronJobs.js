// const cron = require('node-cron');
// const OTP = require('../model/otpModel'); // Import the OTP model

// Schedule a cron job to clean up expired OTPs
// cron.schedule('*/2 * * * *', async () => {
//     try {
//         const now = new Date();
//         await OTP.deleteMany({ createdAt: { $lte: now } });
//         console.log('Expired OTPs cleaned up.');
//     } catch (error) {
//         console.error('Error cleaning up expired OTPs:', error);
//     }
// });


// Schedule a cron job to clean up expired OTPs every 2 minutes
// cron.schedule('*/2 * * * *', async () => {
//     try {
//         const expirationTime = new Date(Date.now() - 2 * 60 * 1000); // Subtract 2 minutes
//         const deleted = await OTP.deleteMany({ createdAt: { $lt: expirationTime } });
        
//         if (deleted.deletedCount > 0) {
//             console.log(`Deleted ${deleted.deletedCount} expired OTPs.`);
//         } else {
//             console.log('No expired OTPs found.');
//         }
//     } catch (error) {
//         console.error('Error cleaning up expired OTPs:', error);
//     }
// });

// module.exports = cron;
