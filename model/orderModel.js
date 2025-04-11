const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
    orderId: { 
        type: String, 
        unique: true, 
        required: true
    },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    items: [
        {
            productId: { 
                type: mongoose.Schema.Types.ObjectId, 
                ref: "Product", 
                required: true 
            },
            variantId: { 
                type: mongoose.Schema.Types.ObjectId, 
                required: true 
            },
            quantityCount: { 
                type: Number, 
                required: true 
            },
            basePrice: { 
                type: Number, 
                required: true 
            },
            offerDiscount:{
                type: Number, 
            },
            discountPrice:{
                type: Number,
            },
            status: { 
                type: String, 
                enum: ["Pending", "Processing", "Shipped", "Delivered", "Cancelled", "Returned", "Return Approved"], 
                default: "Pending" 
            },
            deliveredDate:{ 
                type: Date, 
                default: null 
            },
            cancelReason: { 
                type: String, 
                enum: ["Order by mistake", "Found a better price", "Delivery taking too long"], 
                default: null 
            }, // ✅ Added cancellation reason field
            returnReason: { 
                type: String, 
                default: null 
            },
        }
    ],
    totalAmount: { 
        type: Number, 
        required: true 
    },
    coupon: {
        type: String,
        required: false
    },
    couponDiscount: {
        type: Number,
        default: 0 // The discount applied after using the coupon
    },
    finalAmount: {
        type: Number,
        required: true // Total amount after discount
    },
    shippingAddress: {
        firstname: String,
        lastname: String,
        address: String,
        locality: String,
        district: String,
        state: String,
        pincode: String,
        phone: String
    },
    payment: { 
        method: { type: String, enum: ['COD', 'RAZORPAY','WALLET'], required: true },
        status: { type: String, enum: ['Pending', 'Paid', 'Failed'], default: 'Pending' },
        orderId: { type: String }, 
        paymentId: { type: String },
        signature: { type: String }, 
    },
    orderDate: { 
        type: Date, 
        default: Date.now 
    },
    orderStatus: { 
        type: String, 
        enum: ['Confirmed', 'Processing', 'Completed' ], 
        default: 'Confirmed' 
    }

});

module.exports = mongoose.model("order", orderSchema);
