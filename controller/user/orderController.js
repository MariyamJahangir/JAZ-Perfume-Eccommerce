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
        const { orderId } = req.params;
        const userId = req.session.user.id; // Ensure this is retrieved correctly (e.g., from authentication middleware)

        // Fetch the order based on orderId and userId
        const order = await orderModel.findOne({ _id: orderId, userId }).populate('items.productId').lean();
        
        if (!order) {
            return res.status(404).send('Order not found');
        }

        
        // Render the order detail page with specific item data
        res.render('user/order-detail', {
            order,
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
        const { returnReason } = req.body; 
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


        // Only allow return if the item is delivered
        if (orderedItem.status !== "Delivered") {
            return res.status(400).send('Only delivered items can be returned');
        }

        // Update status to "Returned"
        orderedItem.status = "Returned";
        orderedItem.returnReason = returnReason; // ✅ Save return reason
        order.orderStatus = 'Not completed'

        await order.save();

        res.redirect(`/order-detail/${orderId}`); 
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
}


const CancelOrder = async (req, res) => {
    try {
        const { orderId, productId, variantId } = req.params;
        const { cancelReason } = req.body; // ✅ Get cancellation reason from request body
        //console.log("req.params:", req.params)

        let product = await productModel.findById(productId);
        let variant = product.variant.find(v=>v._id.toString() === variantId)
        // console.log("Product:", product)
        // console.log("Variant:", variant)


        // Find the order
        let order = await orderModel.findById(orderId);
        if (!order) {
            return res.status(404).send('Order not found');
        }

        // Find the ordered item
        let orderedItem = order.items.find(item => item.productId.toString() === productId);
        // console.log("orderedItem:", orderedItem)
        if (!orderedItem) {
            return res.status(404).send('Product not found in order');
        }

        // If the item was returned, cancel the return and revert to "Delivered"
        // if (orderedItem.status === "Returned") {
        //     orderedItem.status = "Delivered";
        // } 


        // Otherwise, cancel the order normally (if it's not yet delivered)
        if (orderedItem.status !== "Delivered") {
            orderedItem.status = "Cancelled";
            orderedItem.cancelReason = cancelReason; // ✅ Save cancellation reason
            variant.stockQuantity += orderedItem.quantityCount
        } 
        else {
            return res.status(400).send('Delivered items cannot be cancelled');
        }


        if ( order.items.every(item => item.status === "Delivered" || item.status === "Cancelled")) {
            await orderModel.updateOne({ _id: orderId }, { $set: { orderStatus: "Completed" } });
        }else await orderModel.updateOne({ _id: orderId }, { $set: { orderStatus: "Not completed" } });

        await order.save();
        await product.save();

        
        res.redirect(`/order-detail/${orderId}`); 
       
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