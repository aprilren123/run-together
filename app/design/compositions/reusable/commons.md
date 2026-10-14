# Signing in with Commons

Sam clicks "Sign in with Commons". On Commons, he allows the app once, and his browser comes back with a one-time code. The app's server trades the code with Commons for his Commons user and username, and he is signed in. His Commons password never reaches the app. CommonsFederating is Federating with a `CommonsProvider`, which builds the address of Commons' sign-in page and redeems each code. An app copies this composition with [accounts](accounts.md). RunTogether's frontend doesn't show a Commons button or callback page yet.

## Starting

The [start endpoint](reaction:reusable.commons.starting.StartCommons) calls `CommonsFederating.start`, which returns a new attempt and the address of Commons' sign-in page. The HTTP server moves the attempt into a second cookie, the sign-in cookie, which expires with the attempt ten minutes later, and the page sends the browser to the address. The finish and choose endpoints read the attempt from that cookie, so only the browser that started a sign-in can finish it. The address carries the attempt's nonce, which Commons sends back as `state`, and a hash of the attempt's verifier, which Commons keeps with the code it issues.

```endpoints
reusable.commons.starting.StartCommons at /auth/commons/start
```

## Finishing

Commons sends the browser to `/auth/commons/callback` with `code` and `state`. The callback page replaces that address with `/`, so reloading the page or going back doesn't post the code again, and posts both to the [finish endpoint](reaction:reusable.commons.finishing.FinishCommons). `CommonsFederating.finish` checks the attempt from the cookie and the nonce before it sends anything to Commons, then redeems the code with the attempt's verifier and returns the username Commons reported. Then one of two branches runs:

- `returning`: `CommonsFederating._user` returns the user linked to Sam's Commons user, whatever his email or username has become, and the endpoint starts a session for that user.
- `new`: nobody is linked yet. The endpoint registers Sam's Commons username with Registering, links his Commons user to the new user, and starts a session.

When Leo sends Sam a link that finishes a sign-in Leo started, Sam's browser doesn't hold Leo's attempt, so the request is refused by `CommonsFederating.finish` with `SIGN_IN_EXPIRED` before any request goes to Commons. A code Commons won't redeem, or a Commons that doesn't answer within ten seconds, is refused with `SIGN_IN_REFUSED`. A successful finish clears the sign-in cookie and sets the session cookie.

When someone already registered `sam` with a password, the `new` branch is refused by `Registering.register` with `USERNAME_TAKEN`, or with `INVALID_USERNAME` when the Commons username doesn't follow Registering's rule. The sign-in cookie stays, the page shows a username form, and Sam's choice is posted to the [choose endpoint](reaction:reusable.commons.finishing.ChooseUsername). When `CommonsFederating._linkable` returns true, that endpoint registers the chosen username, links it, and starts a session. When it returns false, because the attempt expired or Sam's Commons user was linked in another tab meanwhile, the request is refused with `SIGN_IN_EXPIRED`. `CommonsFederating.link` accepts any user, so a Commons account is linked to whichever user these two endpoints pass to it, and link doesn't check expiry, so it succeeds for an attempt that expires between `_linkable` and `link`.

```endpoints
reusable.commons.finishing.FinishCommons at /auth/commons/finish
reusable.commons.finishing.ChooseUsername at /auth/commons/choose
```

## Refusals and the two cookies

The HTTP server clears a cookie only when its endpoint succeeds, or when the answer is `UNAUTHORIZED`. Every refusal from CommonsFederating maps to `FORBIDDEN` instead, as `commonsHttp` beside the endpoints declares with the sign-in cookie, so a stale tab or Leo's link leaves Sam's sign-in cookie in place, and the page shows the username form only for `CONFLICT` and `INVALID_REQUEST`.

The server that serves the frontend must send `Referrer-Policy: no-referrer` with every page, so the callback address never leaves in a `Referer` header; RunTogether adds this with the callback page. The browser's history still lists the callback address, with its code. Commons issued that code for the hash of the verifier in Sam's attempt, which never leaves the server except to redeem it, so anyone who reads the code is refused with `SIGN_IN_REFUSED`. This is PKCE, from OAuth.

Signing in with Commons starts a session in the app, and withdrawing the app on Commons later doesn't end it. Two browsers choosing usernames for the same Commons account at the same moment can leave the second username registered and unlinked, because the engine doesn't undo `Registering.register` when `link` is refused. It takes two submissions within milliseconds of each other.
