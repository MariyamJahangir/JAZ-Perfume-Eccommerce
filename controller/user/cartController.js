const userModel = require('../../model/userModel')
const addressModel = require('../../model/addressModel')
const productModel = require('../../model/productModel')
const cartModel = require('../../model/cartModel')
const orderModel = require('../../model/orderModel')
const offerModel = require('../../model/offerModel')
const couponModel = require('../../model/couponModel')

const LoadCart = async (req, res) => {
    try {
        const userId = req.session.user.id;  // Get logged-in user's ID

        // Fetch cart items with only the selected variant populated
        const cartItems = await cartModel.find({ user: userId })
            .populate({
                path: 'products',
                select: 'name images variant offer',  // Populate product details
            })
            .lean();

       

        //const offer = await offerModel.findOne({name: cartItems.products.offer})


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
        let totalBasePrice = 0;
        let totalDiscountPrice = 0;
        let totalDiscount = 0;
        // cartItems.forEach(item => {
        //     if (item.selectedVariant) {
        //         totalBasePrice += item.selectedVariant.price * item.quantityCount;  // Use the selected variant's price         
        //     }
        // });

        for (const item of cartItems) {
            if (item.selectedVariant) {
                let itemBasePrice = item.selectedVariant.price * item.quantityCount;
                totalBasePrice += itemBasePrice

                
                if (item.products.offer) {
                    const offer = await offerModel.findOne({ name: item.products.offer, isActive: true, expiry: { $gte: new Date() } });

                    if (offer) {
                        let itemDiscount = 0;

                        // Apply discount if available
                        if (offer.discountType === "percentage") {
                            itemDiscount = (itemBasePrice * offer.discount) / 100;
                        } else {
                            itemDiscount = item.quantityCount * offer.discount;
                        }
                        totalDiscount += itemDiscount;

                        item.offerDetails = {
                            name: offer.name,
                            discountType: offer.discountType,
                            discountValue: offer.discount
                        };
                    } else {
                        item.offerDetails = null;
                    }
                }
            }
        }

        // Calculate final discount price
        totalDiscountPrice = totalBasePrice - totalDiscount;

        console.log("loadcartdata:" , totalBasePrice, totalDiscount, totalDiscountPrice, )

        // Render the cart page with the cart items and total price
        res.render('user/cart', {
            cartItems,   // Pass cart items with selected variant data to the view
            totalBasePrice,  // Pass the total price to the view
            totalDiscount,
            totalDiscountPrice,
            hasItems: cartItems.length > 0
        });
    } catch (error) {
        console.error(error);
        res.status(500).send("Error fetching cart data.");
    }
};



// const updateCartQuantity = async (req, res) => {
//     try {
//         const { cartItemId, quantity } = req.body;

//         // Find the cart item
//         const cartItem = await cartModel.findById(cartItemId).populate({
//             path: "products",
//             select: "variant offer",
//         });

//         if (!cartItem) {
//             return res.status(404).json({ success: false, message: "Cart item not found" });
//         }

//         // Get the selected variant stock quantity
//         const selectedVariant = cartItem.products.variant.find(
//             (v) => v._id.toString() === cartItem.variant.toString()
//         );

//         if (!selectedVariant) {
//             return res.status(404).json({ success: false, message: "Variant not found" });
//         }

//         // Check if requested quantity is within stock limit
//         if (quantity > selectedVariant.stockQuantity) {
//             return res.status(400).json({ success: false, message: "Stock limit exceeded" });
//         }


//         // Update the quantity in the database
//         cartItem.quantityCount = quantity;

//         // Recalculate the individual item total
//         const newTotalBasePrice = cartItem.quantityCount * selectedVariant.price;

//         cartItem.totalBasePrice = newTotalBasePrice;

//         const offer = await offerModel.findOne({name: cartItem.products.offer, isActive: true, expiry: { $gte: new Date() }})
//         let newTotalDiscount = 0;
//         if(offer){
//             if(offer.discountType == 'percentage'){
//                 newTotalDiscount = cartItem.quantityCount *(newTotalBasePrice * offer.discount)/100 
//             }else{
//                 newTotalDiscount = cartItem.quantityCount * offer.discount 
//             }
//         }
        
       
//         cartItem.totalDiscount = newTotalDiscount;

//         const newTotalDiscountPrice = newTotalBasePrice - newTotalDiscount
//         cartItem.totalDiscountPrice = newTotalDiscountPrice;

//         await cartItem.save();


//         // ✅ Calculate the updated total cart price
//         const cartItems = await cartModel.find({ user: cartItem.user }).populate({
//             path: "products",
//             select: "variant",
//         });

//         // Send response with updated item and cart total
        
//         let updatedCartTotalBasePrice = 0
//         let updatedCartTotalDiscount = 0
//         let updatedCartTotalDiscountPrice = 0
//         for(let item of cartItems){
//             updatedCartTotalBasePrice += item.totalBasePrice
//             updatedCartTotalDiscount += item.totalDiscount
//             updatedCartTotalDiscountPrice += item.totalDiscountPrice
//         }

//         console.log("newTotalBasePrice:",newTotalBasePrice)
//         console.log("newTotalDiscount:",newTotalDiscount)
//         console.log("newTotalDiscountPrice:",newTotalDiscountPrice)
//         console.log("updatedCartTotalBasePrice:",updatedCartTotalBasePrice)
//         console.log("updatedCartTotalDiscount:",updatedCartTotalDiscount)
//         console.log("updatedCartTotalDiscountPrice:",updatedCartTotalDiscountPrice)

//         res.json({
//             success: true,
//             message: "Quantity updated successfully",
//             // newTotalBasePrice,
//             // newTotalDiscount,
//             // newTotalDiscountPrice,
//             updatedCartTotalBasePrice,
//             updatedCartTotalDiscount,
//             updatedCartTotalDiscountPrice
//         });

//     } catch (error) {
//         console.error("Error updating cart quantity:", error);
//         res.status(500).json({ success: false, message: "Server error" });
//     }
// };

const updateCartQuantity = async (req, res) => {
    try {
        const { cartItemId, quantity } = req.body;

        // Find the cart item
        const cartItem = await cartModel.findById(cartItemId).populate({
            path: "products",
            select: "variant offer",
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

        // Recalculate the individual item total
        const newTotalBasePrice = cartItem.quantityCount * selectedVariant.price;

        cartItem.totalBasePrice = newTotalBasePrice;

        const offer = await offerModel.findOne({name: cartItem.products.offer, isActive: true, expiry: { $gte: new Date() }})
        let newTotalDiscount = 0;
        if(offer){
            if(offer.discountType == 'percentage'){
                newTotalDiscount = (newTotalBasePrice * offer.discount)/100 
            }else{
                newTotalDiscount = cartItem.quantityCount * offer.discount 
            }
        }
        
       
        cartItem.totalDiscount = newTotalDiscount;

        const newTotalDiscountPrice = newTotalBasePrice - newTotalDiscount
        cartItem.totalDiscountPrice = newTotalDiscountPrice;

        await cartItem.save();


        // ✅ Calculate the updated total cart price
        const cartItems = await cartModel.find({ user: cartItem.user }).populate({
            path: "products",
            select: "variant",
        });

        // Send response with updated item and cart total
        
        let updatedCartTotalBasePrice = 0
        let updatedCartTotalDiscount = 0
        let updatedCartTotalDiscountPrice = 0
        for(let item of cartItems){
            updatedCartTotalBasePrice += item.totalBasePrice
            updatedCartTotalDiscount += item.totalDiscount
            updatedCartTotalDiscountPrice += item.totalDiscountPrice
        }

        console.log("newTotalBasePrice:",newTotalBasePrice)
        console.log("newTotalDiscount:",newTotalDiscount)
        console.log("newTotalDiscountPrice:",newTotalDiscountPrice)
        console.log("updatedCartTotalBasePrice:",updatedCartTotalBasePrice)
        console.log("updatedCartTotalDiscount:",updatedCartTotalDiscount)
        console.log("updatedCartTotalDiscountPrice:",updatedCartTotalDiscountPrice)

        res.json({
            success: true,
            message: "Quantity updated successfully",
            cartItems,
            newTotalBasePrice,
            newTotalDiscount,
            newTotalDiscountPrice,
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




// const LoadCheckout = async (req, res) => {
//     try {
//         const userId = req.session.user?.id;
//         if (!userId) {
//             return res.redirect("/login");
//         }

//         // Fetch addresses
//         const addresses = await addressModel.find({ user: userId }).lean();

//         // Fetch cart items and populate product details
//         const cartItems = await cartModel.find({ user: userId })
//             .populate({
//                 path: 'products',
//                 select: 'name images variant offer'
//             })
//             .lean();

//         let totalBasePrice = 0;
//         let totalDiscount = 0;

//         // Extract all offer names to fetch them in one query
//         const offerNames = [...new Set(cartItems.map(item => item.products.offer).filter(Boolean))];
//         const offers = await offerModel.find({ name: { $in: offerNames } }).lean();

//         // Create a map for quick lookup
//         const offerMap = {};
//         offers.forEach(offer => {
//             offerMap[offer.name] = offer;
//         });


//         for (let item of cartItems) {
//             // Find the selected variant
//             const selectedVariant = item.products.variant.find(v => v._id.toString() === item.variant.toString());
//             if (!selectedVariant) {
//                 console.log("Variant not found in product.");
//                 continue;
//             }

//             item.selectedVariant = selectedVariant;
//             const itemBasePrice = selectedVariant.price * item.quantityCount;
//             totalBasePrice += itemBasePrice;

//             // Calculate discount
//             let itemDiscount = 0;
//             if (item.products.offer && offerMap[item.products.offer]) {
//                 const offer = offerMap[item.products.offer];

//                 if (offer.discountType === 'percentage') {
//                     itemDiscount = (itemBasePrice * offer.discount) / 100;
//                 } else {
//                     itemDiscount = offer.discount; // Fixed discount applies once per product
//                 }
//             }

//             item.discount = itemDiscount;
//             totalDiscount += itemDiscount;
//         }

//         const totalDiscountedPrice = totalBasePrice - totalDiscount;

//         const coupons = await couponModel.find({isActive: true}).lean()

//         res.render("user/checkout", { addresses, cartItems, totalBasePrice, totalDiscount, totalDiscountedPrice, coupons });

//     } catch (error) {
//         console.error("Error fetching checkout data:", error);
//         res.status(500).send("Server Error");
//     }
// };


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
                select: 'name images variant offer'
            })
            .lean();

        let totalBasePrice = 0;
        let totalDiscount = 0;

        for (let item of cartItems) {
            // Find the selected variant
            const selectedVariant = item.products.variant.find(v => v._id.toString() === item.variant.toString());
            if (!selectedVariant) {
                console.log("Variant not found in product.");
                continue;
            }

            item.selectedVariant = selectedVariant;
            const itemBasePrice = selectedVariant.price * item.quantityCount;
            totalBasePrice += itemBasePrice;

            // Calculate discount
            let itemDiscount = 0;
            if (item.products.offer) {
                const offer = await offerModel.findOne({name: item.products.offer, isActive: true, expiry: { $gte: new Date() }});
                if(offer){
                    if (offer.discountType === 'percentage') {
                        itemDiscount = (itemBasePrice * offer.discount) / 100;
                    } else {
                        itemDiscount = item.quantityCount * offer.discount; // Fixed discount applies once per product
                    }
                }
                
            }
            totalDiscount += itemDiscount;
        }

        
        const totalDiscountedPrice = totalBasePrice - totalDiscount;

        const coupons = await couponModel.find({isActive: true, expiry: { $gte: new Date() }}).lean()

        res.render("user/checkout", { addresses, cartItems, totalBasePrice, totalDiscount, totalDiscountedPrice, coupons });

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

