const express = require('express');
const router = express.Router();
const adminAuth = require('../middleware/adminAuth')
const categoryMulter = require('../config/categoryMulter')
const productMulter = require('../config/productMulter')
const homeController = require('../controller/admin/homeController');
const userController = require('../controller/admin/userController');
const categoryController = require('../controller/admin/categoryController');
const productController = require('../controller/admin/productController');
const orderController = require('../controller/admin/orderController');


// Admin Login, Logout, Homepage

router.get('/login',  homeController.loadLogin) //adminAuth.isLogin,
router.post('/login', homeController.login)
router.get('/logout', adminAuth.checkSession, homeController.logout)
router.get('/dashboard', adminAuth.checkSession, homeController.loadDashboard)


// User Management (List user, block/unblock, )
router.get('/customers', adminAuth.checkSession, userController.customers)
router.patch('/status', adminAuth.checkSession, userController.statusUpdate);



//Category Management (Add, Edit, SoftDelete)
router.get('/category', adminAuth.checkSession, categoryController.category)
router.get('/add-category', adminAuth.checkSession, categoryController.loadAddCategory)
router.post('/add-category', adminAuth.checkSession, categoryMulter.upload.single('image'), categoryController.addCategory)
router.get('/edit-category/:id',  categoryController.loadEditCategory) //adminAuth.checkSession,
router.post('/edit-category/:id',  categoryMulter.upload.single('image'), categoryController.editCategory) //adminAuth.checkSession,
router.post('/delete-category/:id', adminAuth.checkSession, categoryController.deleteCategory);



//Products Management (Add, Edit, SoftDelete)
router.get('/products', adminAuth.checkSession, productController.products)
router.get('/add-products', productController.loadAddProducts)  //adminAuth.checkSession,
router.post('/add-products', productMulter.upload.array('images', 10), productController.addProducts) 
router.get('/edit-products/:id', adminAuth.checkSession,  productController.loadEditProducts)  // rendering template
router.get('/edit-products/:id/images', adminAuth.checkSession,  productController.getProductImages)  // fetch & send json for product images
router.post('/edit-products/:id', adminAuth.checkSession, productMulter.upload.array('images', 10), productController.editProducts)   
router.patch('/delete-product', adminAuth.checkSession, productController.deleteProduct);


//----------------------------------




router.get('/orders', orderController.LoadOrders);
router.get('/order-detail/:id', orderController.LoadOrderDetail);
router.post("/update-order-status/:orderId/:productId",orderController.updateOrderStatus)




module.exports = router;