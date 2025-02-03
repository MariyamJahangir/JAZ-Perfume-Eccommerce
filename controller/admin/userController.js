const userModel = require('../../model/userModel')

// Get Users List
const customers = async (req, res) => {
    try {
        const users = await userModel.find().lean()
        res.render('admin/customers', { users })
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).send('Something went wrong.');
    }
}

// Patch Block/Unblock User
const statusUpdate = async (req, res) => {
    try {
        const { id, status } = req.body;
        const user = await userModel.findByIdAndUpdate(id, { status }, { new: true });
        res.json({ success: true, status: user.status });
    } catch (error) {
        console.error('Error updating user status:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
}



module.exports ={
    customers,
    statusUpdate,
    //deleteUser
}