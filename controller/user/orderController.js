const userModel = require('../../model/userModel')
const addressModel = require('../../model/addressModel')
const productModel = require('../../model/productModel')
const cartModel = require('../../model/cartModel')
const orderModel = require('../../model/orderModel')

const LoadCheckout = async (req, res) => {
    try {
        // Assuming the user is authenticated and their ID is stored in session
        const userId = req.session.user?.id;
        if (!userId) {
            return res.redirect("/user/login");
        }

        // Fetch addresses for the logged-in user
        const addresses = await addressModel.find({ user: userId }).lean();
        const cartItems = await cartModel.find({ user: userId }).populate({
            path: 'products',
            select: 'name images variant',  // Populate product details
        })
            .lean();

        // Loop through cart items and attach selected variant data to each cart item
        cartItems.forEach(item => {
            const selectedVariant = item.products.variant.find(v => v._id.toString() === item.variant.toString());
            if (selectedVariant) {
                // Attach selected variant data to the cart item
                item.selectedVariant = selectedVariant;
            } else {
                console.log("Variant not found in product.");
            }
        });

        // Calculate the total price based on the selected variant's price
        let totalPrice = 0;
        cartItems.forEach(item => {
            if (item.selectedVariant) {
                totalPrice += item.selectedVariant.price * item.quantityCount;  // Use the selected variant's price
            }
        });

        // Render the checkout page with saved addresses
        res.render("user/checkout", { addresses, cartItems, totalPrice }); // Pass addresses to HBS
    } catch (error) {
        console.error("Error fetching addresses:", error);
        res.status(500).send("Server Error");
    }
}



const PlaceOrder = async (req, res) => {
    try {
        const { shippingAddress, paymentMethod, items, totalAmount } = req.body;

        const newOrder = new orderModel({
            userId: req.session.user.id, // Assuming you're using Passport.js for authentication
            items,
            totalAmount,
            shippingAddress,
            paymentMethod
        });

        await newOrder.save();
        await cartModel.deleteMany({ user: req.session.user.id });

        res.status(200).json({ message: 'Order placed successfully!' });
    } catch (error) {
        console.error('Error placing order:', error);
        res.status(500).json({ message: 'Failed to place order.' });
    }
}



const OrderPlaced = (req, res) => {
  res.render('user/order-placed')
}


module.exports = {
    LoadCheckout,
    PlaceOrder,
    OrderPlaced,
}