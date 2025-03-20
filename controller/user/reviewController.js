const reviewModel = require('../../model/reviewModel')
const orderModel = require('../../model/orderModel')

const checkPurchase = async (req, res) => {
    try {
        const userId = req.session.user.id;
        const productId = req.query.productId;

        if (!userId || !productId) {
            return res.status(400).json({ 
                canReview: false, 
                message: "Invalid request." 
            });
        }

        // Check if the user has an order with the product that has been delivered
        const order = await orderModel.findOne({
            userId,
            "items.productId": productId,
            "items.status": "Delivered"
        });

        if (order) {
            res.json({ canReview: true });
        } else {
            res.json({ 
                canReview: false,
                message: "You can only review products that you have purchased and received." 
            });
        }
    } catch (error) {
        console.error("Error checking purchase:", error);
        res.status(500).json({ canReview: false, message: "Server error. Please try again later." });
    }
}


const addReview = async (req, res) => {
    try {
        if (!req.session.user.id) {
            return res.status(401).json({ message: "User not authenticated" });
        }

        const { productId, rating, comment } = req.body;
        const userId = req.session.user.id;

        if (!productId || !rating || !comment) {
            return res.status(400).json({ message: "All fields are required" });
        }

        // Check if the user has an order with this product that has been delivered
        const order = await orderModel.findOne({
            userId,
            "items.productId": productId,
            "items.status": "Delivered"
        });

        if (!order) {
            return res.status(403).json({ message: "You can only review products you have purchased and received." });
        }

        // Create new review
        const newReview = new reviewModel({
            userId,
            productId,
            rating,
            comment
        });

        await newReview.save();
        res.status(201).json({ message: "Review added successfully", review: newReview });

    } catch (error) {
        console.error("Error adding review:", error);
        res.status(500).json({ message: "Server error" });
    }
};


module.exports = {
    checkPurchase,
    addReview
}