import express from 'express';
import path from 'path';
import cors from 'cors';
import bodyParser from 'body-parser';
import passport from 'passport';
import GitLabStrategy from 'passport-gitlab2';
import { createProxyMiddleware } from 'http-proxy-middleware';
import cookieSession from 'cookie-session';
import { startNodeJSWiki } from './wiki';

require('dotenv').config();

const port = process.env.PORT || 8000;

const app = express();
app.set('trust proxy', 1); // trust first proxy
app.use(cors());
app.use('/static', express.static(path.join(__dirname, '..', 'static')));
app.use(bodyParser.json());

// tiddlywiki related auth info, only allow valid user to edit wiki
const validUserName = process.env.VALID_USER; // for example 'linonetwo';
const validUserAccessTokens = {}; // store accessToken from gitlab login, used to check user identity
const cookieName = 'tiddlywiki-auth';
// this will add a cookie to req.session
app.use(
  cookieSession({
    name: cookieName,
    keys: ['key1', 'key11'],
  })
);

// set up passportjs, we get user's name from trusted identity source, in this case, gitlab
app.use(passport.initialize());
app.use(passport.session());
// add `serializeUser` and `deserializeUser` otherwise there will be `Failed to serialize user into session`
passport.serializeUser(function (user, done) {
  done(null, user);
});
passport.deserializeUser(function (user, done) {
  done(null, user);
});

const gitlabCallbackPath = 'auth/gitlab/callback/';
passport.use(
  new GitLabStrategy(
    {
      clientID: process.env.GITLAB_APP_ID,
      clientSecret: process.env.GITLAB_APP_SECRET,
      callbackURL: `http://localhost:${port}/${gitlabCallbackPath}`,
      baseURL: 'https://gitlab.com/',
    },
    function (accessToken, refreshToken, profile, cb) {
      // if user is valid, we store the accessToken to local cache, and use it to check user later
      if (accessToken && profile?.username === validUserName) {
        validUserAccessTokens[accessToken] = true;

        // second argument will be added to req.user, so we can get information in middlewares later
        cb(undefined, { accessToken, userName: profile.username });
      } else {
        cb(new Error(`No a valid user ${profile?.username ?? '-'}`));
      }
    }
  )
);

app.get('/auth/gitlab', passport.authenticate('gitlab'));
app.get(
  `/${gitlabCallbackPath}`,
  passport.authenticate('gitlab', {
    failureRedirect: '/static/login.html',
  }),
  function (req, res) {
    // Successful authentication, redirect home.
    res.redirect('/');
  }
);

// skip tiddlywiki if is not login
app.use(function (req, res, next) {
  // if it is first time auth, we will get req.user, and no req.cookies
  if (req?.user?.accessToken in validUserAccessTokens && req?.user?.userName === validUserName) {
    // we add info to the cookie
    req.session.accessToken = req.user.accessToken;
    req.session.userName = req.user.userName;
    next();
  } else if (req.session.userName === validUserName && req.session.accessToken in validUserAccessTokens) {
    next();
  } else {
    res.redirect('/static/empty-wiki.html');
  }
});

// tiddlywiki
const tiddlyWikiConfig = { tiddlyWikiHost: '127.0.0.1', tiddlyWikiPort: 51112 };
app.use(
  createProxyMiddleware('/', {
    target: `http://${tiddlyWikiConfig.tiddlyWikiHost}:${tiddlyWikiConfig.tiddlyWikiPort}/`,
    changeOrigin: true,
    prependPath: false,
    ws: true,
  })
);
startNodeJSWiki(tiddlyWikiConfig);

app.set('host', '0.0.0.0');
app.set('port', port);
app.listen(app.get('port'), () => console.log(`Server is running on port ${app.get('port')}`));
