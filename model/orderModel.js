const mongoose = require("mongoose");

const generateOrderId = () => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let orderId = '';
    for (let i = 0; i < 10; i++) {
        orderId += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return orderId;
};

const orderSchema = new mongoose.Schema({
    orderId: { 
        type: String, 
        unique: true, 
        //default: () => `ORD-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`
        default: generateOrderId
    },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    items: [
        {
            productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
            variantId: { type: mongoose.Schema.Types.ObjectId, required: true },
            quantityCount: { type: Number, required: true },
            price: { type: Number, required: true },
            status: { type: String, enum: ["Pending", "Processing", "Shipped", "Delivered", "Cancelled", "Returned", "Return Approved"], default: "Pending" },
            deliveredDate:{ type: Date, default: null },
            cancelReason: { 
                type: String, 
                enum: ["Order by mistake", "Found a better price", "Delivery taking too long"], 
                default: null 
            }, // ✅ Added cancellation reason field
            returnReason: { type: String, default: null },
        }
    ],
    totalAmount: { type: Number, required: true },
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
    paymentMethod: { type: String, required: true },
    orderDate: { type: Date, default: Date.now },
    orderStatus: { type: String, enum: ['Completed', 'Not completed'], default: 'Not completed' }

});

module.exports = mongoose.model("order", orderSchema);
