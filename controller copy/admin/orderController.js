const orderModel = require('../../model/orderModel');
const productModel = require('../../model/productModel');
const walletModel = require('../../model/walletModel');

const LoadOrders = async (req, res) => {
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





module.exports = {
    LoadOrders,
    LoadOrderDetail,
    updateOrderStatus
}