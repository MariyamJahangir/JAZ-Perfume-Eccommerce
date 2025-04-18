const couponModel = require('../model/couponModel')
const moment = require('moment');



//admin

const LoadCoupons = async (req, res)=>{
    const coupons = await couponModel.find().lean()
    res.render('admin/coupons', { coupons })
}

const CouponStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { isActive } = req.body;
        
        await couponModel.findByIdAndUpdate(id, { isActive });

        res.json({ success: true, message: "Status updated successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error updating status" });
    }
}

const DeleteCoupon = async (req, res) => {
    try {
        const { couponId } = req.params; // Get coupon ID from request parameters
        
        // Find and delete the coupon
        const deletedCoupon = await couponModel.findByIdAndDelete(couponId);

        if (!deletedCoupon) {
            return res.status(404).json({ success: false, message: "Coupon not found" });
        }

        res.json({ success: true, message: "Coupon deleted successfully" });
    } catch (error) {
        console.error("Error deleting coupon:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};


const LoadAddCoupons = async (req, res)=>{
    res.render('admin/add-coupons')
}


const AddCoupons = async (req, res) => {
    try {
        const { name, code, description, start, expiry, isActive, discountType, discount, maxDiscount, minAmount, maxAmount, totalUsageLimit, maxUsesPerUser } = req.body;

        // Server-side validation
        if (!name || !code || !start || !expiry || !discount || !minAmount || !totalUsageLimit || !maxUsesPerUser) {
            return res.status(400).json({ message: "All required fields must be filled." });
        }

        if (new Date(start) >= new Date(expiry)) {
            return res.status(400).json({ message: "Expiry date must be after start date." });
        }

        // Save to database (MongoDB Example)
        const newCoupon = new couponModel({
            name,
            code,
            description,
            start: new Date(start),
            expiry: new Date(expiry),
            isActive: isActive === "true",
            discountType,
            discount: parseFloat(discount),
            maxDiscount: discountType === "percentage" ? parseFloat(maxDiscount) : null,
            minAmount: parseFloat(minAmount),
            maxAmount: maxAmount ? parseFloat(maxAmount) : null,
            totalUsageLimit: parseInt(totalUsageLimit),
            maxUsesPerUser: parseInt(maxUsesPerUser),
        });

        
        newCoupon.save()

        
        res.status(201).json({ message: "Coupon added successfully!" });

    } catch (error) {
        res.status(500).json({ message: "Server Error: " + error.message });
    }
}



const LoadEditCoupons = async (req, res)=>{
    const { id } = req.params;
    const coupon = await couponModel.findById(id).lean()

    
    coupon.start = moment(coupon.start).format("YYYY-MM-DD");
    coupon.expiry = moment(coupon.expiry).format("YYYY-MM-DD");
    res.render('admin/edit-coupons', { coupon })
}


const EditCoupons = async (req, res) => {
    try {
        const { id } = req.params; // Get coupon ID from request params
        
        const {
            name, code, description, start, expiry, isActive,
            discountType, discount, maxDiscount, minAmount,
            maxAmount, totalUsageLimit, maxUsesPerUser
        } = req.body;

        // Validate required fields
        if (!name || !code || !start || !expiry || !discount || !discountType) {
            return res.status(400).json({ message: "Required fields are missing." });
        }

        if (new Date(start) >= new Date(expiry)) {
            return res.status(400).json({ message: "Expiry date must be after start date." });
        }

        if (discount <= 0) {
            return res.status(400).json({ message: "Discount value must be greater than zero." });
        }

        if (discountType === "percentage" && (!maxDiscount || maxDiscount <= 0)) {
            return res.status(400).json({ message: "Max discount is required for percentage-based discounts." });
        }

        // Find and update the coupon
        const updatedCoupon = await couponModel.findByIdAndUpdate(
            id,
            {
                name, code, description, start, expiry, isActive,
                discountType, discount, maxDiscount, minAmount,
                maxAmount, totalUsageLimit, maxUsesPerUser
            },
            { new: true, runValidators: true } // Return updated document and validate inputs
        );

        if (!updatedCoupon) {
            return res.status(404).json({ message: "Coupon not found." });
        }

        res.status(200).json({ message: "Coupon updated successfully!", coupon: updatedCoupon });

    } catch (error) {
        console.error("Error updating coupon:", error);
        res.status(500).json({ message: "Internal Server Error." });
    }
}


//user

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
    LoadCoupons,
    CouponStatus,
    DeleteCoupon,
    LoadAddCoupons,
    AddCoupons,
    LoadEditCoupons,
    EditCoupons,


    ApplyCoupon
}