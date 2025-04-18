const productModel = require('../model/productModel');
const wishlistModel = require('../model/wishlistModel')
const offerModel = require('../model/offerModel')



const LoadWishlist = async (req, res) => {
    try {
        const wishlists = await wishlistModel.find({ userId: req.session.user.id }).sort({ _id: -1 }).lean();

        const updatedWishlist = await Promise.all(
            wishlists.map(async (item) => {
                const product = await productModel.findById(item.productId).lean();

                if (!product) return { ...item, product: null, variant: null };

                const variant = product.variant.find(v => v._id.toString() === item.variantId.toString()) || null;
                const updatedItem = { ...item, product, variant };

                if (!variant) return updatedItem; // No variant, return early

                if (product.offer) {
                    const offer = await offerModel.findOne({
                        name: product.offer,
                        isActive: true,
                        expiry: { $gte: new Date() }
                    }).lean();

                    if (offer) {
                        let discountAmount = 0;

                        if (offer.discountType === 'percentage') {
                            discountAmount = (variant.price * offer.discount) / 100;
                            if (offer.maxDiscount !== null) {
                                discountAmount = Math.min(discountAmount, offer.maxDiscount);
                            }
                        } else if (offer.discountType === 'fixed') {
                            discountAmount = offer.discount;
                        }

                        updatedItem.variant = {
                            ...variant,
                            discountType: offer.discountType,
                            discount: offer.discount,
                            discountAmount: parseFloat(discountAmount.toFixed(2)),
                            discountedPrice: parseFloat((variant.price - discountAmount).toFixed(2)),
                        };
                    }
                }

                return updatedItem;
            })
        );

       
        res.render('user/wishlist', { wishlists: updatedWishlist });

    } catch (err) {
        console.error('Wishlist Error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};





const CheckWishlist = async (req, res) => {

    const userId = req.session.user.id;

    try {
        const item = await wishlistModel.findOne({
            userId,
            productId: req.params.productId,
            variantId: req.params.variantId
        });

        res.json({ success: true, inWishlist: !!item });
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
}


const AddWishlist = async (req, res) => {
    try {
        const userId = req.session.user.id;

        const { productId, variantId } = req.body;
        const newItem = new wishlistModel({ userId, productId, variantId });

        await newItem.save();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: "Server error" });
    }
}


const RemoveWishlist = async (req, res) => {
    try {
        const userId = req.session.user.id;

        await wishlistModel.findOneAndDelete({
            userId,
            productId: req.body.productId,
            variantId: req.body.variantId
        });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: "Server error" });
    }
}




module.exports = {
    LoadWishlist,
    CheckWishlist,
    AddWishlist,
    RemoveWishlist
    
}