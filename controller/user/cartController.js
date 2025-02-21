const userModel = require('../../model/userModel')
const addressModel = require('../../model/addressModel')
const productModel = require('../../model/productModel')
const cartModel = require('../../model/cartModel')
const orderModel = require('../../model/orderModel')

const LoadCart = async (req, res) => {
    try {
        const userId = req.session.user.id;  // Get logged-in user's ID

        // Fetch cart items with only the selected variant populated
        const cartItems = await cartModel.find({ user: userId })
            .populate({
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

        

        // Render the cart page with the cart items and total price
        res.render('user/cart', {
            cartItems,   // Pass cart items with selected variant data to the view
            totalPrice,  // Pass the total price to the view
        });
    } catch (error) {
        console.error(error);
        res.status(500).send("Error fetching cart data.");
    }
};






const increaseCart = async (req, res) => {
    try {
        const cartItemId = req.params.cartItemId;

        // Find the cart item
        let cartItem = await cartModel.findById(cartItemId);
        if (!cartItem) {
            return res.status(404).json({ success: false, message: "Cart item not found" });
        }

        // Find the associated product variant price
        const product = await productModel.findById(cartItem.products);
        const variant = product.variant.find(v => v._id.toString() === cartItem.variant.toString());
        if (!variant) {
            return res.status(404).json({ success: false, message: "Variant not found" });
        }

        // Increase quantity
        cartItem.quantityCount += 1;
        cartItem.totalPrice = cartItem.quantityCount * variant.price; // Correct price calculation

        // Save the updated cart item
        await cartItem.save();

        res.json({ success: true, message: "Quantity updated", cartItem });

    } catch (error) {
        console.error("Error increasing quantity:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
}

const decreaseCart = async (req, res) => {
    try {
        const cartItemId = req.params.cartItemId;

        // Find the cart item
        let cartItem = await cartModel.findById(cartItemId);
        if (!cartItem) {
            return res.status(404).json({ success: false, message: "Cart item not found" });
        }

        // Find the associated product variant price
        const product = await productModel.findById(cartItem.products);
        const variant = product.variant.find(v => v._id.toString() === cartItem.variant.toString());
        if (!variant) {
            return res.status(404).json({ success: false, message: "Variant not found" });
        }

        // Ensure quantity does not go below 1
        if (cartItem.quantityCount > 1) {
            cartItem.quantityCount -= 1;
            cartItem.totalPrice = cartItem.quantityCount * variant.price; // Update total price
            await cartItem.save();
            return res.json({ success: true, message: "Quantity decreased", cartItem });
        } else {
            // If quantity is 1, do nothing
            return res.json({ success: false, message: "Minimum quantity reached" });
        }

    } catch (error) {
        console.error("Error decreasing quantity:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
}

const removeProduct = async (req, res) => {
    try {
        const cartItemId = req.params.cartItemId;

        // Find and remove the cart item
        const cartItem = await cartModel.findByIdAndDelete(cartItemId);
        if (!cartItem) {
            return res.status(404).json({ success: false, message: "Cart item not found" });
        }

        res.json({ success: true, message: "Product removed from cart" });
    } catch (error) {
        console.error("Error removing product:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
}


const LoadCheckout = async (req, res) => {
    try {
        // Assuming the user is authenticated and their ID is stored in session
        const userId = req.session.user?.id;
        if (!userId) {
            return res.redirect("/login");
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
    LoadCart,
    increaseCart,
    decreaseCart,
    removeProduct,
    LoadCheckout,
    PlaceOrder,
    OrderPlaced,
}

