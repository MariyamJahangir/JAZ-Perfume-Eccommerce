const userModel = require('../../model/userModel')
const addressModel = require('../../model/addressModel')

//get address
const LoadAddress = async (req, res) => {
    try {
      const userId = req.session.user.id;
      const user = await userModel.findById(userId).populate("address").lean();
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      res.render('user/address', { user });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'An error occurred while showing the Edit profile' });
    }
  }



  const AddAddress = async (req, res) => {
    try {
      const { firstname, lastname, address, locality, pincode, district, state, phone, country } = req.body;
  
      if (!req.session?.user?.id) {
        return res.status(401).json({ error: 'Unauthorized: User not logged in' });
      }
  
      const userId = req.session.user.id;
      const user = await userModel.findById(userId);
  
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
  
      const userAddress = new addressModel({
        firstname,
        lastname,
        address,
        locality,
        pincode,
        district,
        state,
        phone,
        country,
        user: user._id,
      });
  
      const savedAddress = await userAddress.save();
  
      // Ensure `address` is an array before pushing
      if (!Array.isArray(user.address)) {
        user.address = [];
      }
      user.address.push(savedAddress._id);
  
      await user.save();
  
      res.status(201).json({ message: 'Address added successfully', address: savedAddress });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'An error occurred while adding the address' });
    }
  };
  
  const updateAddress = async (req, res) => {
    try {
      const { addressId } = req.params;
      const updatedData = req.body;
  
  
  
      // Ensure the update only modifies specified fields
      const updatedAddress = await addressModel.findByIdAndUpdate(
        addressId,
        { $set: updatedData }, // Ensure all provided fields are set properly
        { new: true, runValidators: true } // Ensure the updated document is returned and validated
      );
  
  
  
      if (!updatedAddress) {
        return res.status(404).json({ success: false, message: "Address not found!" });
      }
  
      res.json({ success: true, message: "Address updated successfully!", updatedAddress });
    } catch (error) {
      console.error("Error updating address:", error);
      res.status(500).json({ success: false, message: "Internal Server Error" });
    }
  };
  
  
  const deleteAddress = async (req, res) => {
    try {
      const addressId = req.params.id;
      await addressModel.findByIdAndUpdate(addressId, { deleted: true });
  
      res.json({ success: true, message: "Address soft deleted successfully" });
    } catch (error) {
      console.error("Error deleting address:", error);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  };
  

  module.exports = {
    LoadAddress,
    AddAddress,
    updateAddress,
    deleteAddress

  }