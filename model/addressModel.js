const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema(
    {
        firstname: {
            type: String,
        },
        lastname:{
            type: String,
        },
        address: {
            type: String,
        },
        locality: {
            type: String,
        },
        pincode: {
            type: Number,
        },
        district: {
            type: String,
        },
        state: {
            type: String,
        },
        phone: {
            type: Number,
        },
        country: {
            type: String,
        },
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'user',
            required: true
        },
        deleted:{
            type: Boolean,
            default: false
        },
    },
    {
        timestamps: true,
    },
);


module.exports = mongoose.model('userAddress', addressSchema);