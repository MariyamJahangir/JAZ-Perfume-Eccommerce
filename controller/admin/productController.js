const productModel = require('../../model/productModel')
const categoryModel = require('../../model/categoryModel')
const moment = require('moment');
const fs = require('fs')



// Get Products List
const products = async (req, res) => {
    try {
        const products = await productModel.find({ deleted: false }).lean(); // Fetch products from MongoDB    
        // Format the timestamps
        const formattedProducts = products.map((product) => ({
            _id: product._id, // Pass the unique identifier for editing/deleting
            name: product.name,
            images: product.images,
            description: product.description,
            createdAt: moment(product.createdAt).format('DD MMM YYYY'), // Format the creation date
        }));
        // Render the template with the formatted data
        res.render('admin/products', { products: formattedProducts }); // Pass products to the template
    } catch (err) {
        res.status(500).send("Error fetching products");
    }
}




// Get Add Products Page
const loadAddProducts = async (req, res) => {
    const categories = await categoryModel.find({}).lean();
    res.render('admin/add-products', { categories })
}



const addProducts = async (req, res) => {
    try {
        const { name, category, offer, description, trending, variant } = req.body;

        // Validate required fields
        if (!name || !category || !description || !variant) {
            return res.status(400).json({
                error: "All required fields (name, category, description, variant) must be provided.",
            });
        }

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                error: "No images were uploaded. Please upload at least one image.",
            });
        }

        // Parse images
        const imagePaths = req.files.map((file) => file.filename);

        // Parse variants
        let parsedVariants = [];
        try {
            parsedVariants = JSON.parse(variant); // Ensure `variant` is parsed as JSON
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

        // Validate variant fields
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

        // Create new product
        const newProduct = new productModel({
            name,
            category,
            offer,
            description,
            variant: parsedVariants, // Add validated variants to the product
            trending: trending || false,
            images: imagePaths,
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


        const categories = await categoryModel.find().lean();

        if (!product) {
            return res.status(404).send("Product not found");
        }
        res.render("admin/edit-products", {
            product,
            categories,
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
        if (offer) product.offer = offer;
        if (description) product.description = description;
        if (trending) product.trending = trending;
        if (images) product.images = finalImages;
        product.variant = parsedVariants;


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


module.exports = {
    products,
    loadAddProducts,
    addProducts,
    loadEditProducts,
    getProductImages,
    editProducts,
    deleteProduct
}