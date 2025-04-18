const userModel = require('../../model/userModel')
const productModel = require('../../model/productModel')
const categoryModel = require('../../model/categoryModel')
const offerModel = require('../../model/offerModel')
const wishlistModel = require('../../model/wishlistModel')
const OtpModel = require('../../model/otpModel');
const referralModel = require('../../model/referralModel');
const walletModel = require('../../model/walletModel');
const bcrypt = require('bcrypt')
const transporter = require('../../config/emailService')
const crypto = require('crypto');
//const nodemailer = require('nodemailer');
require('dotenv').config();
const dns = require('dns');


// post signup
const registerUser = async (req, res) => {
    try {
        const { firstname, lastname, email, password, referralCode } = req.body;

        // ✅ Extract Domain and Check MX Record
        const domain = email.split('@')[1];

        const checkMXRecords = async (domain) => {
            return new Promise((resolve, reject) => {
                dns.resolveMx(domain, (err, addresses) => {
                    if (err || addresses.length === 0) {
                        reject('Invalid email domain. Please use a valid email.');
                    } else {
                        resolve(true);
                    }
                });
            });
        };

        try {
            await checkMXRecords(domain);
        } catch (error) {
            console.error("DNS Lookup Error:", error);
            return res.status(400).json({ success: false, error: error });
        }

        const existingUser = await userModel.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ success: false, error: "User already exists" });
        }

        if (referralCode) {
            const referral = await referralModel.findOne({ referralCode: referralCode });
            if (!referral) {
                return res.status(400).render('user/signup', { success: false,
                    error: 'Invalid referral code',
                    
                });
            }
        
            referral.referredUsers.push(email);
            await referral.save();
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new userModel({
            firstname,
            lastname,
            email,
            isReferred: referralCode ? true : false,
            password: hashedPassword,
            status: 'blocked',
            lastOtpSentAt: new Date()
        });
        await newUser.save();

        if (referralCode) {
            const referredUser = await referralModel.findOne({ referralCode: referralCode });
            if (referredUser) {
                const refWallet = await walletModel.findOne({ userId: referredUser.userId });
                
                if (refWallet) {
                   
                    refWallet.balance += 500; 
                    refWallet.transactions.push({
                        amount: 500,
                        type: 'Credit',
                        description: 'Referral Bonus for referring ' + email,
                    });

                    await refWallet.save();
                }
            }
        }

        
        const newWallet = new walletModel({
            userId: newUser._id,
            balance: 0, 
            transactions: [], 
        });

        await newWallet.save(); 

        const generateOtp = async (email) => {

            const existingOtp = await OtpModel.findOne({ email });

            if (existingOtp && new Date() - existingOtp.createdAt < 2 * 60 * 1000) {
                throw new Error('OTP already sent. Please check your email.');
            }

            // const otp = Math.floor(1000 + Math.random() * 9000);
            const otp = crypto.randomInt(1000, 9999).toString(); // Secure 6-digit OTP
            const createdAt = new Date();


            await OtpModel.create({
                email,
                otp,
                createdAt,
            });

            return otp;
        };

        let otp;
        try {
            otp = await generateOtp(email);
        } catch (error) {
            return res.status(400).json({ success: false, error: error.message });
        }


        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Registration OTP',
            text: `Your OTP for registration is: ${otp}. It is valid for 2 minutes.`,
        };

        const sendEmail = (mailOptions) => {
            return new Promise((resolve, reject) => {
                transporter.sendMail(mailOptions, (error, info) => {
                    if (error) {
                        reject('Failed to send OTP. Please try again later.');
                    } else {
                        resolve(info);
                    }
                });
            });
        };

        try {
            await sendEmail(mailOptions);
            req.session.tempEmail = email;
            return res.json({ success: true, message: "Signup successful! Check your email for OTP." });
        } catch (error) {
            console.error('Error sending email:', error);
            return res.status(500).json({ success: false, error: "Failed to send OTP. Please try again later." });
        }

    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, error: "Something went wrong. Please try again later." });
    }
};



const verifyOTP = async (req, res) => {
    const { otp } = req.body;
    const email = req.session.tempEmail;

    if (!email) {
        return res.status(400).json({ success: false, message: 'Session expired. Please sign up again.' });
    }

    try {
        
        await OtpModel.deleteMany({ createdAt: { $lt: new Date(Date.now() - 2 * 60 * 1000) } });
        
        const otpEntry = await OtpModel.findOne({ email });
        if (!otpEntry) {
            return res.status(400).json({ success: false, message: 'Invalid OTP request.' });
        }
 
        const otpExpiryTime = 2 * 60 * 1000; 
        if (Date.now() - otpEntry.createdAt.getTime() > otpExpiryTime) {
            return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new OTP.' });
        }
        
        if (otpEntry.otp === otp) {
            await userModel.updateOne({ email }, { $set: { status: "active" } });
            await OtpModel.findOneAndDelete({ email }); 
            req.session.tempEmail = null; 
            return res.status(200).json({ success: true, message: 'OTP verified successfully!' });
        } else {
            return res.status(400).json({ success: false, message: 'Incorrect OTP. Please try again.' });
        }
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: 'Something went wrong. Please try again later.' });
    }
};

const resendOTP = async (req, res) => {
    const email = req.session.tempEmail;
    if (!email) {
        return res.status(400).json({ success: false, message: 'Email not found in session.' });
    }

    try {
        const otp = crypto.randomInt(1000, 9999).toString();
        const createdAt = new Date(); 

       
        await OtpModel.updateOne(
            { email }, 
            { otp, createdAt }, 
            { upsert: true }
        );

        
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Registration OTP',
            text: `Your new OTP for registration is: ${otp}. It is valid for 2 minutes.`,
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error('Error sending email:', error);
                return res.status(500).json({ success: false, message: 'Failed to resend OTP. Please try again later.' });
            }

            return res.status(200).json({
                success: true,
                message: 'OTP resent successfully!'
            });
        });
    } catch (error) {
        console.error('Error in resending OTP:', error);
        return res.status(500).json({ success: false, message: 'Failed to resend OTP. Please try again later.' });
    }
};



//get logout
const logout = (req, res) => {
    req.session.user = null
    res.redirect('/login')
}


// post login
const login = async (req, res) => {
    try {
        const { email, password } = req.body
        if (!email || !password) {
            return res.status(400).json({ success: false, message: "All fields are required." });
        }
        const user = await userModel.findOne({ email })
        if (!user) {
            return res.status(404).json({ success: false, message: "User does not exist." });
        }
        if (user.status === "blocked") {
            return res.status(403).json({ success: false, message: "User is blocked." });
        }
        const isMatch = await bcrypt.compare(password, user.password)
        if (!isMatch) {
            return res.status(401).json({ success: false, message: "Incorrect password." });
        }
        req.session.user = { email, id: user._id  }
        return res.status(200).json({ success: true, message: "Login successful.", user: req.session.user });

    } catch (error) {
        console.error('Error during login:', error);
        req.flash('error', 'Something went wrong');
        return res.status(500).json({ success: false, message: "Something went wrong. Please try again." });
    }
}



//get signup
const loadRegister = (req, res) => {
    res.render('user/signup')
}


//get login
const loadLogin = (req, res) => {
    res.render('user/login')
}



const loadHome = async (req, res) => {
    try {
        
        console.log(req.session.user)
        const users = await userModel.find({ status: "active" });

        let wishlist = [];
        
        if (req.session?.user?.id) {
            wishlist = await wishlistModel.find({
                userId: req.session.user.id
            }).lean();
        } else {
            console.log("User not logged in, skipping wishlist fetch.");
        }

        let products = await productModel.find({ deleted: false })
            .populate('category')
            .sort({ updatedAt: -1 })
            .limit(6)
            .lean();

        const currentDate = new Date();
        const offers = await offerModel.find({
            isActive: true,
            start: { $lte: currentDate },
            expiry: { $gte: currentDate }
        }).lean();

        const calculateCategoryDiscount = (offer, price) => {
            if (!offer) return { amount: 0, text: "" };

            let discountAmount = 0;
            let discountText = "";

            if (offer.discountType === "percentage") {
                discountAmount = (price * offer.discount) / 100;
                if (offer.maxDiscount && discountAmount > offer.maxDiscount) {
                    discountAmount = offer.maxDiscount;
                }
                discountText = `${offer.discount}% Off`;
            } else {
                discountAmount = offer.discount;
                discountText = `Rs.${offer.discount} Off`;
            }

            return {
                amount: Math.floor(discountAmount),
                text: discountText
            };
        };

        products = products.map(product => {
            const variant = product.variant?.[0];
            if (!variant) return product;

            const price = variant.price;

            const productOffer = product.offer
                ? offers.find(o => o.name === product.offer && o.offerType === 'product')
                : null;

            const categoryOffer = product.category?.offer
                ? offers.find(o => o.name === product.category.offer && o.offerType === 'category')
                : null;

            // Calculate product offer discount
            let productDiscountAmount = 0;
            let productDiscountText = "";
            if (productOffer) {
                if (productOffer.discountType === "percentage") {
                    productDiscountAmount = (price * productOffer.discount) / 100;
                    if (productOffer.maxDiscount && productDiscountAmount > productOffer.maxDiscount) {
                        productDiscountAmount = productOffer.maxDiscount;
                    }
                    productDiscountText = `${productOffer.discount}% Off`;
                } else {
                    productDiscountAmount = productOffer.discount;
                    productDiscountText = `Rs.${productOffer.discount} Off`;
                }
            }

            // Calculate category offer discount
            const { amount: categoryDiscountAmount, text: categoryDiscountText } = calculateCategoryDiscount(categoryOffer, price);

            // Decide which discount to apply
            let bestDiscountAmount = 0;
            let bestDiscountText = "";
            if (productDiscountAmount >= categoryDiscountAmount) {
                bestDiscountAmount = Math.floor(productDiscountAmount);
                bestDiscountText = productDiscountText;
            } else {
                bestDiscountAmount = Math.floor(categoryDiscountAmount);
                bestDiscountText = categoryDiscountText;
            }

            const discountedPrice = Math.floor(price - bestDiscountAmount);

             // ✅ Check if product + variant is in wishlist
            const inWishlist = wishlist?.some(item =>
                item.productId.toString() === product._id.toString() &&
                item.variantId.toString() === variant._id.toString()
            );

            return {
                ...product,
                firstVariant: variant,
                discountAmount: bestDiscountAmount,
                discountedPrice,
                discountText: bestDiscountText,
                inWishlist
            };
        });

       

        const categories = await categoryModel.find().lean();

        res.render('user/home', {
            users,
            products,
            categories,
        });

    } catch (error) {
        console.error("Error loading home:", error);
        res.status(500).send('Server Error');
    }
};



const contact = (req, res) => {

    res.send('Welcome to Contact Page')
    res.end()
}


//-------------------
//get forget
const forgetPassword = (req, res) => {

    res.render('user/forget-pass')

}

// post forget
const forget = async (req, res) => {
    const { email } = req.body;

    try {
        
        const user = await userModel.findOne({ email });
        
        if (!user) {
            return res.render('user/forget-pass', { message: 'No account found with this email.' });
        }
        
        const otp = Math.floor(1000 + Math.random() * 9000); 

        
        await OtpModel.updateOne(
            { email }, 
            { 
                $set: { 
                    otp: otp.toString(), 
                    createdAt: new Date() 
                }
            },
            { upsert: true } 
        );

        
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Password Reset OTP',
            text: `Your OTP for password reset is: ${otp}. It is valid for 5 minutes.`,
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error('Error sending email:', error);
                return res.status(500).send('Failed to send OTP. Please try again later.');
            }
            req.session.email = email; 
            res.redirect('/forget-otp');
        });
    } catch (error) {
        console.error('Error in forgot password:', error);
        res.status(500).render('user/forget-pass', { message: 'Something went wrong. Please try again later.' });
    }
};

// get forgetotp
const forgetOtp = (req, res)=>{

    res.render('user/forget-otp')
}

const forgetOtpResend = async (req, res) => {
    const email = req.session.email;

    if (!email) {
        return res.status(400).json({ success: false, message: 'No email in session.' });
    }

    try {
       
        const user = await userModel.findOne({ email });
        if (!user) {
            return res.status(400).json({ success: false, message: 'No account found with this email.' });
        }

        
        const otp = Math.floor(1000 + Math.random() * 9000);

        
        const updateResult = await OtpModel.updateOne(
            { email }, 
            {
                $set: {
                    otp: otp.toString(), 
                    createdAt: new Date(), 
                },
            },
            { upsert: true } 
        );

        if (updateResult.matchedCount === 0 && !updateResult.upsertedCount) {
            return res.status(500).json({ success: false, message: 'Failed to update OTP in the database.' });
        }

        
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Resent OTP for Password Reset',
            text: `Your new OTP for password reset is: ${otp}. It is valid for 5 minutes.`,
        };

        transporter.sendMail(mailOptions, (error) => {
            if (error) {
                console.error('Error sending email:', error);
                return res.status(500).json({ success: false, message: 'Failed to send OTP.' });
            }

            
            return res.status(200).json({ success: true, message: 'OTP resent successfully.' });
        });
    } catch (error) {
        console.error('Error resending OTP:', error);
        return res.status(500).json({ success: false, message: 'Something went wrong. Please try again.' });
    }
};

const forgetVerifyOtp = async (req, res) => {
    const { otp } = req.body;
    const email = req.session.email; 
    
    try {
        const otpEntry = await OtpModel.findOne({ email });

        if (!otpEntry) {
            return res.json({ success: false, message: 'OTP not found. Please request a new one.' });
        }

        const isExpired = (new Date() - new Date(otpEntry.createdAt)) > 5 * 60 * 1000; 
        if (isExpired) {
            return res.json({ success: false, message: 'OTP has expired. Please request a new one.' });
        }

        if (otpEntry.otp !== otp) {
            return res.json({ success: false, message: 'Invalid OTP. Please try again.' });
        }

        
        req.session.isOtpVerified = true;
        
        return res.json({ success: true});
    } catch (error) {
        console.error('Error verifying OTP:', error);
        return res.json({ success: false, message: 'An error occurred during OTP verification. Please try again.' });
    }
}



//get reset pass
const resetPassword = (req, res) => {
    res.render('user/reset-pass')
}


//post resetpass
const resetPass = async (req, res) => {
    try {
        const { password } = req.body;
        const email = req.session.email; 

        if (!email || !password) {
            
            return res.status(400).json({ success: false, message: 'Invalid request!' });
        }

       
        const user = await userModel.findOne({ email });
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found!' });
        }

        
        const hashedPassword = await bcrypt.hash(password, 10);

       
        const updatedUser = await userModel.findOneAndUpdate({ email }, { password: hashedPassword }, { new: true });

        if (!updatedUser) {
            return res.status(400).json({ success: false, message: 'Failed to update password.' });
        }

        
        return res.status(200).json({ success: true, message: 'Password updated successfully.' });

    } catch (error) {
        console.error('Error resetting password:', error);
        
        if (!res.headersSent) {
            return res.status(500).json({ success: false, message: 'Server error. Please try again later.' });
        }
    }
};




const otp = (req, res) => {
    res.render('user/otp')
}






//------------







module.exports = {
    registerUser,
    verifyOTP,
    resendOTP,
    loadRegister,
    loadLogin,
    login,
    loadHome,
    logout,
    contact,

    forgetPassword,
    forget,
    forgetOtp,
    forgetOtpResend,
    forgetVerifyOtp,
    resetPassword,
    resetPass,
    otp,


}