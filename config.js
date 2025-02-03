const dotenv = require('dotenv');
dotenv.config(); // Load variables from .env

module.exports = {
    app: {
        port: process.env.APP_PORT || 5000, 
        environment: process.env.NODE_ENV || 'development',
    },
    db: {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        name: process.env.DB_NAME,
    },
    session: {
        secret: process.env.SESSION_SECRET || 'default-secret',
    },

};