const referralModel = require('../../model/referralModel')
const userModel = require('../../model/userModel')
const crypto = require('crypto');


const getReferralCode = async (req, res) => {
    try {
        let referral = await referralModel.findOne({ userId: req.session.user.id });

       
        if (referral && referral.referralCode) {
            return res.status(200).json({ referralCode: referral.referralCode });
        }

        
        if (!referral) {
            referral = new referralModel({ userId: req.session.user.id });
        }

        
        if (!referral.referralCode) {
            referral.referralCode = await generateUniqueReferralCode();
        }

        await referral.save(); 

        res.status(200).json({ referralCode: referral.referralCode });

    } catch (error) {
        console.error("Error fetching referral code:", error);
        res.status(500).json({ message: "Server error" });
    }
};


const generateUniqueReferralCode = async () => {
   
    let randomCode, isUnique = false;

    while (!isUnique) {
        randomCode = crypto.randomBytes(4).toString('hex').toUpperCase();

        const existingReferral = await referralModel.findOne({ referralCode: randomCode });
        
        if (!existingReferral) {
            isUnique = true;
        }
    }
    return randomCode;
};


module.exports={

    getReferralCode
}