const mongoose = require('mongoose');


const generateTransactionId = () => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let transactionId = '';
    for (let i = 0; i < 10; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        transactionId += characters[randomIndex];
    }
    return transactionId;
};

const transactionSchema = mongoose.Schema({
    transactionId: {
        type: String,
        unique: true, 
        default: generateTransactionId,
        required:true,
    },
    amount: {
        type: Number,
        required: true
    },
    type: {
        type: String,
        enum: ['Credit', 'Debit'],
        required: true
    },
    description: {
        type: String,
        required: true
    }
}, { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } });


const walletSchema = mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    balance: {
        type: Number,
        default: 0
    },
    transactions: {
        type: [transactionSchema],
        default: []
    },
}, { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } });


mongoose.model('Transaction', transactionSchema);

walletSchema.pre('save', function(next) {
 
    for (const transaction of this.transactions) {
        if (!transaction.transactionId) {
            transaction.transactionId = generateTransactionId();
        }
    }
    next();
});

module.exports = mongoose.model('Wallet', walletSchema);