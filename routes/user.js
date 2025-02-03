const express = require('express');
const router = express.Router();
const homeController = require('../controller/user/homeController')
const productController = require('../controller/user/productController')
const profileController = require('../controller/user/profileController')
const addressController = require('../controller/user/addressController')
const cartController = require('../controller/user/cartController')
const auth = require('../middleware/auth')
const passport = require('passport')


//Users sign up & login with validation. // Sign up using OTP with OTP timer and Resend Otp
router.get('/signup', auth.checkSession, homeController.loadRegister)
router.post('/signup', homeController.registerUser)  
router.get('/otp',  homeController.otp)
router.post('/otp',  homeController.verifyOTP)
router.post('/otp/resend', homeController.resendOTP);
router.get('/login',auth.checkSession,  homeController.loadLogin)
router.post('/login', homeController.login)
router.get('/logout', homeController.logout)
router.get('/forget-password',auth.checkSession, homeController.forgetPassword)
router.post('/forget-password', homeController.forget)
router.get('/forget-otp', homeController.forgetOtp)
router.post('/forget-otp-resend', homeController.forgetOtpResend)
router.post('/forget-verify-otp', homeController.forgetVerifyOtp)
router.get('/reset-password', homeController.resetPassword)
router.post('/reset-password', homeController.resetPass)

// Login or signup with single sign on Google
router.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/auth/google/callback', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
   // req.session.user={email: req.user.email};
    req.session.user={email: req.user.email, id: req.user.id};
    res.redirect('/user/home'); }
);


// Users homepage
router.get('/home',auth.isLogin, homeController.loadHome)  //



//List products on the user side
router.get('/all-products', productController.allProducts)  //auth.isLogin,
router.get('/product-details/:id', auth.isLogin, productController.productDetails)




// --------------------------
router.get('/contact', auth.isLogin, homeController.contact)

//----------------------------




// profile
router.get('/profile',auth.isLogin, profileController.LoadProfile)
router.put("/profile-update",auth.isLogin, profileController.profileUpdate)


//address
router.get('/address',auth.isLogin, addressController.LoadAddress)
router.post('/address', addressController.AddAddress)
router.put("/update-address/:addressId", addressController.updateAddress);
router.delete("/delete-address/:id", addressController.deleteAddress)


router.get('/orders', profileController.LoadOrders)
router.get('/order-detail', profileController.OrderDetail)

// cart
router.get('/cart', auth.isLogin, cartController.LoadCart)
router.post('/cart/add', cartController.AddToCart)
router.post("/cart/increase/:cartItemId", cartController.increaseCart)
router.post("/cart/decrease/:cartItemId", cartController.decreaseCart)
router.delete("/cart/remove/:cartItemId", cartController.removeProduct)
router.get('/checkout', cartController.LoadCheckout)


router.post("/place-order", profileController.PlaceOrder)
router.get('/order-placed', profileController.OrderPlaced)







module.exports = router;