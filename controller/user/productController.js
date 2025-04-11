const productModel = require("../../model/productModel")
const cartModel = require("../../model/cartModel")
const categoryModel = require('../../model/categoryModel')
const offerModel = require('../../model/offerModel')
const reviewModel = require('../../model/reviewModel')
const wishlistModel = require('../../model/wishlistModel')




const productDetails = async (req, res) => {
    const productId = req.params.productId;
    const variantId = req.params.variantId;

    const product = await productModel.findById(productId).populate("category").lean();
    console.log("product:", product)
    const productOffer = product.offer
        ? await offerModel.findOne({
            name: product.offer,
            isActive: true,
            expiry: { $gte: new Date() },
        }).lean()
        : null;

    const categoryOffer = product.category?.offer
        ? await offerModel.findOne({
            name: product.category.offer,
            isActive: true,
            expiry: { $gte: new Date() },
        }).lean()
        : null;

    const selectedVariant = product.variant.find(v => v._id.toString() === variantId);
    let offer = null;

    if (selectedVariant) {
        const price = selectedVariant.price;

        // Function to calculate discount amount
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

        // Calculate for this variant's price only
        const productDiscount = calculateDiscountAmount(productOffer, price);
        const categoryDiscount = calculateDiscountAmount(categoryOffer, price);

        console.log("productDiscount, categoryDiscount:", productDiscount, categoryDiscount)

        if (productDiscount >= categoryDiscount && productOffer) {
            offer = productOffer;
        } else if (categoryOffer) {
            offer = categoryOffer;
        }
    } else {
        console.log("Variant not found");
    }


    let wishlistItem = null;
    
    if (req.session?.user?.id) {
        wishlistItem = await wishlistModel.findOne({
            userId: req.session.user.id,
            productId,
            variantId,
        }).lean();


    } else {
        console.log("User not logged in, skipping wishlist fetch.");
    }

    


    const allproducts = await productModel.find({}).lean().sort({ updatedAt: -1 }).limit(6)
    const reviews = await reviewModel.find({ productId }).sort({ updatedAt: -1 }).populate("userId").lean();
    // Calculate total reviews
    const totalReviews = reviews.length;

    // Calculate average rating
    const averageRating =
        totalReviews > 0
            ? (reviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews).toFixed(1)
            : "0.0";


    res.render('user/product-details', { product, offer, allproducts, reviews, totalReviews, averageRating, isInWishlist: !!wishlistItem })
}




const AddToCart = async (req, res) => {
    try {
        // Check if the user is authenticated
        if (!req.session.user || !req.session.user.id) {
            return res.status(401).json({ success: false, message: "User not authenticated. You need to log in to add products to the cart." });
        }

        // Extract productId and variantId from the request body
        const { productId, variantId, quantityCount, totalBasePrice, totalDiscountPrice, totalDiscount } = req.body;

        // Check if both productId and variantId are provided
        if (!productId || !variantId) {
            return res.status(400).json({ success: false, message: "Missing productId or variantId" });
        }

        // Find the product by its ID
        const product = await productModel.findById(productId);
        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        // Find the variant within the product
        const variant = product.variant.find(v => v._id.toString() === variantId);
        if (!variant) {
            return res.status(404).json({ success: false, message: "Variant not found" });
        }

        // Check if an offer exists and is active
        const offer = await offerModel.findOne({
            name: product.offer,
            isActive: true,
            expiry: { $gte: new Date() }
        });

        // If no offer found, set offer to null, and set discounts to 0
        const discount = offer ? offer.discount : 0;
        const discountType = offer ? offer.discountType : 'percentage';

        // Check if the item already exists in the cart with the same product and variant
        let cartItem = await cartModel.findOne({
            user: req.session.user.id,
            products: productId,
            variant: variantId
        });

        let totalRequestedQuantity = parseInt(quantityCount);
        let StockAvailable = variant.stockQuantity;
        let maxAllowed = Math.min(5, StockAvailable);

        if (cartItem) {
            if (cartItem.products.toString() === productId && cartItem.variant.toString() === variantId) {
                totalRequestedQuantity += cartItem.quantityCount;
            }
        }

        if (totalRequestedQuantity > maxAllowed) {
            return res.status(400).json({
                message: `Only ${maxAllowed} items can be added.`,
                swal: true
            });
        }

        // If the item already exists, increase the quantity and update totalPrice
        if (cartItem) {
            cartItem.quantityCount += quantityCount; // Increase quantity
            cartItem.totalBasePrice = cartItem.quantityCount * variant.price; // Add the variant's price to the total price

            // Calculate discount and totalDiscountPrice based on the type
            if (discountType === 'percentage') {
                cartItem.totalDiscount = cartItem.quantityCount * (variant.price * discount / 100);
                cartItem.totalDiscountPrice = cartItem.quantityCount * (variant.price - (variant.price * discount / 100));
            } else {
                cartItem.totalDiscount = cartItem.quantityCount * discount;
                cartItem.totalDiscountPrice = cartItem.quantityCount * (variant.price - discount);
            }
        } else {
            // If the item doesn't exist, create a new cart item
            cartItem = new cartModel({
                user: req.session.user.id,
                products: productId,   // Store only the product ID
                variant: variantId,     // Store only the variant ID
                quantityCount,
                totalBasePrice,
                totalDiscountPrice,
                totalDiscount
            });
        }

        // Save the cart item to the database
        await cartItem.save();

        // Return success response
        res.json({ success: true, message: "Product added to cart" });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};


// const allProducts = async (req, res) => {
//     try {
//         console.log("Fetching wishlist for user ID:", req.session?.user?.id);

//         const products = await productModel.find({ deleted: false }).populate('category').lean();
//         const categories = await categoryModel.find({ deleted: false }).lean();

//         let wishlist = [];

//         if (req.session?.user?.id) {
//             wishlist = await wishlistModel.find({
//                 userId: req.session.user.id
//             }).lean();

//         } else {
//             console.log("User not logged in, skipping wishlist fetch.");
//         }

//         let flattenedProducts = [];

//         for (const product of products) {
//             let offerDiscount = 0;
//             let discountType = "percentage";
//             let maxDiscount = null;

//             if (product.offer) {
//                 const offer = await offerModel.findOne({
//                     name: product.offer,
//                     isActive: true,
//                     expiry: { $gte: new Date() }
//                 }).lean();

//                 if (offer) {
//                     offerDiscount = offer.discount;
//                     discountType = offer.discountType;
//                     maxDiscount = offer.maxDiscount;
//                 }
//             }

//             product.variant.forEach(variant => {
//                 let discountAmount = 0;
//                 let discountText = "";

//                 if (offerDiscount > 0) {
//                     if (discountType === "percentage") {
//                         discountText = `${offerDiscount}% Off`;
//                         discountAmount = (variant.price * offerDiscount) / 100;

//                         if (maxDiscount !== null && discountAmount > maxDiscount) {
//                             discountAmount = maxDiscount;
//                         }
//                     } else {
//                         discountText = `Rs.${offerDiscount} Off`;
//                         discountAmount = offerDiscount;
//                     }
//                 }

//                 flattenedProducts.push({
//                     ...variant,
//                     productId: product._id,
//                     productName: product.name,
//                     images: product.images,
//                     category: product.category,
//                     description: product.description,
//                     offer: product.offer,
//                     discountText,
//                     discountAmount,
//                     discountedPrice: variant.price - discountAmount,
//                     deleted: product.deleted
//                 });
//             });
//         }


//         res.status(200).render('user/all-products', {
//             products: flattenedProducts,
//             categories,
//             wishlist
//         });

//     } catch (error) {
//         console.error("Error fetching products:", error);
//         res.status(500).render('error', { message: 'Error fetching products', error });
//     }
// };

const allProducts = async (req, res) => {
    try {
        console.log("Fetching wishlist for user ID:", req.session?.user?.id);

        const products = await productModel.find({ deleted: false }).populate('category').sort({ createdAt: -1 }).lean();
        const categories = await categoryModel.find({ deleted: false }).lean();

        let wishlist = [];

        if (req.session?.user?.id) {
            wishlist = await wishlistModel.find({
                userId: req.session.user.id
            }).lean();
        } else {
            console.log("User not logged in, skipping wishlist fetch.");
        }

        let flattenedProducts = [];

        for (const product of products) {
            let productOffer = null;
            let categoryOffer = null;

            // Fetch product offer
            if (product.offer) {
                productOffer = await offerModel.findOne({
                    name: product.offer,
                    isActive: true,
                    expiry: { $gte: new Date() }
                }).lean();
            }

            // Fetch category offer
            if (product.category?.offer) {
                categoryOffer = await offerModel.findOne({
                    name: product.category.offer,
                    isActive: true,
                    expiry: { $gte: new Date() }
                }).lean();
            }

            product.variant.forEach(variant => {
                let bestOffer = null;
                let bestDiscountAmount = 0;
                let bestDiscountText = "";

                // Calculate product offer discount
                let productDiscountAmount = 0;
                let productDiscountText = "";
                if (productOffer) {
                    if (productOffer.discountType === "percentage") {
                        productDiscountAmount = (variant.price * productOffer.discount) / 100;
                        if (productOffer.maxDiscount && productDiscountAmount > productOffer.maxDiscount) {
                            productDiscountAmount = productOffer.maxDiscount;
                        }
                        productDiscountText = `${productOffer.discount}% Off`;
                    } else {
                        productDiscountAmount = productOffer.discount;
                        productDiscountText = `Rs.${productOffer.discount} Off`;
                    }
                }

                // Calculate category offer discount
                let categoryDiscountAmount = 0;
                let categoryDiscountText = "";
                if (categoryOffer) {
                    if (categoryOffer.discountType === "percentage") {
                        categoryDiscountAmount = (variant.price * categoryOffer.discount) / 100;
                        if (categoryOffer.maxDiscount && categoryDiscountAmount > categoryOffer.maxDiscount) {
                            categoryDiscountAmount = categoryOffer.maxDiscount;
                        }
                        categoryDiscountText = `${categoryOffer.discount}% Off`;
                    } else {
                        categoryDiscountAmount = categoryOffer.discount;
                        categoryDiscountText = `Rs.${categoryOffer.discount} Off`;
                    }
                }

                // Decide the best offer
                if (productDiscountAmount >= categoryDiscountAmount) {
                    bestOffer = productOffer;
                    bestDiscountAmount = productDiscountAmount;
                    bestDiscountText = productDiscountText;
                } else {
                    bestOffer = categoryOffer;
                    bestDiscountAmount = categoryDiscountAmount;
                    bestDiscountText = categoryDiscountText;
                }

                flattenedProducts.push({
                    ...variant,
                    productId: product._id,
                    productName: product.name,
                    images: product.images,
                    category: product.category,
                    description: product.description,
                    offer: bestOffer?.name || null,
                    discountText: bestDiscountText,
                    discountAmount: bestDiscountAmount,
                    discountedPrice: variant.price - bestDiscountAmount,
                    deleted: product.deleted
                });
            });
        }

        res.status(200).render('user/all-products', {
            products: flattenedProducts,
            categories,
            wishlist
        });

    } catch (error) {
        console.error("Error fetching products:", error);
        res.status(500).render('error', { message: 'Error fetching products', error });
    }
};




module.exports = {
    productDetails,
    AddToCart,
    allProducts,


}