const adminModel = require('../../model/adminModel')
const bcrypt = require('bcrypt')
const userModel = require('../../model/userModel')
const moment = require('moment');




// Get Login
const loadLogin = async (req, res) => {
    res.render('admin/login')
}

// Post Login
const login = async (req, res) => {
    try {
        const { email, password } = req.body
        // Validate input fields
        if (!email || !password) {
            return res.render('admin/login', { message: 'Email and password are required' });
        }
        const admin = await adminModel.findOne({ email })
        if (!admin) return res.render('admin/login', { message: 'No admin is found with the email' })
        const isMatch = await bcrypt.compare(password, admin.password)
        if (!isMatch) return res.render('admin/login', { message: 'Incorrect Password' })
        req.session.admin = true
        res.redirect('/admin/dashboard')
    } catch (error) {
        res.send(error)
    }
}







// Get Logout
const logout = (req, res) => {
    req.session.admin = null
    res.redirect('/admin/login')
}

// Get Homepage (dashboard)
const loadDashboard = async (req, res) => {
    // try {
    //     const admin = req.session.admin
    //     if (!admin) return res.redirect('/admin/login')
    //     const users = await userModel.find({})
    // res.render('admin/dashboard', { users })
    // } catch (error) {
    // }
    res.render('admin/dashboard')
}


module.exports = {
    loadLogin,
    login,
    loadDashboard,
    logout

}