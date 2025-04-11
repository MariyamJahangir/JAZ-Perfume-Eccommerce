const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: true 
    },
    code: { 
        type: String, 
        required: true, 
        unique: true 
    },
    description: { 
        type: String 
    },
    start: { 
        type: Date, 
        required: true 
    },
    expiry: { 
        type: Date, 
        required: true 
    },
    discountType: { 
        type: String, 
        enum: ["fixed", "percentage"], 
        required: true 
    },
    discount: {
        type: Number, 
        required: true
    },
    maxDiscount: { 
        type: Number, 
        default: null // Optional: Only for percentage-based discounts
    },
    minAmount: { 
        type: Number, 
        required: true 
    },
    maxAmount: { 
        type: Number, 
        default: null // Optional: Limits max eligible amount 
    },
    isActive: { 
        type: Boolean, 
        default: true 
    },
    totalUsageLimit: { 
        type: Number, 
        required: true // Controls how many times this coupon can be used globally
    },
    maxUsesPerUser: { 
        type: Number, 
        default: 1 // Limits how many times a single user can use this coupon
    },
    usedCount: { 
        type: Number, 
        default: 0 // Track how many times the coupon has been used
    },
    usedBy: [{ 
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        usedTimes: { type: Number, default: 0 } // Tracks individual user usage
    }]
}, {
    timestamps: true
});

module.exports = mongoose.model("Coupon", couponSchema);
