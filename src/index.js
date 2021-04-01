import express from 'express';
import path from 'path';
import cors from 'cors';
import bodyParser from 'body-parser';
import passport from 'passport';
import GitLabStrategy from 'passport-gitlab2';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { startNodeJSWiki } from './wiki';

require('dotenv').config();

const port = process.env.PORT || 8000;
const validUserName = 'linonetwo';
let isValidUser = false;

const app = express();
app.use(cors());
app.use('/static', express.static(path.join(__dirname, '..', 'static')));
app.use(bodyParser.json());

app.use(passport.initialize());
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
      // TODO: use session manager to prevent multiple user interference with each other
      isValidUser = accessToken && profile?.username === validUserName;
      // DEBUG: console
      console.log(`profile`, JSON.stringify(profile, undefined, '  '));
      // DEBUG: console
      console.log(`accessToken, refreshToken,`, accessToken, refreshToken);
      cb(undefined, accessToken);
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
  if (isValidUser) {
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

app.set('port', port);
app.listen(app.get('port'), () => console.log(`Server is running on port ${app.get('port')}`));
