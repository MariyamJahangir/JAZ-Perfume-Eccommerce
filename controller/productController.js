const productModel = require('../model/productModel')
const categoryModel = require('../model/categoryModel')
const offerModel = require('../model/offerModel')
const moment = require('moment');
const fs = require('fs')

const cartModel = require("../model/cartModel")
const reviewModel = require('../model/reviewModel')
const wishlistModel = require('../model/wishlistModel')




//admin

// Get Products List
const products = async (req, res) => {
    try {
        let page = parseInt(req.query.page) || 1; // Get current page (default: 1)
        let limit = 12; // Number of products per page
        let skip = (page - 1) * limit; // Calculate offset

        const products = await productModel.find({ deleted: false }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(); // Fetch products from MongoDB 
        const totalProducts = await productModel.countDocuments(); // Get total count

        // Format the timestamps
        const formattedProducts = products.map((product) => ({
            _id: product._id, // Pass the unique identifier for editing/deleting
            name: product.name,
            images: product.images,
            description: product.description,
            createdAt: moment(product.createdAt).format('DD MMM YYYY'), // Format the creation date
        }));
        // Render the template with the formatted data
        res.render('admin/products', { 
            products: formattedProducts, 
            currentPage: page, 
            totalPages: Math.ceil(totalProducts / limit) 
        }); // Pass products to the template
    } catch (err) {
        console.error("Error fetching products:", err);
        res.status(500).send("Error fetching products");
    }
}

const searchProduct = async (req, res) => {
    try {
        let searchQuery = req.query.query || "";
        let filter = { deleted: false };

        if (searchQuery) {
            filter.name = { $regex: searchQuery, $options: "i" };
        }

        const products = await productModel.find(filter).limit(12).lean(); // Fetch matching products

        res.json({ products }); // Send JSON response
    } catch (err) {
        console.error("Error fetching search results:", err);
        res.status(500).json({ error: "Error fetching search results" });
    }
}




// Get Add Products Page
const loadAddProducts = async (req, res) => {
    const categories = await categoryModel.find({}).lean();
    const offers = await offerModel.find({offerType: 'product', isActive: true, expiry: { $gte: new Date() }}).lean();
    res.render('admin/add-products', { categories, offers })
}



const addProducts = async (req, res) => {
    try {
        const { name, category, offer, description, trending, variant, images } = req.body;

        console.log("add category:", category)

        // Validate required fields
        if (!name || !category || !description || !variant) {
            return res.status(400).json({
                error: "All required fields (name, category, description, variant) must be provided.",
            });
        }

        
        let parsedVariants = [];
        try {
            parsedVariants = JSON.parse(variant); 
            if (!Array.isArray(parsedVariants) || parsedVariants.length === 0) {
                return res.status(400).json({
                    error: "At least one valid variant is required.",
                });
            }
        } catch (parseError) {
            return res.status(400).json({
                error: "Invalid variant format. Please ensure variants are correctly formatted.",
            });
        }

       
        for (const v of parsedVariants) {
            if (v.quantityML === undefined || typeof v.quantityML !== "number") {
                return res.status(400).json({ error: "Each variant must have a valid quantityML (number)." });
            }
            if (v.price === undefined || typeof v.price !== "number") {
                return res.status(400).json({ error: "Each variant must have a valid price (number)." });
            }
            if (v.stockQuantity === undefined || typeof v.stockQuantity !== "number") {
                return res.status(400).json({ error: "Each variant must have a valid stockQuantity (number)." });
            }
        }


        // Handle image processing
        const finalImages = images.map((image) => {
            if (image.startsWith("data:image")) {
                const fileName = `${Date.now()}-image.jpg`;
                const base64Data = image.split(",")[1];
                const buffer = Buffer.from(base64Data, "base64");
                fs.writeFileSync(`uploads/${fileName}`, buffer);
                return fileName;
            }
            return image;
        });
        


        // Create new product
        const newProduct = new productModel({
            name,
            category,
            offer,
            description,
            variant: parsedVariants, // Add validated variants to the product
            trending: trending || false,
            images: finalImages,
        });

        

        await newProduct.save();

        res.status(201).json({
            message: "Product added successfully",
            product: newProduct,
        });
    } catch (error) {
        console.error("Error adding product:", error);
        res.status(500).json({
            error: "An error occurred while adding the product. Please try again later.",
        });
    }
};




// Get Edit Products Page
const loadEditProducts = async (req, res) => {
    try {
        const productId = req.params.id;

        const product = await productModel.findById(productId).lean();


        const categories = await categoryModel.find({deleted:"false"}).lean();

        const currentDate = new Date();
        const offers = await offerModel.find({ expiry: { $gte: currentDate }, offerType:'product', isActive: true }).lean();
        console.log('offers:',offers)

        if (!product) {
            return res.status(404).send("Product not found");
        }
       
        
        res.render("admin/edit-products", {
            product,
            categories,
            offers
        });
    } catch (err) {
        console.error(err);
        res.status(500).send("Server error");
    }
}


//-----------------
// Get Product images of one product with id
const getProductImages = async (req, res) => {
    try {
        const productId = req.params.id;

        const product = await productModel.findById(productId).lean();

        if (!product) {
            return res.status(404).json({ error: "Product not found" });
        }

        res.json(product.images);

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
};

//-------------------




const editProducts = async (req, res) => {
    try {
        const productId = req.params.id;


        if (!productId) {
            return res.status(400).json({ message: "Product ID is required" });
        }


        const product = await productModel.findById(productId);
        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }

        const { name, category, offer, description, variant, trending, images } = req.body;
        

        console.log('edit category:',category)
        
        if (!variant || !Array.isArray(variant) || variant.length === 0) {
            return res.status(400).json({ message: "At least one valid variant is required." });
        }

        // Validate each variant
        variant.forEach((v, i) => {
            if (!v || !v.quantityML || typeof v.quantityML !== 'string' || v.quantityML.trim() === '') {
                throw new Error(`Variant ${i} is missing a valid quantityML`);
            }
            if (isNaN(Number(v.price)) || isNaN(Number(v.stockQuantity))) {
                throw new Error(`Variant ${i} has invalid price or stockQuantity`);
            }
        });



        const parsedVariants = variant.map((variant, index) => {
            
            const quantityML = variant.quantityML.trim()
            const price = Number(variant.price);
            const stockQuantity = Number(variant.stockQuantity);


            if (!quantityML || isNaN(price) || isNaN(stockQuantity)) {
                throw new Error(`Invalid data for variant at index ${index}`);
            }

            let stockStatus;
            if (stockQuantity === 0) {
                stockStatus = "Out of Stock";
            } else if (stockQuantity < 10) {
                stockStatus = "A few stocks left";
            } else {
                stockStatus = "In Stock";
            }

            

            return {
                _id: variant._id,
                quantityML: quantityML,
                price,
                stockQuantity: stockQuantity,
                stockStatus,
            };
        });

        
        

        // Handle image processing
        const finalImages = images.map((image) => {
            if (image.startsWith("data:image")) {
                const fileName = `${Date.now()}-image.jpg`;
                const base64Data = image.split(",")[1];
                const buffer = Buffer.from(base64Data, "base64");
                fs.writeFileSync(`uploads/${fileName}`, buffer);
                return fileName;
            }
            return image;
        });



        if (name) product.name = name;
        if (category) product.category = category;
        console.log("edit category:",category)
        if (offer) product.offer = offer;
        if (description) product.description = description;
        if (trending) product.trending = trending;
        if (images) product.images = finalImages;
        product.variant = parsedVariants;
        
        console.log("edit-product:", product)

        await product.save();

        return res.status(200).json({ message: "Product updated successfully", product });
    }
    catch (error) {
        console.error('Error in editProd:', error);
        return res.status(500).json({ message: `An error occurred while updating the product: ${error.message}` });
    }
};





// Post Soft Delete Products Page
const deleteProduct = async (req, res) => {
    try {
        const { id, deleted } = req.body;
        const product = await productModel.findByIdAndUpdate(id, { deleted }, { new: true });
        res.json({ success: true, deleted: product.deleted });
    } catch (error) {
        console.error('Error deleting the product', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
}






///user


const productDetails = async (req, res) => {
    const productId = req.params.productId;
    const variantId = req.params.variantId;

    const product = await productModel.findById(productId).populate("category").lean();
    
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


const allProducts = async (req, res) => {
    try {
        

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
    products,
    searchProduct,
    loadAddProducts,
    addProducts,
    loadEditProducts,
    getProductImages,
    editProducts,
    deleteProduct,


    productDetails,
    AddToCart,
    allProducts,

}






