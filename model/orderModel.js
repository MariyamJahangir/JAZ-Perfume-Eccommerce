const mongoose = require("mongoose");

// const orderSchema = new mongoose.Schema({
//     userId: { 
//         type: mongoose.Schema.Types.ObjectId, 
//         ref: "User", 
//         required: true 
//     },
//     productId: { 
//         type: mongoose.Schema.Types.ObjectId, 
//         ref: "Product", 
//         required: true 
//     },
//     productVariantId: { 
//         type: mongoose.Schema.Types.ObjectId, 
//         ref: "ProductVariant", 
//         required: false },
//     addressId: { 
//         type: mongoose.Schema.Types.ObjectId, 
//         ref: "Address", 
//         required: true 
//     },
//     orderId: { 
//         type: String, 
//         required: true, 
//         unique: true 
//     },
//     orderStatus: { 
//         type: String, 
//         enum: ["processing", "shipped", "delivered", "cancelled", "returned"], 
//         default: "processing" 
//     },
//     name: { 
//         type: String, 
//         required: true 
//     },
//     images: { 
//         type: [String], 
//         required: true 
//     },
//     price: { 
//         type: Number, 
//         required: true 
//     },
//     discount: { 
//         type: Number, 
//         default: 0 
//     },
//     quantityCount: { 
//         type: Number, 
//         required: true 
//     },
//     quantityML: { 
//         type: Number 
//     },
//     paymentMethod: { 
//         type: String, 
//         required: true 
//     },
//     addressDetails: { 
//         type: String, 
//         required: true 
//     },
//     cancelReasons: { 
//         type: String, 
//         default: null 
//     },
// }, { timestamps: true });


const orderSchema = new mongoose.Schema({
    orderId: { 
        type: String, 
        unique: true, 
        default: () => `ORD-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`
    },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    items: [
        {
            productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
            quantity: { type: Number, required: true },
            price: { type: Number, required: true },
            status: { type: String, enum: ["Pending", "Processing", "Shipped", "Delivered"], default: "Pending" },
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
    orderDate: { type: Date, default: Date.now }
});

module.exports = mongoose.model("order", orderSchema);
