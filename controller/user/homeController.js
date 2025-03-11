const userModel = require('../../model/userModel')
const productModel = require('../../model/productModel')
const categoryModel = require('../../model/categoryModel')
const OtpModel = require('../../model/otpModel');
const bcrypt = require('bcrypt')
const transporter = require('../../config/emailService')
//const crypto = require('crypto');
//const nodemailer = require('nodemailer');
require('dotenv').config();


// post signup
const registerUser = async (req, res) => {
    try {
        const { firstname, lastname, email, password } = req.body;

        if (!firstname || !lastname || !email || !password) {
            req.flash('error', 'All fields are required');
            return res.redirect('/signup');
        }

        const emailPattern =  /^[a-z0-9]{4,}@[a-z]+.[a-z]{2,3}$/
        if (!emailPattern.test(email)) {
            req.flash('error', 'Please enter a valid email address!');
            return res.redirect('/signup');
        }

        const existingUser = await userModel.findOne({ email });
        if (existingUser) {
            req.flash('error', 'User already exists');
            return res.redirect('/signup');
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new userModel({
            firstname,
            lastname,
            email,
            password: hashedPassword,
            status: 'blocked',
            lastOtpSentAt: new Date()
        });
        await newUser.save();

        const generateOtp = async (email) => {

            const existingOtp = await OtpModel.findOne({ email });

            if (existingOtp && new Date() - existingOtp.createdAt < 5 * 60 * 1000) {
                throw new Error('OTP already sent. Please check your email.');
            }

            const otp = Math.floor(1000 + Math.random() * 9000);
            const createdAt = new Date();


            await OtpModel.create({
                email,
                otp,
                createdAt,
            });

            return otp;
        };

        const otp = await generateOtp(email);


        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Registration OTP',
            text: `Your OTP for registration is: ${otp}. It is valid for 5 minutes.`,
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
            res.redirect('/otp');
        } catch (error) {
            console.error('Error sending email:', error);
            return res.render('user/signup', { message: error });
        }

    } catch (error) {
        console.error(error);
        res.render('user/signup', { message: 'Something went wrong. Please try again later.' });
    }
};


const verifyOTP = async (req, res) => {
    const { otp } = req.body;
    const email = req.session.tempEmail;

    if (!email) {
        return res.redirect('/signup');
    }

    try {
        
        const otpEntry = await OtpModel.findOne({ email });
        if (!otpEntry) {
            return res.render('user/otp', { message: 'Invalid OTP request.' });
        }

        const cleanupUnverifiedUsers = async () => {
            const cleanupTime = 30 * 60 * 1000; 
        
            
            const unverifiedUsers = await userModel.find({ status: "blocked", createdAt: { $lt: new Date(Date.now() - cleanupTime) } });
        
            
            await userModel.deleteMany({ _id: { $in: unverifiedUsers.map(user => user._id) } });
        };

        cleanupUnverifiedUsers();

        
        const otpExpiryTime = 5 * 60 * 1000; 
        if (Date.now() - otpEntry.createdAt > otpExpiryTime) {
            return res.render('user/otp', { message: 'OTP has expired. Please request a new OTP.' });
        }

        
        if (otpEntry.otp === otp) {
            await userModel.updateOne({ email }, { $set: { status: "active" } });
            await OtpModel.deleteOne({ email }); 
            req.session.tempEmail = null; 
            return res.status(200).json({ success: true, message: 'OTP verified successfully!' });
        } else {
            return res.status(400).json({ success: false, message: 'Incorrect OTP. Please try again.' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).render('user/otp', { message: 'Something went wrong. Please try again later.' });
    }
};

const resendOTP = async (req, res) => {
    const email = req.session.tempEmail;
    if (!email) {
        return res.status(400).json({ success: false, message: 'Email not found in session.' });
    }

    try {
        const otp = Math.floor(1000 + Math.random() * 9000);
        const createdAt = new Date(); 

       
        await OtpModel.updateOne({ email }, { otp, createdAt });

        
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Registration OTP',
            text: `Your new OTP for registration is: ${otp}. It is valid for 5 minutes.`,
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
        console.error(error);
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
            req.flash('error', 'All fields are required');
            return res.redirect('/login');
        }
        const user = await userModel.findOne({ email })
        if (!user) {
            req.flash('error', 'User does not exist');
            return res.redirect('/login')
        }
        if (user.status == "blocked") {
            req.flash('error', 'User is Blocked');
            return res.redirect('/login')
        }
        const isMatch = await bcrypt.compare(password, user.password)
        if (!isMatch) {
            req.flash('error', 'Incorrect password');
            return res.redirect('/login')
        }
        req.session.user = { email, id: user._id  }
        req.flash('success', 'Login successful');
        res.redirect('/')

    } catch (error) {
        console.error('Error during login:', error);
        req.flash('error', 'Something went wrong');
        res.redirect('/login')
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


// get homepage
const loadHome = async (req, res) => {
    console.log(req.session.user)
    const users = await userModel.find({ status: "active" })
    const products = await productModel.find({}).lean().sort({updatedAt : -1}).limit(6)
    const categories = await categoryModel.find().lean()
    res.render('user/home', { users, products, categories })
}

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