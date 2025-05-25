const userModel = require('../model/userModel')
const addressModel = require('../model/addressModel')
const productModel = require('../model/productModel')
const cartModel = require('../model/cartModel')
const orderModel = require('../model/orderModel')
const offerModel = require('../model/offerModel')
const couponModel = require('../model/couponModel')


//offer calculation:
function calculateDiscountAmount(offer, price) {
    if (!offer || price <= 0) return 0;

    let discountAmount = 0;

    if (offer.discountType === "percentage") {
        discountAmount = (offer.discount / 100) * price;

        if (offer.maxDiscount && discountAmount > offer.maxDiscount) {
            discountAmount = offer.maxDiscount;
        }
    } else if (offer.discountType === "fixed") {
        discountAmount = offer.discount;
    }

    return discountAmount;
}

async function getBestOffer(product, price) {
    const [productOffer, categoryOffer] = await Promise.all([
        product.offer ? offerModel.findOne({ name: product.offer, isActive: true, expiry: { $gte: new Date() } }).lean() : null,
        product.category?.offer ? offerModel.findOne({ name: product.category.offer, isActive: true, expiry: { $gte: new Date() } }).lean() : null
    ]);

    const productDiscount = calculateDiscountAmount(productOffer, price);
    const categoryDiscount = calculateDiscountAmount(categoryOffer, price);

    if (productDiscount >= categoryDiscount && productOffer) {
        return { offer: productOffer, discount: productDiscount };
    } else if (categoryOffer) {
        return { offer: categoryOffer, discount: categoryDiscount };
    } else {
        return { offer: null, discount: 0 };
    }
}







const LoadCart = async (req, res) => {
    try {
        const userId = req.session.user.id;

        const cartItems = await cartModel.find({ user: userId })
            .populate({
                path: 'products',
                populate: { path: 'category' },
                select: 'name images variant offer category',
            })
            .lean();

        let totalBasePrice = 0;
        let totalDiscount = 0;

        for (const item of cartItems) {
            const selectedVariant = item.products.variant.find(v => v._id.toString() === item.variant.toString());
            if (!selectedVariant) continue;

            item.selectedVariant = selectedVariant;

            const itemBasePrice = selectedVariant.price * item.quantityCount;
            totalBasePrice += itemBasePrice;

            const { offer, discount } = await getBestOffer(item.products, selectedVariant.price);

            item.offerDetails = offer
                ? {
                    name: offer.name,
                    discountType: offer.discountType,
                    discountValue: offer.discount,
                    calculatedDiscount: discount
                }
                : null;

            totalDiscount += discount * item.quantityCount;
        }

        const totalDiscountPrice = totalBasePrice - totalDiscount;

        res.render('user/cart', {
            cartItems,
            totalBasePrice,
            totalDiscount,
            totalDiscountPrice,
            hasItems: cartItems.length > 0
        });
    } catch (error) {
        console.error(error);
        res.status(500).send("Error fetching cart data.");
    }
};


const updateCartQuantity = async (req, res) => {
    try {
        const { cartItemId, quantity } = req.body;

        const cartItem = await cartModel.findById(cartItemId).populate({
            path: "products",
            select: "variant offer category",
            populate: {
                path: "category",
                select: "offer"
            }
        });

        if (!cartItem) {
            return res.status(404).json({ success: false, message: "Cart item not found" });
        }

        const selectedVariant = cartItem.products.variant.find(
            v => v._id.toString() === cartItem.variant.toString()
        );

        if (!selectedVariant) {
            return res.status(404).json({ success: false, message: "Variant not found" });
        }

        if (quantity > selectedVariant.stockQuantity) {
            return res.status(400).json({ success: false, message: "Stock limit exceeded" });
        }

        // Update quantity and base price
        cartItem.quantityCount = quantity;
        const newTotalBasePrice = quantity * selectedVariant.price;
        cartItem.totalBasePrice = newTotalBasePrice;

        // Fetch both offers
        // const productOffer = cartItem.products.offer
        //     ? await offerModel.findOne({
        //         name: cartItem.products.offer,
        //         isActive: true,
        //         expiry: { $gte: new Date() }
        //     })
        //     : null;

        // const categoryOffer = cartItem.products.category?.offer
        //     ? await offerModel.findOne({
        //         name: cartItem.products.category.offer,
        //         isActive: true,
        //         expiry: { $gte: new Date() }
        //     })
        //     : null;

        // Reuse discount calculation function
        // const calculateDiscountAmount = (offer, pricePerItem, qty) => {
        //     if (!offer || pricePerItem <= 0 || qty <= 0) return 0;

        //     let discountAmount = 0;
        //     const totalPrice = pricePerItem * qty;

        //     if (offer.discountType === "percentage") {
        //         discountAmount = (offer.discount / 100) * totalPrice;
        //         if (offer.maxDiscount && discountAmount > offer.maxDiscount) {
        //             discountAmount = offer.maxDiscount;
        //         }
        //     } else if (offer.discountType === "fixed") {
        //         discountAmount = qty * offer.discount;
        //     }

        //     return discountAmount;
        // };

        // const productDiscount = calculateDiscountAmount(productOffer, selectedVariant.price, quantity);
        // const categoryDiscount = calculateDiscountAmount(categoryOffer, selectedVariant.price, quantity);


        const bestOffer = await getBestOffer(cartItem.products, selectedVariant.price)
        

        // Choose the better offer
        const betterDiscount = bestOffer.discount;

        cartItem.totalDiscount = betterDiscount * cartItem.quantityCount;
        cartItem.totalDiscountPrice = newTotalBasePrice - betterDiscount * cartItem.quantityCount;
       
        // cartItem.totalDiscount = cartItem.totalBasePrice - cartItem.totalDiscountPrice;

        await cartItem.save();

        // Recalculate full cart totals
        const cartItems = await cartModel.find({ user: cartItem.user });

        let updatedCartTotalBasePrice = 0;
        let updatedCartTotalDiscount = 0;
        let updatedCartTotalDiscountPrice = 0;

        for (let item of cartItems) {
            updatedCartTotalBasePrice += item.totalBasePrice;
            updatedCartTotalDiscount += item.totalDiscount;
            updatedCartTotalDiscountPrice += item.totalDiscountPrice;
        }

        res.json({
            success: true,
            message: "Quantity updated successfully",
            cartItems,
            newTotalBasePrice,
            newTotalDiscount: cartItem.totalDiscount,
            newTotalDiscountPrice: cartItem.totalDiscountPrice,
            updatedCartTotalBasePrice,
            updatedCartTotalDiscount,
            updatedCartTotalDiscountPrice
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
        const userId = req.session.user?.id;
        if (!userId) {
            return res.redirect("/login");
        }

        // Fetch addresses
        const addresses = await addressModel.find({ user: userId }).lean();

        // Fetch cart items and populate product details
        const cartItems = await cartModel.find({ user: userId })
            .populate({
                path: 'products',
                populate: { path: 'category' }, // Include category for getBestOffer
                select: 'name images variant offer category'
            })
            .lean();

        let totalBasePrice = 0;
        let totalDiscount = 0;

        for (const item of cartItems) {
            const selectedVariant = item.products.variant.find(v => v._id.toString() === item.variant.toString());
            if (!selectedVariant) continue;

            item.selectedVariant = selectedVariant;

            const itemBasePrice = selectedVariant.price * item.quantityCount;
            totalBasePrice += itemBasePrice;

            // 💡 Like LoadCart: use unit price for offer, then multiply
            const { offer, discount } = await getBestOffer(item.products, selectedVariant.price);

            item.offerDetails = offer
                ? {
                    name: offer.name,
                    discountType: offer.discountType,
                    discountValue: offer.discount,
                    calculatedDiscount: discount
                }
                : null;

            totalDiscount += discount * item.quantityCount; // ✅ matching LoadCart
        }

        let totalDiscountedPrice = totalBasePrice - totalDiscount;

        // 🟡 First Order Discount
        const orderCount = await orderModel.countDocuments({ userId: userId });
        const isFirstOrder = orderCount === 0;

        const user = await userModel.findById(userId);
        const isReferred = user.isReferred;

        let firstOrderDiscount = 0;
        if (isFirstOrder && isReferred) {
            firstOrderDiscount = totalBasePrice * 0.20;
            totalDiscount += firstOrderDiscount;
            totalDiscountedPrice -= firstOrderDiscount;
        }

        const coupons = await couponModel.find({ isActive: true, expiry: { $gte: new Date() } }).lean();
        const orders = await orderModel.find({ userId });

        res.render("user/checkout", {
            addresses,
            cartItems,
            totalBasePrice,
            totalDiscount,
            totalDiscountedPrice,
            coupons,
            orders,
            firstOrderDiscount: firstOrderDiscount ? firstOrderDiscount.toFixed(2) : null,
        });

    } catch (error) {
        console.error("Error fetching checkout data:", error);
        res.status(500).send("Server Error");
    }
};




const cartCount = async (req, res) => {
    try {
        const userId = req.session?.user?.id;
        if (!userId) {
            return res.json({ count: 0 });
        }

        const cart = await cartModel.find({ user: userId }) || [];
        if (!cart.length) {
            return res.json({ count: 0 });
        }

        const itemCount = cart.reduce((sum, item) => sum + (item.quantityCount || 1), 0);

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

    cartCount,

}

