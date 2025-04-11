const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema(
    {
        user:{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'user',
            required: true
        },
        products:{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },
        variant: {
            type: mongoose.Schema.Types.ObjectId,
            required: true
        },
        totalBasePrice:{
            type: Number,
            required: true
        },
        totalDiscountPrice:{
            type: Number,
            required: true,
            default: 0
        },
        totalDiscount: {
            type: Number,
            required: false,
            default: 0
        },
        quantityCount: {
            type: Number,
            required: false,
        }
    },
    {
        timestamps: true,
    },
);


module.exports = mongoose.model('userCart', cartSchema);