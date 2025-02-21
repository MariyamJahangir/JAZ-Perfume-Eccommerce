const productModel = require("../../model/productModel")
const cartModel = require("../../model/cartModel")
const categoryModel = require('../../model/categoryModel')

// get single product detail
const productDetails = async (req,res)=>{
    const productId = req.params.id;
    const product = await productModel.findById(productId).lean();
    res.render('user/product-details', { product })
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

        if (cartItem) {
            // If the item already exists, increase the quantity and update totalPrice
            cartItem.quantityCount += 1; // Increase quantity by 1
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

// get all-products
// const allProducts = async (req, res)=>{
//     const products = await productModel.find().lean()
//     const categories = await categoryModel.find().lean()
//     res.render('user/all-products', { products, categories, title: 'All Products' })

// }

const allProducts = async (req, res) => {
    try {
      const categories = await categoryModel.find({ deleted: false }).lean();
      const products = await productModel.find({ deleted: false }).populate('category');
      //const offers = await Offer.find({ status: true });
  
    
      //const userWishlist =  await Wishlist.findOne({ user: req.session.user.id });
     
     
    //   const getProductDiscount = (product, category) => {
    //     let productDiscount = 0;
    //     let categoryDiscount = 0;
      
    //     if (product.offers) {
    //       const productOffer = offers.find(offer => offer.name === product.offers);
    //       if (productOffer && productOffer.status) {
    //         productDiscount = productOffer.discount;
    //       }
    //     }
      
    //     if (category && category.offers) {
    //       const categoryOffer = offers.find(offer => offer.name === category.offers);
    //       if (categoryOffer && categoryOffer.status) {
    //         categoryDiscount = categoryOffer.discount;
    //       }
    //     }
      
    //     return Math.max(productDiscount, categoryDiscount);
    //   };
      console.log(categories)
  
      const allProducts = products.flatMap(product => {
        return product.variant.map(variant => {
                  const category = categories.find(cat => cat._id.toString() === product.category.toString()); 
                 // const discount = getProductDiscount(product, category);
                   product.images = product.images[0]; 
                //  const originalPrice = variant.price;
                //   let discountedPrice = originalPrice;
          
                //   if (discount > 0) {
                //     discountedPrice = originalPrice - (originalPrice * discount / 100);
                //   }
          return {
            ...product.toObject(),
            variantId: variant._id,
            price: variant.price,
            // discountedPrice: discountedPrice,
            stock: variant.stockQuantity,
            size: variant.quantityML,
            // isWishlisted: userWishlist?.products.some(p => p.variant.equals(variant._id)),
            
            popularity: product.popularity,
            averageRating: product.averageRating,
            featured: product.featured,
            createdAt: product.createdAt
          };
        });
      });
  
      res.render('user/all-products', { 
        allProducts: JSON.stringify(allProducts), 
        categories 
      });
    } catch (err) {
      console.error('Error fetching products:', err);
      res.status(500).send('Server Error');
    }
  }
  

module.exports = {
    productDetails,
    AddToCart,
    allProducts

}