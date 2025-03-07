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
        const productId = req.query.productId;

        const order = await orderModel.findById(orderId)
            .populate('userId')
            .populate('items.productId')
            .lean();
        


        if (!order) {
            return res.status(404).send('Order not found');
        }
        
        if (order) {
            order.items = order.items.map(item => {
                if (item.productId && item.productId.variant) {
                    item.variantId = item.productId.variant.find(v => v._id.toString() === item.variantId.toString());
                }
                return item;
            });
        }
        console.log("*************")
        console.log("order: ", order)
        console.log("*************")
        const orderedItem = order.items.find(item => item.productId._id.toString() === productId);

        // console.log("order:", order)
        console.log("orderedItem: ", orderedItem)

        let product = await productModel.findById(productId)
        let productVariant = product.variant.find(v=>v._id.toString() === orderedItem.variantId._id.toString())
        console.log("*************")
        console.log("productVariant: ", productVariant)
        console.log("*************")
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
                statusOptions = ["Delivered", "Cancelled"]; // Can move to Delivered or be Cancelled
                break;
            case "Returned":
                statusOptions = ["Return Approved"]; // Can only move to Returned
                productVariant.stockQuantity += orderedItem.quantityCount
                await product.save()
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





const updateOrderStatus = async (req, res) => {
    try {
        const { orderId, productId } = req.params;
        const { status } = req.body;

        console.log("status:", status)
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
        if(status == 'Delivered'){
            orderedItem.deliveredDate = new Date()
        }
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