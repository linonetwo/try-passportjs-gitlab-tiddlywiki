import express from 'express';
import path from 'path';
import cors from 'cors';
import bodyParser from 'body-parser';
import passport from 'passport';
import GitLabStrategy from 'passport-gitlab2';

import authRoutes from './server/routes/auth';
import getLocalSignupStrategy from './server/passport/local-signup';
import getLocalLoginStrategy from './server/passport/local-login';

require('dotenv').config();

const app = express();
app.use(cors());
app.use('/', express.static(path.join(__dirname, '..', 'static')));
app.use(bodyParser.json());

app.use(passport.initialize());

class User {
  constructor(email, password, name) {
    this.email = email;
    this.password = password;
    this.name = name;
  }
}
passport.use('local-signup', getLocalSignupStrategy(User));
passport.use('local-login', getLocalLoginStrategy(User));

passport.use(
  new GitLabStrategy(
    {
      clientID: process.env.GITLAB_APP_ID,
      clientSecret: process.env.GITLAB_APP_SECRET,
      callbackURL: 'http://localhost:8000/auth/gitlab/callback',
    },
    function (accessToken, refreshToken, profile, cb) {
      // DEBUG: console
      console.log(`profile`, profile);
      cb(undefined, profile);
      // User.findOrCreate({ gitlabId: profile.id }, function (err, user) {
      //   return cb(err, user);
      // });
    }
  )
);

app.get('/auth/gitlab', passport.authenticate('gitlab'));

app.get(
  '/auth/gitlab/callback',
  passport.authenticate('gitlab', {
    failureRedirect: '/login',
  }),
  function (req, res) {
    // Successful authentication, redirect home.
    res.redirect('/');
  }
);

app.use('/auth/local', authRoutes);

app.set('port', process.env.PORT || 8000);
app.listen(app.get('port'), () => console.log(`Server is running on port ${app.get('port')}`));
