const express = require('express');
const router = express.Router();
const adminAuth = require('../middleware/adminAuth')
const categoryMulter = require('../config/categoryMulter')
const productMulter = require('../config/productMulter')
const homeController = require('../controller/adminController');
const userController = require('../controller/userController');
const categoryController = require('../controller/categoryController');
const productController = require('../controller/productController');
const orderController = require('../controller/orderController');
const couponController = require('../controller/couponController');
const offerController = require('../controller/offerController');
const walletController = require('../controller/walletController');


// Admin Login, Logout, Homepage

router.get('/login',  homeController.loadLogin) //adminAuth.isLogin,
router.post('/login', homeController.login)
router.get('/logout', adminAuth.checkSession, homeController.logout)
router.get('/dashboard', adminAuth.checkSession, homeController.loadDashboard)

router.get('/sales-report', adminAuth.checkSession, homeController.loadSalesReport)
router.get('/sales-report-download',adminAuth.checkSession, homeController.downloadSalesReport)
router.get('/sales-report-data',adminAuth.checkSession, homeController.getSalesReport)






// User Management (List user, block/unblock, )
router.get('/customers', adminAuth.checkSession, userController.customers)
router.patch('/status', adminAuth.checkSession, userController.statusUpdate);



//Category Management (Add, Edit, SoftDelete)
router.get('/category', adminAuth.checkSession, categoryController.category)
router.get('/add-category', adminAuth.checkSession, categoryController.loadAddCategory)
router.post('/add-category', adminAuth.checkSession, categoryMulter.upload.single('image'), categoryController.addCategory)
router.get('/edit-category/:id', adminAuth.checkSession, categoryController.loadEditCategory) 
router.post('/edit-category/:id', adminAuth.checkSession, categoryMulter.upload.single('image'), categoryController.editCategory) 
router.post('/delete-category/:id', adminAuth.checkSession, categoryController.deleteCategory);



//Products Management (Add, Edit, SoftDelete)
router.get('/products', adminAuth.checkSession, productController.products)
router.get('/products/search', productController.searchProduct)
router.get('/add-products', productController.loadAddProducts)  //adminAuth.checkSession,
router.post('/add-products', productMulter.upload.array('images', 10), productController.addProducts) 
router.get('/edit-products/:id', adminAuth.checkSession,  productController.loadEditProducts)  // rendering template
router.get('/edit-products/:id/images', adminAuth.checkSession,  productController.getProductImages)  // fetch & send json for product images
router.post('/edit-products/:id', adminAuth.checkSession, productMulter.upload.array('images', 10), productController.editProducts)   
router.patch('/delete-product', adminAuth.checkSession, productController.deleteProduct);


//----------------------------------



// Order Management
router.get('/orders',adminAuth.checkSession, orderController.LoadAdminOrders);
router.get('/order-detail/:id',adminAuth.checkSession, orderController.LoadOrderDetail);
router.post("/update-order-status/:orderId/:productId",adminAuth.checkSession, orderController.updateOrderStatus)



// coupons
router.get('/coupons',adminAuth.checkSession, couponController.LoadCoupons);
router.patch('/coupons/update-status/:id', couponController.CouponStatus);
router.delete('/coupons/delete/:couponId', couponController.DeleteCoupon);
router.get('/add-coupons',adminAuth.checkSession, couponController.LoadAddCoupons);
router.post('/add-coupons',adminAuth.checkSession, couponController.AddCoupons);
router.get('/edit-coupons/:id',adminAuth.checkSession, couponController.LoadEditCoupons);
router.put('/edit-coupons/:id',adminAuth.checkSession, couponController.EditCoupons);


//Offers
router.get('/offers',adminAuth.checkSession, offerController.LoadOffers);
router.patch('/offers/update-status/:id', offerController.OfferStatus);
router.delete('/offers/delete/:offerId', offerController.DeleteOffer);
router.get('/add-offers',adminAuth.checkSession, offerController.LoadAddOffers);
router.post('/add-offers',adminAuth.checkSession, offerController.AddOffers);
router.get('/edit-offer/:id',adminAuth.checkSession, offerController.LoadEditOffers);
router.put('/edit-offer/:id',adminAuth.checkSession, offerController.EditOffers);


//wallet
router.get('/wallet',adminAuth.checkSession, walletController.LoadAllWallets);






module.exports = router;