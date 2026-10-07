# Friending

## Purpose

Enable interactions that require mutual agreement between users.

## Principle

After one user sends another user a friend request, they become friends if the recipient accepts it, and remain friends until either user removes the friendship.

## Types

```types
external User
  A user who can form friendships with other users.
```

## State

```state
a set of FriendRequests with
  a sender User
  a recipient User
  Rule: each sender and recipient pair is unique

a set of Friendships with
  a user1 User
  a user2 User
  Rule: user1 and user2 are different
  Rule: at most one friendship exists between any pair of users regardless of order
```

## Actions

```actions
request(sender: User, recipient: User) : returns (request: FriendRequest)
  where sender is not recipient, no friend request exists between sender and recipient in either direction, and no friendship exists between sender and recipient
  then
    add a new friend request with sender and recipient
    returns request
  where sender is recipient or a friend request or friendship already exists between sender and recipient
  then
    refuses CANNOT_REQUEST "A friend request cannot be created between these users."

accept(recipient: User, request: FriendRequest) : returns (friendship: Friendship)
  where request is in FriendRequests and request has recipient
  then
    remove request
    add a new friendship with request.sender as user1 and recipient as user2
    returns friendship
  where request is not in FriendRequests or request does not have recipient
  then
    refuses CANNOT_ACCEPT "This friend request cannot be accepted."

reject(recipient: User, request: FriendRequest) : returns (request: FriendRequest)
  where request is in FriendRequests and request has recipient
  then
    remove request
    returns request
  where request is not in FriendRequests or request does not have recipient
  then
    refuses CANNOT_REJECT "This friend request cannot be rejected."

remove(user: User, friendship: Friendship) : returns (friendship: Friendship)
  where friendship is in Friendships and user is one of the users in friendship
  then
    remove friendship
    returns friendship
  where friendship is not in Friendships or user is not one of the users in friendship
  then
    refuses CANNOT_REMOVE "This friendship cannot be removed by this user."
```

## Queries

```queries
_requests() : many (request: FriendRequest, sender: User, recipient: User)
  Answers every friend request, and no rows when there are none.

_friendships() : many (friendship: Friendship, user1: User, user2: User)
  Answers every friendship, and no rows when there are none.
```