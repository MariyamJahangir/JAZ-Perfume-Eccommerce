const orderModel = require('../../model/orderModel')


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




// const LoadOrderDetail = async (req, res) => {
//     try {
//         const orderId = req.params.id; // Get order ID from URL params
//         const productId = req.query.productId; // Get product ID from query

//         // Fetch the order and populate necessary fields
//         const order = await orderModel.findById(orderId)
//             .populate('userId')
//             .populate('items.productId')
//             .lean();

//         if (!order) {
//             return res.status(404).send('Order not found');
//         }

//         // Find the specific ordered item based on productId
//         const orderedItem = order.items.find(item => item.productId._id.toString() === productId);

//         console.log(orderedItem)

//         if (!orderedItem) {
//             return res.status(404).send('Ordered item not found');
//         }

//         let statusOptions = [];

//         switch (orderedItem.status) {
//             case "Pending":
//                 statusOptions = ["Processing", "Cancelled"];
//                 break;
//             case "Processing":
//                 statusOptions = ["Shipped", "Cancelled"];
//                 break;
//             case "Shipped":
//                 statusOptions = ["Delivered"];
//                 break;
//             case "Delivered":
//                 statusOptions = ["Returned"];
//                 break;
//             default:
//                 statusOptions = []; // If already Cancelled or Returned, no options
//         }


//         res.render('admin/order-detail', { order, orderedItem, statusOptions }); // Pass order and single item
//     } catch (error) {
//         console.error(error);
//         res.status(500).send('Internal Server Error');
//     }
// };

const LoadOrderDetail = async (req, res) => {
    try {
        const orderId = req.params.id;
        const productId = req.query.productId;

        const order = await orderModel.findById(orderId)
            .populate('userId')
            .populate('items.productId')
            .lean();

        if (!order) {
            return res.status(404).send('Order not found');
        }

        const orderedItem = order.items.find(item => item.productId._id.toString() === productId);
        if (!orderedItem) {
            return res.status(404).send('Ordered item not found');
        }

        // Determine next valid status options
        let statusOptions = [];
        switch (orderedItem.status) {
            case "Pending":
                statusOptions = ["Processing", "Cancelled"]; // Can move to Processing or be Cancelled
                break;
            case "Processing":
                statusOptions = ["Shipped", "Cancelled"]; // Can move to Shipped or be Cancelled
                break;
            case "Shipped":
                statusOptions = ["Delivered"]; // Can only move to Delivered
                break;
            // case "Delivered":
            //     statusOptions = []; // Can only be Returned
            //     break;
            default:
                statusOptions = []; // No changes allowed if Cancelled/Returned
        }

        res.render('admin/order-detail', { order, orderedItem, statusOptions });
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
};


// const updateOrderStatus = async (req, res) => {
//     try {
//         const { status } = req.body;
//         const { orderId, productId } = req.params;

//         const order = await orderModel.findById(orderId);
//         if (!order) {
//             return res.status(404).json({ error: "Order not found" });
//         }

//         // Find the ordered item and update its status
//         const orderedItem = order.items.find(item => item.productId.toString() === productId);
//         if (!orderedItem) {
//             return res.status(404).json({ error: "Ordered item not found" });
//         }

//         orderedItem.status = status;
//         await order.save();

//         res.status(200).json({ message: "Status updated successfully!" });
//     } catch (error) {
//         console.error("Error updating order status:", error);
//         res.status(500).json({ error: "Internal Server Error" });
//     }
// };

const updateOrderStatus = async (req, res) => {
    try {
        const { orderId, productId } = req.params;
        const { status } = req.body;

        // Find the order by ID
        const order = await orderModel.findById(orderId);
        if (!order) {
            return res.status(404).send("Order not found");
        }

        // Find the ordered item within the order
        const orderedItem = order.items.find(item => item.productId.toString() === productId);
        if (!orderedItem) {
            return res.status(404).send("Ordered item not found");
        }

        // Update the item's status
        orderedItem.status = status;
        await order.save();

        res.redirect(`/admin/order-detail/${orderId}?productId=${productId}`); // Redirect back to order detail page
    } catch (error) {
        console.error("Error updating order status:", error);
        res.status(500).send("Internal Server Error");
    }
}




module.exports = {
    LoadOrders,
    LoadOrderDetail,
    updateOrderStatus
}