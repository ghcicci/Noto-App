## OAuth Integration (Google Login + Calendar Sync)

This branch introduces full Google OAuth authentication and Google Calendar synchronization for the Noto productivity application. It adds secure Google login, token handling, calendar event integration, and the database structures required for stable two-way syncing.

## Overview

This branch implements:

Google OAuth sign-in

Secure authentication with Supabase Auth (Google provider)

Storage and handling of Google access/refresh tokens

Automated creation and syncing of Google Calendar events

A new task_events table for persistent Google Calendar linkage

Updated flows for tasks, focus mode sessions, and due-date event management

All added features follow measurable specifications for performance, security, and reliability.
