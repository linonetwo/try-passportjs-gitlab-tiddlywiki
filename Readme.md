# Try run tiddlywiki editable instance behind an oAuth2

Use passportjs and its `passport-gitlab2` Strategy.

## Config Gitlab

Goto [https://gitlab.com/oauth/applications](https://gitlab.com/oauth/applications) fill in the form.

![gitlabapp](docs/gitlabapp.png)

Callback URL should be `http://localhost:8000/auth/gitlab/callback/` instead of simply `http://localhost:8000/`, otherwise it will say `The redirect URI included is not valid`.
