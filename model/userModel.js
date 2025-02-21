const mongoose = require('mongoose');
const moment = require('moment');

const userSchema = new mongoose.Schema({
    firstname: {
        type: String,
        required: true
    },
    lastname: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: function () {
            return !this.googleId;
        },
    },
    googleId: {
        type: String,
        unique: true
    },
    phone:{
        type: String,
    },
    gender:{
        type: String,
        enum: ['male', 'female'],
    },
    address: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'userAddress',
    }],
    status: {
        type: String,
        enum: ['active', 'blocked'],
        default: 'active'
    },
    isAdmin: {
        type: Boolean,
        default: false
    },
    lastOtpSentAt: {
        type: Date,
        default: null
    }
},
    {
        timestamps: true,
    }
)

module.exports = mongoose.model('User', userSchema); // cllection name will be plural (users)