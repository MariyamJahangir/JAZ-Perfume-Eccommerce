const express = require('express');
const router = express.Router();
const homeController = require('../controller/userHomeController')
const productController = require('../controller/productController')
const profileController = require('../controller/profileController')
const addressController = require('../controller/addressController')
const cartController = require('../controller/cartController')
const orderController = require('../controller/orderController')
const reviewController = require('../controller/reviewController')
const auth = require('../middleware/auth')
const passport = require('passport')
const couponController = require('../controller/couponController')
const paymentController = require('../controller/paymentController')
const wishlistController = require('../controller/wishlistController')
const walletController = require('../controller/walletController')
const referralController = require('../controller/referralController')


//Users sign up & login with validation. // Sign up using OTP with OTP timer and Resend Otp
router.get('/signup', auth.checkSession, homeController.loadRegister)
router.post('/signup', homeController.registerUser)  
router.get('/otp',  homeController.otp)
router.post('/verify-otp', auth.checkSession, homeController.verifyOTP)
router.post('/resend-otp', homeController.resendOTP);
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
    res.redirect('/'); }
);


// Users homepage
router.get('/', homeController.loadHome)  


//products
router.get('/all-products', productController.allProducts);
router.get('/product-details/:productId/:variantId',  productController.productDetails)  
router.post('/cart/add', auth.isLogin, productController.AddToCart)


//reviews
router.get('/order/check-purchase', auth.isLogin, reviewController.checkPurchase)
router.post('/review/add', auth.isLogin, reviewController.addReview)




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




// cart
router.get('/cart', auth.isLogin, cartController.LoadCart)
router.get('/cart/count', auth.isLogin, cartController.cartCount)
router.delete("/cart/remove/:cartItemId", cartController.removeProduct)
router.post("/cart/update-quantity", cartController.updateCartQuantity);

router.get('/checkout',auth.isLogin, cartController.LoadCheckout)




//coupons
router.post("/apply-coupon", auth.isLogin, couponController.ApplyCoupon)

//referral
router.get('/referral', auth.isLogin, referralController.getReferralCode)


//payment
router.post("/order/place",auth.isLogin, orderController.PlaceOrder)
router.post('/create-payment',auth.isLogin, paymentController.createRazorpayOrder)
router.post('/verify-payment',auth.isLogin, paymentController.verifyPayment)
router.get('/order-placed',auth.isLogin, orderController.OrderPlaced)
router.get('/order-failed',auth.isLogin, orderController.OrderFailed)


//orders
router.get('/orders',auth.isLogin, orderController.LoadOrders)
router.get('/order-detail/:orderId', auth.isLogin, orderController.OrderDetail)
router.post('/order/return/:orderId/:productId',auth.isLogin, orderController.ReturnOrder)
router.post('/order/cancel/:orderId/:productId/:variantId',auth.isLogin, orderController.CancelOrder)
router.get('/download-invoice/:orderId', orderController.downloadInvoice)
router.get('/orders/pendings',auth.isLogin, orderController.LoadOrderPending)



//password
router.get('/change-password',auth.isLogin, profileController.LoadPassword)
router.post('/change-password',auth.isLogin, profileController.ChangePassword)



//wishlist
router.get('/wishlist',auth.isLogin, wishlistController.LoadWishlist)
router.get('/wishlist/check/:productId/:variantId', auth.isLogin, wishlistController.CheckWishlist)
router.post('/wishlist/add', auth.isLogin, wishlistController.AddWishlist)
router.post('/wishlist/remove', auth.isLogin, wishlistController.RemoveWishlist)


//wallet
router.get('/wallet',auth.isLogin, walletController.LoadWallet)
router.post('/wallet/create-order', auth.isLogin, walletController.createOrder);
router.post('/wallet/verify-payment', auth.isLogin, walletController.verifyPayment);




module.exports = router;