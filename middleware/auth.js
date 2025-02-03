const userModel = require('../model/userModel')

const checkSession = (req, res, next) => {
    if (req.session.user) {
        return res.redirect('/user/home');
    }
    next();
};


const isLogin = (req, res, next) => {
    if (req.session.user) {
        next();
    } else {
        return res.redirect('/user/login');
    }
}



// const checkSession = async (req, res, next) => {
//     if (req.session.user) {
//         try {
//             const user = await userModel.findById(req.session.user.id);
//             if (user && user.status=='blocked') {
//                 req.session.destroy((err) => {
//                     if (err) {
//                         console.error('Error destroying session:', err);
//                     }
//                     return res.redirect('/user/login');
//                 });
//             } else {
//                 return res.redirect('/user/home');
//             }
//         } catch (err) {
//             console.error('Error checking user session:', err);
//             return res.redirect('/user/login');
//         }
//     } else {
//         next();
//     }
// };

// const isLogin = async (req, res, next) => {
//     if (req.session.user) {
//         try {

//             const user = await userModel.findById(req.session.user.id);

//             if (user && user.status == "blocked") {
//                 req.session.destroy((err) => {
//                     if (err) {
//                         console.error('Error destroying session:', err);
//                     }
//                     return res.redirect('/user/login');
//                 });
//             } else {
//                 next();
//             }
//         } catch (err) {
//             console.error('Error checking user login:', err);
//             return res.redirect('/user/login');
//         }
//     } else {
//         return res.redirect('/user/login');
//     }
// };





module.exports = { checkSession, isLogin }