const productModel = require("../../model/productModel")

// get single product detail
const productDetails = async (req,res)=>{
    const productId = req.params.id;
    const product = await productModel.findById(productId).lean();
    res.render('user/product-details', { product })
}


// get all-products
const allProducts = async (req, res)=>{
    const products = await productModel.find().lean()
    res.render('user/all-products', { products, title: 'All Products' })
}

module.exports = {
    productDetails,
    allProducts
}