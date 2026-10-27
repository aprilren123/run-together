# Design Document

## 1. Project Overview

RunTogether is a social running app that helps friends discover opportunities to run together by sharing runs they already plan to do. Users can post upcoming runs, see their friends' plans, join runs, and coordinate adjustments without relying on separate group chats.

## 2. Evolution from P1

### Refining the original concepts

My P1 design focused on making existing running plans visible to friends and allowing them to coordinate without organizing a formal event. The final application keeps this core idea, but expands how users interact with shared runs.

- **Share Runs:** Originally focused on posting runs with time, distance, pace, and location. I added descriptions, editing, and cancellation so users can communicate more details and manage plans after posting them.
- **Join a Run:** Originally allowed friends to join an existing plan. I added the ability to leave runs and made participation more visible throughout the interface.
- **Flexible Planning:** Originally allowed friends to suggest adjustments within the owner's flexibility constraints. In P2, I simplified suggestions to start-time changes, then expanded them in P3 to support location, distance, pace, and description. Accepting a suggestion also automatically joins the suggester.

These changes came from considering what happens after a run is shared, especially when plans change or more people become involved.

### Separating responsibilities into concepts

I initially considered keeping participation and suggested changes directly within a run, but decided to separate them into independent concepts:

- **`RunPlanning`:** Stores the run's details and flexibility constraints.
- **`Joining`:** Tracks participation separately from the run itself.
- **`Friending`:** Manages friendships and supports run visibility.
- **`ChangeSuggesting`:** Handles proposed changes that require the owner's approval.

This separation keeps the owner in control of their run while allowing friends to participate and coordinate through synchronizations.

### Adding support for real-world coordination

As I implemented the original concepts, I realized that sharing and joining runs alone wouldn't cover every situation where friends need to coordinate.

- **Authentication:** Replaced demo-user switching with real accounts and sessions, including username/password and MIT Commons login.
- **Notifications:** Added updates for suggested changes, accepted or rejected suggestions, and edited or canceled runs so users don't have to repeatedly check their plans.
- **Commenting:** Added informal discussion for questions about meeting points or routes. I kept this separate from `ChangeSuggesting` because comments shouldn't directly modify a run.
- **Direct invitations:** Designed an `Inviting` concept so run owners can invite specific friends instead of relying entirely on discovery through the Home feed. Invitations have their own pending, accepted, and declined states, separate from actual participation.

I intentionally kept these features focused on coordinating runs rather than expanding the app into a full messaging or scheduling platform.

## 3. Evolution from P3: Visual and Interaction Design

### Improving navigation

As I developed the frontend, I realized that discovering runs and managing existing commitments were different tasks. I separated the interface into:

- **Home:** Upcoming runs from friends that the user hasn't joined.
- **My Runs:** Runs the user is hosting or participating in.
- **Friends:** User discovery, friend requests, and friendships.
- **Profile:** Account information and running statistics.

I also replaced my earlier idea for a Community tab with Friends because the project focuses on running with existing friends rather than discovering public running groups. Notifications appear behind a bell icon instead of taking up another navigation tab.

### Making the interface more social

My initial run cards emphasized scheduling information, but I felt they looked more like a calendar than a social running app. I made several changes to emphasize both the run details and the people involved:

- **Participant previews:** Added overlapping avatars and participant counts so users can see who is going without opening a run.
- **Visual hierarchy:** Made the start time prominent, followed by distance, pace, and meeting location.
- **Clearer interactions:** Added a "View details" indicator and made the Map link less prominent so the primary action is easier to recognize.
- **Home layout:** Shortened the Create a Run banner and adjusted the feed to show two cards per row on desktop and one on mobile.

These changes help users quickly decide whether a friend's run is something they want to join.

## 4. Final Design and Reflection

The final RunTogether stays true to the original P1 idea: helping friends discover and coordinate runs they already intend to do. The biggest changes were not to the core concept, but to the interactions surrounding it.

I realized that a successful social running app needs to support more than just posting and joining runs. Users also need ways to communicate, respond to changes, manage commitments, and intentionally invite friends. I added these features while keeping responsibilities separated into concepts.

Visually, the biggest improvement from P3 was making the app feel more social and easier to navigate. Participant previews, clearer run cards, and more consistent interaction patterns help users understand both the plans and the people involved.
