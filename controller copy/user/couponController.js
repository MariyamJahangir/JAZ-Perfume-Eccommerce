const couponModel = require('../../model/couponModel')


const ApplyCoupon = async (req, res) => {
    const { couponCode, subTotalPrice } = req.body;
    const userId = req.session.user.id
    try {
        const coupon = await couponModel.findOne({ code: couponCode, isActive: true });

        if (!coupon) {
            return res.json({ success: false, message: "Invalid or expired coupon." });
        }

        const currentDate = new Date();
        if (currentDate < coupon.start || currentDate > coupon.expiry) {
            return res.json({ success: false, message: "This coupon is not valid at this time." });
        }

        if (subTotalPrice < coupon.minAmount) {
            return res.json({ success: false, message: `Minimum order amount should be ₹${coupon.minAmount}.` });
        }

        if (coupon.usedCount >= coupon.totalUsageLimit) {
            return res.json({ success: false, message: "This coupon has reached its usage limit." });
        }

        const userUsage = coupon.usedBy.find(entry => entry.userId.toString() === userId.toString());
        if (userUsage && userUsage.usedTimes >= coupon.maxUsesPerUser) {
            return res.json({ success: false, message: "You have already used this coupon the maximum number of times." });
        }

        let couponDiscount = 0;

        if (coupon.discountType === "fixed") {
            couponDiscount = coupon.discount;
        } else if (coupon.discountType === "percentage") {
            couponDiscount = (subTotalPrice * coupon.discount) / 100;
            if (coupon.maxDiscount && couponDiscount > coupon.maxDiscount) {
                couponDiscount = coupon.maxDiscount;
            }
        }

        const totalDiscountPrice = Math.max(subTotalPrice - couponDiscount, 0);

        return res.json({ 
            success: true, 
            couponDiscount, 
            totalDiscountPrice, 
            message: "Coupon applied successfully." 
        });

    } catch (error) {
        console.error("Error applying coupon:", error);
        return res.json({ success: false, message: "Server error. Please try again later." });
    }
};



module.exports = {
    
    ApplyCoupon
}

