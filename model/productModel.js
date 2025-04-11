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
        _id: {
            type: mongoose.Schema.Types.ObjectId,
            default: () => new mongoose.Types.ObjectId(),
        },
    },

);


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
        offer: {
            type: String,
            default: null
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


productSchema.index({ category: 1 });
productSchema.index({ price: 1 });

module.exports = mongoose.model('Product', productSchema);