const productModel = require("../../model/productModel")
const cartModel = require("../../model/cartModel")
const categoryModel = require('../../model/categoryModel')

// get single product detail
const productDetails = async (req,res)=>{
    const productId = req.params.id;
    const product = await productModel.findById(productId).lean();
    const allproducts = await productModel.find({}).lean().sort({updatedAt : -1}).limit(6)
    res.render('user/product-details', { product, allproducts })
}



const AddToCart = async (req, res) => {
    try {

        // Check if the user is authenticated
        if (!req.session.user || !req.session.user.id) {
            return res.status(401).json({ success: false, message: "User not authenticated. You need to log in to add products to the cart." });
        }

        // Extract productId and variantId from the request body
        const { productId, variantId, quantityCount } = req.body;

      

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

        // Ensure the variant has a valid price
        if (!variant.price) {
            return res.status(400).json({ success: false, message: "Variant price is missing" });
        }

      



        // Check if the item already exists in the cart with the same product and variant
        let cartItem = await cartModel.findOne({
            user: req.session.user.id,
            "products": productId,
            "variant": variantId
        });



        let totalRequestedQuantity = parseInt(quantityCount);
        let StockAvailable = variant.stockQuantity
        let maxAllowed = Math.min(5, StockAvailable)

        if (cartItem) {
            if (
                cartItem.products.toString() === productId &&
                cartItem.variant.toString() === variantId
            ) {
                totalRequestedQuantity += cartItem.quantityCount;
            }
        }
  
        if (totalRequestedQuantity > maxAllowed) {
            return res.status(400).json({
                message: `Only ${maxAllowed} items can be added.`,
                swal: true 
            });
        }





        if (cartItem) {
            // If the item already exists, increase the quantity and update totalPrice
            cartItem.quantityCount += quantityCount; // Increase quantity by 1
            cartItem.totalPrice = cartItem.quantityCount * variant.price; // Add the variant's price to the total price
        } else {
            // If the item doesn't exist, create a new cart item
            cartItem = new cartModel({
                user: req.session.user.id,
                products: productId,   // Store only the product ID
                variant: variantId,     // Store only the variant ID
                totalPrice: variant.price * quantityCount, // Set the totalPrice to the selected variant's price
                quantityCount: quantityCount,       // Set quantity to 1 initially
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
        const products = await productModel.find({ deleted: false }).populate('category').lean();
        const categories = await categoryModel.find().lean();

        // Flatten the products into individual variants
        const flattenedProducts = products.flatMap(product =>
            product.variant.map(variant => ({
                ...variant,
                productId: product._id,
                productName: product.name,
                images: product.images,
                category: product.category,
                description: product.description,
                deleted: product.deleted
            }))
        );

       

        res.status(200).render('user/all-products', { products: flattenedProducts, categories });
    } catch (error) {
        res.status(500).render('error', { message: 'Error fetching products', error });
    }
};



  


module.exports = {
    productDetails,
    AddToCart,
    allProducts,
    

}