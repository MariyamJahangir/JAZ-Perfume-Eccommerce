const userModel = require('../model/userModel')

const checkSession = (req, res, next) => {
    if (req.session.user) {
        return res.redirect('/');
    }
    next();
};


const isLogin = (req, res, next) => {
    if (req.session.user) {
        next();
    } else {
        return res.redirect('/login');
    }
}




module.exports = { checkSession, isLogin }