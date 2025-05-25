const userModel = require('../model/userModel')
const walletModel = require('../model/walletModel')
const Razorpay = require('razorpay');
const crypto = require('crypto');



const LoadWallet = async (req, res) => {
    try {
        const userId = req.session.user.id;
        const user = await userModel.findById({ _id: userId }).lean();
        let wallet = await walletModel.findOne({ userId: userId }).lean();

        if (!wallet) {
            wallet = new walletModel({ userId: userId, balance: 0, transactions: [] });
            await wallet.save();
        }

        // Pagination setup
        const page = parseInt(req.query.page) || 1;
        const perPage = 5;
        const totalTransactions = wallet.transactions.length;
        const totalPages = Math.ceil(totalTransactions / perPage);

        // Sort and paginate
        const sortedTransactions = wallet.transactions.sort(
            (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        );

        const paginatedTransactions = sortedTransactions.slice(
            (page - 1) * perPage,
            page * perPage
        );

        // Replace transactions with paginated ones
        wallet.transactions = paginatedTransactions;

        res.status(200).render('user/wallet', {
            user,
            wallet,
            currentPage: page,
            totalPages,
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};



const razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

const createOrder = async (req, res) => {
    try {
        const { amount } = req.body;
        const order = await razorpayInstance.orders.create({
            amount: amount * 100, // in paise
            currency: 'INR',
            receipt: 'wallet_' + new Date().getTime()
        });

        res.json({ success: true, order, key: process.env.RAZORPAY_KEY_ID });
    } catch (err) {
        console.error(err);
        res.json({ success: false, message: "Order creation failed" });
    }
};


const verifyPayment = async (req, res) => {
    try {
        const { response, amount } = req.body;
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = response;

        const sign = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(sign)
            .digest('hex');

        if (expectedSignature === razorpay_signature) {
            // ✅ Verified, now update wallet
            const userId = req.session.user.id;
            const wallet = await walletModel.findOne({ userId });

            const transaction = {
                amount,
                type: 'Credit',
                description: 'Wallet Top-Up via Razorpay'
            };

            if (wallet) {
                wallet.balance += Number(amount);
                wallet.transactions.push(transaction);
                await wallet.save();
            } else {
                await walletModel.create({
                    userId,
                    balance: amount,
                    transactions: [transaction]
                });
            }

            return res.json({ success: true });
        } else {
            return res.status(400).json({ success: false, message: "Invalid signature" });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Server error" });
    }
};




const LoadAllWallets = (req, res)=>{
    res.status(200).render('admin/wallet');
}


module.exports = {
    LoadWallet,
    createOrder,
    verifyPayment,

    LoadAllWallets
}