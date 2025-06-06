
const mongoose = require('mongoose');

const connectDB = async () => { 
    try {
        //const conn = await mongoose.connect(`mongodb://${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`);
        const conn = await mongoose.connect(`${process.env.DB_URL}`);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.log(error);
        process.exit(1);
    }
}

module.exports = connectDB