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

// const LoadOrders = async (req, res) => {
//     try {
//         let { page = 1, limit = 5, search = "" } = req.query;
//         page = parseInt(page);
//         limit = parseInt(limit);

//         const query = {};

//         if (search) {
//             query.$or = [
//                 { orderId: { $regex: search, $options: "i" } },
//                 { "orderId.userId.firstname": { $regex: search, $options: "i" } },
//                 { "userId.lastname": { $regex: search, $options: "i" } }
//             ];
//         }

//         const orders = await orderModel.find(query)
//             .populate("userId", "firstname lastname email")
//             .populate("items.productId", "name images")
//             .sort({ orderDate: -1 })
//             .skip((page - 1) * limit)
//             .limit(limit)
//             .lean();

//         const totalOrders = await orderModel.countDocuments(query);
//         const totalPages = Math.ceil(totalOrders / limit);

//         res.render("admin/orders", {
//             orders,
//             currentPage: page,
//             totalPages,
//             limit,
//             search
//         });
//     } catch (err) {
//         console.error("Error fetching orders:", err);
//         res.status(500).send("Server Error");
//     }
// };



const LoadOrderDetail = async (req, res) => {
    try {
        const orderId = req.params.id;
        //const productId = req.query.productId;

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

        console.log("order : ", order)

        res.render('admin/order-detail', { order });
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
};





// const updateOrderStatus = async (req, res) => {
//     try {
//         const { orderId, productId } = req.params;
//         const { status } = req.body;

//         console.log("status:", status)
//         // Find the order by ID
//         const order = await orderModel.findById(orderId);
//         if (!order) {
//             return res.status(404).send("Order not found");
//         }

//         // Find the ordered item within the order
//         const orderedItem = order.items.find(item => item.productId.toString() === productId);
//         if (!orderedItem) {
//             return res.status(404).send("Ordered item not found");
//         }

//         // Update the item's status
//         if (status == 'Delivered') {
//             orderedItem.deliveredDate = new Date()
//         }
//         orderedItem.status = status;
//         await order.save();

//         res.redirect(`/admin/order-detail/${orderId}?productId=${productId}`); // Redirect back to order detail page
//     } catch (error) {
//         console.error("Error updating order status:", error);
//         res.status(500).send("Internal Server Error");
//     }
// }


const updateOrderStatus = async (req, res) => {
    const { orderId, productId } = req.params;
    const { status } = req.body;

    try {

        const order = await orderModel.findById(orderId);
        if (!order) {
            return res.status(404).send("Order not found");
        }

        order.items.forEach(item => {
            if (item.productId.toString() === productId) {
                // If status is being changed to "Delivered"
                if (status === "Delivered") {
                    // Only set delivery date if it is null
                    if (!item.deliveredDate) {
                        item.deliveredDate = new Date();
                    }
                }
                // Update the item status
                item.status = status;
            }
        });

        // Save the updated order
        await order.save();
        
        // Check if all items in the order are delivered
        if ( order.items.every(item => item.status === "Delivered" || item.status === "Cancelled" || item.status === "Return Approved")) {
            await orderModel.updateOne({ _id: orderId }, { $set: { orderStatus: "Completed" } });
        }else await orderModel.updateOne({ _id: orderId }, { $set: { orderStatus: "Not completed" } });


        res.redirect(`/admin/order-detail/${orderId}`); // Redirect back to order detail page
    } catch (error) {
        console.error("Error updating order status:", error);
        res.status(500).send("Error updating order status");
    }


}    



module.exports = {
    LoadOrders,
    LoadOrderDetail,
    updateOrderStatus
}