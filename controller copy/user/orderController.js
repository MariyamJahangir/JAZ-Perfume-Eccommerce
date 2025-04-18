const userModel = require('../../model/userModel')
const addressModel = require('../../model/addressModel')
const productModel = require('../../model/productModel')
const cartModel = require('../../model/cartModel')
const orderModel = require('../../model/orderModel')
const walletModel = require('../../model/walletModel')
const couponModel = require('../../model/couponModel')

const mongoose = require('mongoose');



const PlaceOrder = async (req, res) => {
    try {
        const { shippingAddress, payment, items, totalAmount, finalAmount, coupon, couponDiscount } = req.body;
        console.log(req.body)

        
        for (const item of items) {
            const product = await productModel.findById(item.productId);

            if (!product) {
                return res.status(404).json({ message: `Product not found: ${item.productId}` });
            }

            
            const variant = product.variant.id(item.variantId);
            if (!variant) {
                return res.status(404).json({ message: `Variant not found: ${item.variantId}` });
            }

           
            if (variant.stockQuantity < item.quantityCount) {
                return res.status(400).json({ message: `Not enough stock for product: ${product.name}` });
            }

            
            variant.stockQuantity -= item.quantityCount;

            await product.save();
        }

        const generateOrderId = () => Math.random().toString(36).substring(2, 12).toUpperCase();
        let orderId = generateOrderId();

        while (await orderModel.findOne({ orderId })) {
            orderId = generateOrderId();
        }

        const newOrder = new orderModel({
            userId: req.session.user.id, // Assuming you're using Passport.js for authentication
            orderId,
            items,
            totalAmount,
            coupon,
            couponDiscount,
            finalAmount,
            shippingAddress,
            payment: {
                method: payment.method,
                status: payment.status,
                orderId: payment.orderId || null,
                paymentId: payment.paymentId || null,
                signature: payment.signature || null,
            },
        });

        console.log('newOrder:', newOrder)

        await newOrder.save();

        // If a coupon was applied, update coupon usage
        if (coupon) {
            const couponDoc = await couponModel.findOne({ code: coupon });

            if (couponDoc) {
                // Increment total usage count
                couponDoc.usedCount += 1;

                const userId = req.session.user.id;
                const userUsage = couponDoc.usedBy.find(entry => entry.userId.toString() === userId.toString());
                

                if (userUsage) {
                    userUsage.usedTimes += 1;
                } else {
                    couponDoc.usedBy.push({ userId, usedTimes: 1 });
                }

                await couponDoc.save();
            }
        }

        await cartModel.deleteMany({ user: req.session.user.id });

        res.status(201).json({ success: true, message: 'Order placed successfully!', orderId });
    } catch (error) {
        console.error('Error placing order:', error);
        res.status(500).json({ success: false, message: 'Failed to place order.' });
    }

}



const OrderPlaced = (req, res) => {
    res.render('user/order-placed')
}

const OrderFailed = (req, res) => {
    res.render('user/order-failed')
}





const LoadOrders = async (req, res) => {
    try {
        const userId = req.session.user.id;
        const page = parseInt(req.query.page) || 1;
        const perPage = 5;

        // Count total orders for pagination
        const totalOrders = await orderModel.countDocuments({ userId });
        const totalPages = Math.ceil(totalOrders / perPage);

        // Fetch paginated orders with product details
        const orders = await orderModel.find({ userId })
            .populate({
                path: 'items.productId',
                select: 'name images variant'
            })
            .sort({ orderDate: -1 })
            .skip((page - 1) * perPage)
            .limit(perPage)
            .lean();

        // Match variants manually and build enriched orders
        const populatedOrders = orders.map(order => {
            order.items = order.items.map(item => {
                const product = item.productId;
                const variant = product.variant.find(v => v._id.toString() === item.variantId.toString());

                return {
                    ...item,
                    productDetails: {
                        name: product.name,
                        images: product.images,
                        variant: variant
                    }
                };
            });
            return order;
        });

        res.render('user/orders', {
            orders: populatedOrders,
            currentPage: page,
            totalPages
        });

    } catch (error) {
        console.error("Error loading orders:", error);
        res.status(500).send('Server Error');
    }
};




const OrderDetail = async (req, res) => {
    try {
        const { orderId } = req.params;
        const userId = req.session.user.id; 

       
        const order = await orderModel.findOne({ _id: orderId, userId }).populate('items.productId').lean();

        if (!order) {
            return res.status(404).send('Order not found');
        }

        
        const totalOfferDiscount = order.items.reduce((total, item) => {
            return total + (item.offerDiscount || 0); 
        }, 0);

        const totalCouponDiscount = order.couponDiscount

        const totalDiscount = totalOfferDiscount + totalCouponDiscount

        // Render the order detail page with specific item data
        res.render('user/order-detail', {
            order,
            userId,
            totalDiscount
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
};



const ReturnOrder = async (req, res) => {
    try {
        const { orderId, productId } = req.params;
        const { returnReason } = req.body;


        // Find the order
        //let order = await orderModel.findOne({ orderId });

        let order = await orderModel.findById(orderId);

        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        // Find the ordered item
        let orderedItem = order.items.find(item => item.productId.toString() === productId);
        if (!orderedItem) {
            return res.status(404).json({ success: false, message: "Product not found in order" });
        }

        // Only allow return if the item is delivered
        if (orderedItem.status !== "Delivered") {
            return res.status(400).json({ success: false, message: "Only delivered items can be returned" });
        }

        // Update status to "Returned"
        orderedItem.status = "Returned";
        orderedItem.returnReason = returnReason;
        order.orderStatus = "Processing"; // Keeping it consistent with order workflow


        await order.save();

        res.status(200).json({
            success: true,
            message: "Order return request submitted successfully",
            order,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};





const CancelOrder = async (req, res) => {
    try {
        const { orderId, productId, variantId } = req.params;
        const { cancelReason } = req.body;

        let product = await productModel.findById(productId);
        let variant = product.variant.find(v => v._id.toString() === variantId);

        let order = await orderModel.findById(orderId);
        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        let orderedItem = order.items.find(item => item.productId.toString() === productId && item.variantId.toString() === variantId);
        if (!orderedItem) {
            return res.status(404).json({ success: false, message: "Product not found in order" });
        }

        if (orderedItem.status !== "Delivered") {
            orderedItem.status = "Cancelled";
            orderedItem.cancelReason = cancelReason;
            variant.stockQuantity += orderedItem.quantityCount;

            // ✅ Wallet refund logic
            if (["RAZORPAY", "WALLET"].includes(order.payment.method) && order.payment.status === "Paid") {
                
                const refundAmount = orderedItem.discountPrice
                let wallet = await walletModel.findOne({ userId: order.userId });

                const transaction = {
                    amount: refundAmount,
                    type: "Credit",
                    description: `Refund for cancelled item in Order ${order.orderId}`
                };

                if (!wallet) {
                    wallet = new walletModel({
                        userId: order.userId,
                        balance: refundAmount,
                        transactions: [transaction]
                    });
                } else {
                    wallet.balance += refundAmount;
                    wallet.transactions.push(transaction);
                }

                await wallet.save();
            }

        } else {
            return res.status(400).json({ success: false, message: "Delivered items cannot be cancelled" });
        }

        // Update order status
        if (order.items.every(item => item.status === "Delivered" || item.status === "Cancelled")) {
            order.orderStatus = "Completed";
        } else {
            order.orderStatus = "Processing";
        }

        await order.save();
        await product.save();

        res.json({
            success: true,
            message: "Order cancelled successfully and amount refunded to wallet",
            orderId,
            updatedStatus: order.orderStatus
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};



module.exports = {
    PlaceOrder,
    OrderPlaced,
    OrderFailed,
    LoadOrders,
    OrderDetail,
    ReturnOrder,
    CancelOrder
}