const express = require('express');
const app = express();  
const userRoutes = require('./routes/user')
const adminRoutes = require('./routes/admin')
const path = require('path');
// const { connect } = require('http2');
const connectDB = require('./db/connectDB');
const session = require('express-session')
const nocache = require('nocache')
const bodyParser = require('body-parser');
const flash = require('connect-flash');
const exphbs = require('express-handlebars');
const multer = require('multer');
const helpers = require('./helpers/helpers');
const config = require('./config')
const passport = require('./config/passport')
const qs = require('qs');


app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, 'public')));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');
app.engine(
    'hbs',
    exphbs.engine({
        extname: 'hbs',
        defaultLayout: 'layout',
        layoutsDir: path.join(__dirname, 'views', 'layout'),
        partialsDir: path.join(__dirname, 'views', 'partials'),
        helpers: helpers
    })
);

// app.use(express.static('public'));
app.use(nocache());
app.use(session({
    secret: config.session.secret,
    resave: false,
    saveUninitialized: true,
    cookie:{
        maxAge: 1000*60*60*24
    }
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}))
app.use(express.json()) 

// Middleware to parse flat form data into nested objects
app.use((req, res, next) => {
    if (req.is('application/x-www-form-urlencoded')) {
        req.body = qs.parse(req.body); // Transform flat keys to nested structure
    }
    next();
});

app.use(flash());
app.use((req, res, next) => {
    res.locals.successMessage = req.flash('success');
    res.locals.errorMessage = req.flash('error');
    next();
});


app.use(passport.initialize());
app.use(passport.session());


// Handle errors from Multer
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        res.status(400).json({ message: err.message });
    } else if (err) {
        res.status(400).json({ message: err.message });
    } else {
        next();
    }
});


// // centralized error-handling middleware to provide consistent error responses
// app.use((err, req, res, next) => {
//     console.error(err.stack);
//     res.status(500).send('Internal Server Error');
// });



app.use('/', userRoutes)
app.use('/admin', adminRoutes)
app.use((req, res) => res.render('user/error', {title: "Error"}));

connectDB();

app.listen(config.app.port, () => {
    console.log(`Server running on port ${config.app.port} (${config.app.environment})`);
})