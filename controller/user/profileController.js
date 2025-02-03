const userModel = require('../../model/userModel')
const addressModel = require('../../model/addressModel')
const productModel = require('../../model/productModel')
const cartModel = require('../../model/cartModel')
const orderModel = require('../../model/orderModel')


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











// get Orders
const LoadOrders = (req, res) => {
  res.render('user/orders')
}

const OrderDetail = (req, res) => {
  res.render('user/order-detail')
}





const OrderPlaced = (req, res) => {
  res.render('user/order-placed')
}


const PlaceOrder = async (req, res) => {
  try {
      const { addressId, paymentMethod, totalPrice, cartItems } = req.body;
      const userId = req.session.user._id; // Assuming user session is stored

      // Fetch the selected address
      const user = await userModel.findById(userId);
      const selectedAddress = user.address.find(addr => addr._id.toString() === addressId);

      if (!selectedAddress) {
          return res.json({ success: false, message: "Invalid address selected" });
      }

      // Create a new order
      const newOrder = new Order({
          userId,
          items: cartItems,
          totalAmount: totalPrice,
          shippingAddress: selectedAddress,
          paymentMethod,
          status: "Pending" // Initial status
      });

      await newOrder.save();
      await Cart.deleteOne({ userId }); // Clear cart after order placement

      res.json({ success: true, message: "Order placed successfully" });
  } catch (error) {
      console.error("Order placement error:", error);
      res.json({ success: false, message: "Order placement failed" });
  }
}


module.exports = {
  LoadProfile,
  profileUpdate,
  LoadOrders,
  OrderDetail,
 
  OrderPlaced,
  PlaceOrder
}