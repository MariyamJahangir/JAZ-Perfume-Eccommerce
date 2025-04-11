const orderModel = require('../../model/orderModel');
const productModel = require('../../model/productModel');


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
                    statusOptions = []; // No changes allowed if Cancelled/Returned
            }

            item.statusOptions = statusOptions; // Attach status options to item
            return item;
        });


        res.render('admin/order-detail', { order });
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
};


// const updateOrderStatus = async (req, res) => {
//     const { orderId, productId } = req.params;
//     const { status } = req.body;

//     try {

//         const order = await orderModel.findById(orderId);
//         if (!order) {
//             return res.status(404).send("Order not found");
//         }

//         order.items.forEach(item => {
//             if (item.productId.toString() === productId) {
//                 // If status is being changed to "Delivered"
//                 if (status === "Delivered") {
//                     // Only set delivery date if it is null
//                     if (!item.deliveredDate) {
//                         item.deliveredDate = new Date();
//                     }
//                 }
//                 // Update the item status
//                 item.status = status;
//             }
//         });

//         // Save the updated order
//         await order.save();
        
//         // Check if all items in the order are delivered
//         if ( order.items.every(item => item.status === "Delivered" || item.status === "Cancelled" || item.status === "Return Approved")) {
//             await orderModel.updateOne({ _id: orderId }, { $set: { orderStatus: "Completed" } });
//         }else await orderModel.updateOne({ _id: orderId }, { $set: { orderStatus: "Not completed" } });


//         res.redirect(`/admin/order-detail/${orderId}`); // Redirect back to order detail page
//     } catch (error) {
//         console.error("Error updating order status:", error);
//         res.status(500).send("Error updating order status");
//     }


// }    


const updateOrderStatus = async (req, res) => {
    const { orderId, productId } = req.params;
    const { status } = req.body;

    try {
        const order = await orderModel.findById(orderId);
        if (!order) {
            return res.status(404).json({ error: "Order not found" });
        }

        let itemUpdated = false;

        order.items.forEach(item => {
            if (item.productId.toString() === productId) {
                // ✅ If status is "Delivered", set deliveredDate if not already set
                if (status === "Delivered" && !item.deliveredDate) {
                    item.deliveredDate = new Date(); 
                }

                // ✅ Update the item status
                item.status = status;
                itemUpdated = true;
            }
        });

        if (!itemUpdated) {
            return res.status(404).json({ error: "Product not found in this order" });
        }

        // ✅ Save the updated order item
        await order.save();

        const finalStatuses = ["Delivered", "Cancelled", "Returned", "Return Approved"];

        // ✅ Check if all items in the order are in a final state
        const allItemsCompleted = order.items.every(item =>finalStatuses.includes(item.status));

        // ✅ Update order status and payment status if all items are completed
        const updateFields = { 
            orderStatus: allItemsCompleted ? "Completed" : "Processing" 
        };

        if (allItemsCompleted) {
            updateFields["payment.status"] = "Paid";
        }

        // ✅ Update `orderStatus` based on the item statuses
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