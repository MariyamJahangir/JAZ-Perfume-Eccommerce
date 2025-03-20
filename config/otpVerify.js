// // const crypto = require('crypto');
// const nodemailer = require('nodemailer');
// require('dotenv').config();

// const generateOTP = () => {
//     return crypto.randomInt(100000, 999999).toString(); // Secure 6-digit OTP
// };

// const sendEmail = async (email, otp) => {
//     try {
//         const transporter = nodemailer.createTransport({
//             service: 'gmail', // Replace with your email provider
//             auth: {
//                 user: process.env.EMAIL_USER, // Your email address
//                 pass: process.env.EMAIL_PASSWORD, // Your email password
//             },
//         });

//         const mailOptions = {
//             from: process.env.EMAIL_USER,
//             to: email,
//             subject: 'Your OTP for Signup Verification',
//             text: `Your OTP is ${otp}. Please use this to complete your registration.`,
//         };
//         console.log(`Sending OTP email to ${email}`);
//         await transporter.sendMail(mailOptions);
//         console.log('OTP sent successfully!');
//     } catch (error) {
//         console.error('Error sending OTP email:', error.message);
//         throw new Error('Failed to send OTP email. Please try again later.');
//     }
// };


// module.exports = {
//     // generateOTP,
//     sendEmail
// }