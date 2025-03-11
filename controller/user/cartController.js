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



const updateCartQuantity = async (req, res) => {
    try {
        const { cartItemId, quantity } = req.body;

        // Find the cart item
        const cartItem = await cartModel.findById(cartItemId).populate({
            path: "products",
            select: "variant",
        });

        if (!cartItem) {
            return res.status(404).json({ success: false, message: "Cart item not found" });
        }

        // Get the selected variant stock quantity
        const selectedVariant = cartItem.products.variant.find(
            (v) => v._id.toString() === cartItem.variant.toString()
        );

        if (!selectedVariant) {
            return res.status(404).json({ success: false, message: "Variant not found" });
        }

        // Check if requested quantity is within stock limit
        if (quantity > selectedVariant.stockQuantity) {
            return res.status(400).json({ success: false, message: "Stock limit exceeded" });
        }

        // Update the quantity in the database
        cartItem.quantityCount = quantity;
        await cartItem.save();

        // Recalculate the individual item total
        const newTotal = cartItem.quantityCount * selectedVariant.price;

        // ✅ Calculate the updated total cart price
        const cartItems = await cartModel.find({ user: cartItem.user }).populate({
            path: "products",
            select: "variant",
        });

        const updatedCartTotal = cartItems.reduce((total, item) => {
            const variant = item.products.variant.find(v => v._id.toString() === item.variant.toString());
            return total + (variant ? item.quantityCount * variant.price : 0);
        }, 0);

        // Send response with updated item and cart total
        res.json({ 
            success: true, 
            message: "Quantity updated successfully", 
            newTotal, 
            updatedCartTotal 
        });

    } catch (error) {
        console.error("Error updating cart quantity:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};




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

         // Iterate over each item in the order
         for (const item of items) {
            const product = await productModel.findById(item.productId);

            if (!product) {
                return res.status(404).json({ message: `Product not found: ${item.productId}` });
            }

            // Find the correct variant
            const variant = product.variant.id(item.variantId);
            if (!variant) {
                return res.status(404).json({ message: `Variant not found: ${item.variantId}` });
            }

            // Check if there's enough stock
            if (variant.stockQuantity < item.quantityCount) {
                return res.status(400).json({ message: `Not enough stock for product: ${product.name}` });
            }

            // Subtract the ordered quantity from stock
            variant.stockQuantity -= item.quantityCount;

            await product.save();
        }

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


const cartCount = async (req, res) => {
    try {
        const userId = req.session?.user?.id;
        if (!userId) {
            return res.json({ count: 0 });
        }

        const cart = await cartModel.findOne({ user: userId });
        if (!cart) {
            return res.json({ count: 0 });
        }

        // If quantityCount exists, use it; otherwise, default to 1
        const itemCount = cart.quantityCount ? cart.quantityCount : 1;

        res.json({ count: itemCount });
    } catch (error) {
        console.error("Error fetching cart count:", error);
        res.status(500).json({ count: 0 });
    }
};



module.exports = {
    LoadCart,
    updateCartQuantity,
    removeProduct,
    LoadCheckout,
    PlaceOrder,
    OrderPlaced,
    cartCount
}

