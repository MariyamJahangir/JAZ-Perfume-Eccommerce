const userModel = require('../../model/userModel')
const addressModel = require('../../model/addressModel')
const productModel = require('../../model/productModel')
const cartModel = require('../../model/cartModel')
const orderModel = require('../../model/orderModel')


// get Orders
const LoadOrders = async (req, res) => {
    try {
        const userId = req.session.user.id;

        // Step 1: Populate product details
        const orders = await orderModel.find({ userId })
            .populate({
                path: 'items.productId',
                select: 'name images variant'  // Include variants in the populated data
            })
            .sort({ orderDate: -1 })
            .lean();

        // Step 2: Match variants manually
        const populatedOrders = orders.map(order => {
            order.items = order.items.map(item => {
                const product = item.productId;
                // Find the variant matching variantId
                const variant = product.variant.find(v => v._id.toString() === item.variantId.toString());
                
                return {
                    ...item,
                    productDetails: {
                        name: product.name,
                        images: product.images,
                        variant: variant  // Add the matched variant details
                    }
                };
            });
            return order;
        });

        res.render('user/orders', { orders: populatedOrders });

    } catch (error) {
        console.error("Error loading orders:", error);
        res.status(500).send('Server Error');
    }
};




// const OrderDetail = (req, res) => {
//     res.render('user/order-detail')
// }


const OrderDetail = async (req, res) => {
    try {
        const { orderId, itemId } = req.params;
        const userId = req.session.user.id; // Ensure this is retrieved correctly (e.g., from authentication middleware)

        // Fetch the order based on orderId and userId
        const order = await orderModel.findOne({ _id: orderId, userId }).populate('items.productId').lean();

        if (!order) {
            return res.status(404).send('Order not found');
        }

        // Find the specific item within the order's items array
        const item = order.items.find(item => item._id.toString() === itemId);

        if (!item) {
            return res.status(404).send('Item not found in this order');
        }

        // Render the order detail page with specific item data
        res.render('user/order-detail', {
            order,
            item, // Send only the specific item
            userId
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
};


const ReturnOrder = async (req, res) => {
    try {
        const { orderId, productId } = req.params;

        // Find the order
        let order = await orderModel.findById(orderId);
        if (!order) {
            return res.status(404).send('Order not found');
        }

        // Find the ordered item
        let orderedItem = order.items.find(item => item.productId.toString() === productId);
        if (!orderedItem) {
            return res.status(404).send('Product not found in order');
        }

        // Ensure the status is "Delivered" before allowing return
        if (orderedItem.status !== "Delivered") {
            return res.status(400).send('Only delivered items can be returned');
        }

        // Update status to "Returned"
        orderedItem.status = "Returned";
        await order.save();

        res.redirect('/orders'); // Redirect to orders page
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
}


const CancelOrder = async (req, res) => {
    try {
        const { orderId, productId } = req.params;

        // Find the order
        let order = await orderModel.findById(orderId);
        if (!order) {
            return res.status(404).send('Order not found');
        }

        // Find the ordered item
        let orderedItem = order.items.find(item => item.productId.toString() === productId);
        if (!orderedItem) {
            return res.status(404).send('Product not found in order');
        }

        // Ensure the status is NOT "Delivered" before allowing cancellation
        if (orderedItem.status === "Delivered") {
            return res.status(400).send('Delivered items cannot be cancelled');
        }

        // Update status to "Cancelled"
        orderedItem.status = "Cancelled";
        await order.save();

        console.log("orderedItem:", orderedItem)
        res.redirect(`/order-detail/${orderId}/${productId}`); // Redirect to orders page
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
}





module.exports = {
    LoadOrders,
    OrderDetail,
    ReturnOrder,
    CancelOrder
}