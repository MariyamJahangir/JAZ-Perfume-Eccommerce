const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true
  },
  otp: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 3600 
  }
});

const OTP = mongoose.model('OTP', otpSchema);


async function generateOrUpdateOtp(email, otp) {
  const currentTime = new Date();
  
 
  await OTP.deleteMany({ email: email, createdAt: { $lt: new Date(currentTime - 3600000) } });

  
  const result = await OTP.updateOne(
    { email: email }, 
    { $set: { otp: otp, createdAt: currentTime } }, 
    { upsert: true } 
  );
  
  return result;
}

module.exports = OTP;
