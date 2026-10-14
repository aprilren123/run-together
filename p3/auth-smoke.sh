#!/usr/bin/env bash
# Exercises the auth endpoints of a running RunTogether backend with curl.
# Usage: p3/auth-smoke.sh http://127.0.0.1:3001
BASE="$1"
USER="smoke$(date +%s)"
PASS=0
FAIL=0

# call NAME EXPECTED_STATUS PATH JSON [COOKIE]
call() {
  local name="$1" expected="$2" path="$3" body="$4" cookie="$5"
  local headers body_out status
  headers=$(mktemp); body_out=$(mktemp)
  status=$(curl -s -o "$body_out" -D "$headers" -w '%{http_code}' -X POST "$BASE/api$path" \
    -H 'Content-Type: application/json' -H "Origin: $BASE" ${cookie:+-H "Cookie: $cookie"} -d "$body")
  LAST_COOKIE=$(grep -i '^set-cookie:' "$headers" | head -1 | sed -E 's/^[Ss]et-[Cc]ookie: ([^;]*).*/\1/')
  LAST_SET_COOKIE=$(grep -i '^set-cookie:' "$headers" | head -1 | tr -d '\r')
  local verdict="PASS"
  if [ "$status" = "$expected" ]; then PASS=$((PASS + 1)); else verdict="FAIL"; FAIL=$((FAIL + 1)); fi
  # Session values are secrets, so the log shows only the cookie's name and attributes.
  local shown_cookie
  shown_cookie=$(printf '%s' "$LAST_SET_COOKIE" | sed -E 's/(runtogether-(session|sign-in)=)[^;]+/\1<redacted>/')
  printf '[%s] %-55s POST /api%-18s expected %s got %s  body=%s%s\n' \
    "$verdict" "$name" "$path" "$expected" "$status" "$(sed -E 's/(state|code_challenge)=[^&"]+/\1=<redacted>/g' "$body_out")" "${shown_cookie:+  ($shown_cookie)}"
  rm -f "$headers" "$body_out"
}

echo "Backend: $BASE   test user: $USER"
echo

call "register a new user"                          200 /auth/register "{\"username\":\"$USER\",\"password\":\"sea-shells-42\"}"
SESSION="$LAST_COOKIE"
call "current user with the new session"            200 /auth/me '{}' "$SESSION"
call "logout"                                       200 /auth/logout '{}' "$SESSION"
call "current user with the logged-out session"     401 /auth/me '{}' "$SESSION"
call "logout again with the ended session"          401 /auth/logout '{}' "$SESSION"
call "login with the correct password"              200 /auth/login "{\"username\":\"$USER\",\"password\":\"sea-shells-42\"}"
SESSION2="$LAST_COOKIE"
call "current user after login"                     200 /auth/me '{}' "$SESSION2"
call "register with a too-short password"           400 /auth/register "{\"username\":\"${USER}b\",\"password\":\"short\"}"
call "register with an invalid username"            400 /auth/register '{"username":"a b","password":"sea-shells-42"}'
call "register a duplicate username"                409 /auth/register "{\"username\":\"$USER\",\"password\":\"other-password\"}"
call "login with a wrong password"                  401 /auth/login "{\"username\":\"$USER\",\"password\":\"guessed-password\"}"
call "login with an unknown username"               401 /auth/login '{"username":"nobody-here","password":"sea-shells-42"}'
call "current user with no session cookie"          401 /auth/me '{}'
call "current user with a made-up session"          401 /auth/me '{}' "__Host-runtogether-session=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
call "register with a non-text field"               400 /auth/register "{\"username\":\"${USER}c\",\"password\":12345678}"
call "start Commons sign-in (address + sign-in cookie)" 200 /auth/commons/start '{}'

echo
echo "Summary: $PASS passed, $FAIL failed"
[ "$FAIL" = 0 ]
