const nodemailer = require('nodemailer');
require('dotenv').config(); // To load environment variables

// Create a nodemailer transporter using Gmail SMTP (or any service you prefer)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
  }});
module.exports = transporter;  // Export transporter to use it in other files
