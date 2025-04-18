const orderModel = require('../model/orderModel')
const Razorpay = require('razorpay');
const crypto = require('crypto');
// const dotenv = require('dotenv');
require('dotenv').config();


const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});


const createRazorpayOrder = async (req, res) => {
    try {
        const { total } = req.body;

        if (!total) {
            return res.status(400).json({ success: false, message: "Invalid order amount." });
        }

        const userId = req.session.user.id;

        const options = {
            amount: Math.round(total * 100),
            currency: "INR",
            receipt: `receipt_${userId}_${Date.now().toString().slice(-5)}`
        };

        const razorpayOrder = await razorpay.orders.create(options);


        return res.status(201).json({
            success: true,
            order: { key: process.env.RAZORPAY_KEY_ID, ...razorpayOrder }
        });
    } catch (err) {
        console.error("Error creating Razorpay order:", err);
        return res.status(500).json({ success: false, message: "Payment creation failed" });
    }
};


const verifyPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = req.body;
        

        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(razorpay_order_id + "|" + razorpay_payment_id)
            .digest("hex");


        if (expectedSignature !== razorpay_signature) {
            console.log("Verification Failed.");
            return res.status(400).json({ success: false, message: "Payment verification failed" });
        }

        const order = await orderModel.findOne({ orderId })

        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        order.payment.status = "Paid";
        order.payment.orderId = razorpay_order_id;
        order.payment.paymentId = razorpay_payment_id;
        order.payment.signature = razorpay_signature;
        order.orderStatus = "Confirmed";
        await order.save();

        console.log("Payment Verified Successfully!");
        return res.status(200).json({ success: true, message: "Payment verified successfully" });


    } catch (err) {
        console.error("Payment verification error:", err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
};










module.exports = {
    createRazorpayOrder,
    verifyPayment,
    
}