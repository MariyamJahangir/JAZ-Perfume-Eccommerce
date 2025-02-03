const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../model/userModel');

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await User.findOne({ email: profile.emails[0].value });

       
        if (!user) {
          user = new User({
            firstName: profile.name.givenName,
            lastName: profile.name.familyName,
            email: profile.emails[0].value,
            googleId: profile.id, 
            isBlocked: false,
          });
          await user.save();
          return done(null, user); 
        }

        if (user.isBlocked) {
          return done(null, false, { message: 'Your account is blocked.' });
        }


        return done(null, user);
        
      } catch (err) {
        console.error('Error during Google login:', err); 
        return done(err, null);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.id); 
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);

    if (!user) {
      return done(new Error('User not found'), null); 
    }

    done(null, user); 
  } catch (err) {
    console.error('Error deserializing user:', err); 
    done(err, null);
  }
});


module.exports = passport;