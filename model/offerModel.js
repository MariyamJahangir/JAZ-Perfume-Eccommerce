const mongoose = require('mongoose');

const OfferSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },
        description: {
            type: String,
            trim: true,
        },
        offerType: {
            type: String,
            required: true,
            enum: ['product', 'category', 'referral'],
        },
        start: {
            type: Date,
            required: true,
        },
        expiry: {
            type: Date,
            required: true,
        },
        discountType: {
            type: String,
            enum: ['percentage', 'fixed'],
            default: 'percentage',
        },
        discount: {
            type: Number,
            required: true,
            min: 0,
        },
        maxDiscount: {
            type: Number,
            min: 0,
            default: null, // Set to null if not applicable
        },
        isActive: {
            type: Boolean,
            default: true,
        }
    },
    {
        timestamps: true,
    }
);



module.exports = mongoose.model('Offer', OfferSchema);