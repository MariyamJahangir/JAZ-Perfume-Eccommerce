const mongoose = require('mongoose');
const moment = require('moment');


const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    image: {
        type: String   // Store image filename
    },
    offer: { 
        type: String, 
        default: null 
    },
    deleted: {
        type: Boolean,
        default: false
    }
},
    {
        timestamps: true, 
    }
);

module.exports = mongoose.model('Category', categorySchema);



