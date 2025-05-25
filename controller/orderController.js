const orderModel = require('../model/orderModel');
const productModel = require('../model/productModel');
const walletModel = require('../model/walletModel');

const userModel = require('../model/userModel')
const addressModel = require('../model/addressModel')
const cartModel = require('../model/cartModel')
const couponModel = require('../model/couponModel')
const mongoose = require('mongoose');
const PDFDocument = require('pdfkit');

//admin

const LoadAdminOrders = async (req, res) => {
    try {
        const orders = await orderModel.find()
            .populate("userId", "firstname lastname email") // Populate user details
            .populate("items.productId", "name images") // Populate product details
            .sort({ orderDate: -1 }).lean();

        res.render("admin/orders", { orders });
    } catch (err) {
        console.error("Error fetching orders:", err);
        res.status(500).send("Server Error");
    }
};


const LoadOrderDetail = async (req, res) => {
    try {
        const orderId = req.params.id;


        const order = await orderModel.findById(orderId)
            .populate('userId')
            .populate('items.productId')
            .lean();

        if (!order) {
            return res.status(404).send('Order not found');
        }

        order.items = order.items.map(item => {
            if (item.productId && item.productId.variant) {
                item.variantId = item.productId.variant.find(v => v._id.toString() === item.variantId.toString());
            }

            // Determine next valid status options
            let statusOptions = [];
            switch (item.status) {
                case "Pending":
                    statusOptions = ["Processing"];
                    break;
                case "Processing":
                    statusOptions = ["Shipped"];
                    break;
                case "Shipped":
                    statusOptions = ["Delivered"];
                    break;
                case "Returned":
                    statusOptions = ["Return Approved"];
                    break;
                default:
                    statusOptions = [];
            }

            item.statusOptions = statusOptions;
            return item;
        });


        res.render('admin/order-detail', { order });
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
};



const updateOrderStatus = async (req, res) => {
    const { orderId, productId } = req.params;
    const { status } = req.body;

    try {
        const order = await orderModel.findById(orderId);
        if (!order) {
            return res.status(404).json({ error: "Order not found" });
        }



        let itemUpdated = false;



        for (const item of order.items) {
            if (item.productId.toString() === productId) {

                if (status === "Delivered" && !item.deliveredDate) {
                    item.deliveredDate = new Date();
                }

                if (status === 'Return Approved') {
                    if (["RAZORPAY", "WALLET"].includes(order.payment.method) && order.payment.status === "Paid") {

                        const refundAmount = item.discountPrice; // corrected variable name from orderedItem
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
                }


                item.status = status;
                itemUpdated = true;
            }
        }




        if (!itemUpdated) {
            return res.status(404).json({ error: "Product not found in this order" });
        }


        await order.save();

        const finalStatuses = ["Delivered", "Cancelled", "Returned", "Return Approved"];


        const allItemsCompleted = order.items.every(item => finalStatuses.includes(item.status));


        const updateFields = {
            orderStatus: allItemsCompleted ? "Completed" : "Processing"
        };

        if (allItemsCompleted) {
            updateFields["payment.status"] = "Paid";
        }


        await orderModel.updateOne(
            { _id: orderId },
            { $set: updateFields }
        );

        res.status(200).json({ success: true, message: "Order status updated successfully" });
    } catch (error) {
        console.error("Error updating order status:", error);
        res.status(500).json({ error: "Error updating order status" });
    }
};






//user

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
        const orders = await orderModel.find({
            userId,
            $nor: [
                { 'payment.method': 'RAZORPAY', 'payment.status': 'Pending' }
            ]
        })
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
        console.log('order:', order)

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



const downloadInvoice = async (req, res) => {
    try {
        const order = await orderModel.findById(req.params.orderId)
            .populate('items.productId')
            .lean();

        if (!order) return res.status(404).send('Order not found');

        res.setHeader('Content-Disposition', `attachment; filename=invoice-${order.orderId}.pdf`);
        res.setHeader('Content-Type', 'application/pdf');

        const doc = new PDFDocument({ margin: 40 });
        doc.pipe(res);

        // 🧾 Invoice Header
        doc.fontSize(20).text('INVOICE', { align: 'center' });
        doc.moveDown();

        // 🧍 Customer Info
        doc.fontSize(12)
            .text(`Order ID: ${order.orderId}`)
            .text(`Order Date: ${new Date(order.orderDate).toLocaleDateString()}`)
            .text(`Customer: ${order.shippingAddress.firstname} ${order.shippingAddress.lastname}`)
            .text(`Phone: ${order.shippingAddress.phone}`)
            .text(`Address: ${order.shippingAddress.address}, ${order.shippingAddress.locality}, ${order.shippingAddress.district}, ${order.shippingAddress.state} - ${order.shippingAddress.pincode}`)
            .moveDown();

        // 📌 Column X positions
        const colNo = 50;
        const colProduct = 90;
        const colQty = 300;
        const colPrice = 350;
        const colDiscount = 430;
        const colTotal = 510;

        // 🎯 Table Header
        let y = doc.y;
        doc.font('Helvetica-Bold').fontSize(12);
        doc.text('No', colNo, y);
        doc.text('Product', colProduct, y);
        doc.text('Qty', colQty, y);
        doc.text('Price', colPrice, y);
        doc.text('Discount', colDiscount, y);
        doc.text('Total', colTotal, y);
        y += 20;
        doc.font('Helvetica');

        // 📦 Table Rows
        order.items.forEach((item, index) => {
            const total = item.discountPrice * item.quantityCount;

            doc.text(index + 1, colNo, y);
            doc.text(item.productId.name || 'Product', colProduct, y, { width: 200 });
            doc.text(item.quantityCount, colQty, y);
            doc.text(`Rs.${item.basePrice}`, colPrice, y);
            doc.text(`Rs.${item.offerDiscount}`, colDiscount, y);
            doc.text(`Rs.${total}`, colTotal, y);

            y += 20; // Move to next row
        });

        // 💳 Order Summary
        doc.moveDown(2);
        doc.font('Helvetica-Bold');

        let summaryY = doc.y;
        const labelX = 370;
        const valueX = 500;

        doc.text('Subtotal:', labelX, summaryY);
        doc.text(`Rs.${order.totalAmount}`, valueX, summaryY);

        summaryY += 20;
        doc.text('Coupon Discount:', labelX, summaryY);
        doc.text(`Rs.${order.couponDiscount}`, valueX, summaryY);

        summaryY += 20;
        doc.text('Final Amount:', labelX, summaryY);
        doc.text(`Rs.${order.finalAmount}`, valueX, summaryY);

        summaryY += 20;
        doc.text('Payment:', labelX, summaryY);
        doc.text(`${order.payment.method} (${order.payment.status})`, valueX, summaryY);


        doc.end();
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
}




const LoadOrderPending = async (req, res) => {
    try {
        const userId = req.session.user.id;
        const page = parseInt(req.query.page) || 1;
        const perPage = 5;

        // Count total orders for pagination
        const totalOrders = await orderModel.countDocuments({ userId });
        const totalPages = Math.ceil(totalOrders / perPage);

        // Fetch paginated orders with product details
        const orders = await orderModel.find({
            userId,
            'payment.method': 'RAZORPAY',
            'payment.status': 'Pending'
        })
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

        res.render('user/orders-pending', {
            orders: populatedOrders,
            currentPage: page,
            totalPages
        });

    } catch (error) {
        console.error("Error loading orders:", error);
        res.status(500).send('Server Error');
    }
};




module.exports = {
    LoadAdminOrders,
    LoadOrderDetail,
    updateOrderStatus,


    PlaceOrder,
    OrderPlaced,
    OrderFailed,
    LoadOrders,
    OrderDetail,
    ReturnOrder,
    CancelOrder,
    downloadInvoice,
    LoadOrderPending
}