# Noto To-Do App

React Native task management app for ECE 49401 Senior Design.

What's Working (but currently not connected to Supabase, trying to fix that with Chewon)

Authentication:
- Welcome screen with signup/login navigation
- User signup with name, email, password (validates 8+ chars, number, special char)
- Login with email/password
- Password show/hide toggle

Navigation:
- Auth screens for logged-out users
- Tab navigation for logged-in users (Home, Calendar, Focus, Settings tabs are placeholders)

Tech Stack:
- React Native + TypeScript
- Expo (for running the app)
- Supabase (backend database + auth)
- React Navigation

Next:
- Connect to Supabase
- Get confirmation email to send to user (think Supabase supports this)
- Get user onto the homepage of the app where they can make tasks (will be completed over Fall Break before Demo)
