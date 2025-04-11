const offerModel = require('../../model/offerModel')
const moment = require('moment');


const LoadOffers = async (req, res) => {
    const offers = await offerModel.find().lean()
    res.render('admin/offers', { offers })
}

const OfferStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { isActive } = req.body;
        
        await offerModel.findByIdAndUpdate(id, { isActive });

        res.json({ success: true, message: "Status updated successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error updating status" });
    }
}


const DeleteOffer = async (req, res) => {
    try {
        const { offerId } = req.params; // Get coupon ID from request parameters
        
        // Find and delete the coupon
        const deletedOffer = await offerModel.findByIdAndDelete(offerId);

        if (!deletedOffer) {
            return res.status(404).json({ success: false, message: "Coupon not found" });
        }

        res.json({ success: true, message: "Offer deleted successfully" });
    } catch (error) {
        console.error("Error deleting offer:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};


const LoadAddOffers = async (req, res) => {
    res.render('admin/add-offers')
}

const AddOffers = async (req, res) => {
    try {
        const { name, description, offerType, start, expiry, discountType, discount, maxDiscount, isActive } = req.body;

        // Validate required fields
        if (!name || !description || !offerType || !start || !expiry || !discount) {
            return res.status(400).json({ message: 'All fields are required.' });
        }

        // Convert isActive to Boolean
        const isActiveBoolean = isActive === 'true';

        // Create new offer
        const newOffer = new offerModel({
            name,
            description,
            offerType,
            start: new Date(start),
            expiry: new Date(expiry),
            discountType,
            discount: parseFloat(discount),
            maxDiscount: discountType === "percentage" ? parseFloat(maxDiscount) : null,
            isActive: isActiveBoolean,
        });

        // Save to database
        await newOffer.save();

        res.status(201).json({ message: 'Offer added successfully', offer: newOffer });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
}


const LoadEditOffers = async (req, res) => {

    const { id } = req.params;
    const offer = await offerModel.findById(id).lean()

  
    offer.start = moment(offer.start).format("YYYY-MM-DD");
    offer.expiry = moment(offer.expiry).format("YYYY-MM-DD");
    res.render('admin/edit-offers', { offer })


}


const EditOffers = async (req, res) => {
    try {
        const offerId = req.params.id; // Get Offer ID from request params
        const {
            name,
            description,
            offerType,
            start,
            expiry,
            discountType,
            discount,
            maxDiscount,
            isActive
        } = req.body;

        // Validate required fields
        if (!name || !offerType || !start || !expiry || !discountType || discount === undefined) {
            return res.status(400).json({ message: "All required fields must be filled." });
        }

        if (new Date(start) >= new Date(expiry)) {
            return res.status(400).json({ message: "Expiry date must be after the start date." });
        }

        if (discount <= 0) {
            return res.status(400).json({ message: "Discount value must be greater than zero." });
        }

        if (discountType === "percentage" && (maxDiscount === null || maxDiscount < 0)) {
            return res.status(400).json({ message: "Max discount is required for percentage-based discounts." });
        }

        // Find and update offer
        const updatedOffer = await offerModel.findByIdAndUpdate(
            offerId,
            {
                name,
                description,
                offerType,
                start,
                expiry,
                discountType,
                discount,
                maxDiscount: maxDiscount || null,
                isActive
            },
            { new: true } // Return the updated offer
        );

        if (!updatedOffer) {
            return res.status(404).json({ message: "Offer not found." });
        }

        return res.status(200).json({ message: "Offer updated successfully!", offer: updatedOffer });
    } catch (error) {
        console.error("Error updating offer:", error);
        return res.status(500).json({ message: "Internal server error." });
    }
};

module.exports = {
    LoadOffers,
    OfferStatus,
    DeleteOffer,
    LoadAddOffers,
    AddOffers,
    LoadEditOffers,
    EditOffers
}