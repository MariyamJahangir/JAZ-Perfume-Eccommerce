const userModel = require('../../model/userModel')
const addressModel = require('../../model/addressModel')
const productModel = require('../../model/productModel')
const cartModel = require('../../model/cartModel')
const orderModel = require('../../model/orderModel')
const bcrypt = require('bcrypt')


// get profile
const LoadProfile = async (req, res) => {
  const user = await userModel.findOne({ email: req.session.user.email }).lean();
  res.render('user/profile', { user })
}

const profileUpdate = async (req, res) => {
  try {
    const { firstname, lastname, gender, email, phone } = req.body;
    const userId = req.session.user.id; // Ensure the user is authenticated


    // Fetch the current user details
    const existingUser = await userModel.findById(userId);
    if (!existingUser) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    let emailChanged = existingUser.email !== email;
    // Check if email is changed
    if (emailChanged) {
      const existingEmailUser = await userModel.findOne({ email });

      if (existingEmailUser) {
        return res.status(400).json({ success: false, message: "Email is already in use by another user." });
      }
    }
    // Update other fields
    existingUser.firstname = firstname;
    existingUser.lastname = lastname;
    existingUser.gender = gender;
    existingUser.phone = phone;
    existingUser.email = email;
    // Save the updated user
    const updatedUser = await existingUser.save();

    if (!updatedUser) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // If email was changed, just send a message to redirect to logout page
    if (emailChanged) {
      return res.json({
        success: true,
        message: "Email updated successfully. Please log in again.",
        logout: true // Let the client know to redirect to logout page
      });
    } else {
      res.json({
        success: true,
        message: "Profile updated successfully",
        user: updatedUser
      });
    }
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};




const LoadPassword = async (req, res) => {
  const user = await userModel.findOne({ email: req.session.user.email }).lean();
  res.render('user/change-password', {user})
}

const ChangePassword = async (req, res) => {
  const {OldPassword, password} = req.body;
  const exists = await userModel.findOne({_id: req.session.user.id});
  if (!exists) {
      return res.status(404).json({success: false, message: `User not found`});
  }
  
  const comparePassword = await bcrypt.compare(OldPassword, exists.password);

  if (!comparePassword) {
      return res.status(400).json({success: false, message: "Current password is incorrect"});
  }
  const salt = await bcrypt.genSalt(10);
  const hashed_password = await bcrypt.hash(password, salt);

  
    await userModel.updateOne({_id: req.session.user.id}, {$set: {password: hashed_password}});
    return res.status(200).json({success: true, message: "Password updated successfully"});
  

  
};














module.exports = {
  LoadProfile,
  profileUpdate,
  LoadPassword,
  ChangePassword
 

}