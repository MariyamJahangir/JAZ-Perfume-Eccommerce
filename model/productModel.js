const mongoose = require('mongoose');

const variantSchema = new mongoose.Schema(
    {
        quantityML: {
            type: Number,
        },
        price: {
            type: Number,
            required: true,
        },
        stockQuantity: {
            type: Number,
            required: true,
        },
        stockStatus: {
            type: String,
            enum: ["In Stock", "A few stocks left", "Out of Stock"],
            
        },
    },
    
);

//module.exports = mongoose.model('variant', variantSchema);

const productSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
        },
        category: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Category',
            required: true
        },
        offer: {
            type: String,

        },
        trending: {
            type: Boolean,
            default: false
        },
        description: {
            type: String,
            required: true,
        },
        variant: {
            type: [variantSchema],
            required: true,
        },
        images: {
            type: [String],
            required: [true, "At least one image is required"],
            validate: {
                validator: (v) => v && v.length > 0,
                message: "Images array must contain at least one image",
            },
        },
        deleted: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    }
);


module.exports = mongoose.model('product', productSchema);