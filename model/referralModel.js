const mongoose = require("mongoose");

const ReferralSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true,
    },
    referredUsers: [{
        type: String,
        default: [],
        unique: true,
    }],
    amountEarned: {
        type: Number,
        default: 0
    },
    referralCode: {
        type: String,
        unique: true,
    }
});

module.exports = mongoose.model("Referral", ReferralSchema);
