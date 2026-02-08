# GitHub Token Persistence - GitStream

## Overview
GitHub OAuth tokens are persisted to localStorage across all flows to enable consistent GitHub integration throughout the app.

## OAuth Callback Handlers

### 1. `/claim` Page ✅
**File**: `apps/web/app/claim/page.tsx`
- **Saves to localStorage**: Yes (line 61)
- **Validates token**: Yes - fetches user to verify token validity
- **Handles expiry**: Yes - removes invalid tokens
- **Shows connection status**: Yes - displays connected GitHub user with disconnect option

### 2. `/project/new` Page ✅
**File**: `apps/web/app/project/new/page.tsx`
- **Saves to localStorage**: Yes (immediately on callback)
- **Auto-fetches contributors**: Yes - after project creation
- **Fallback**: Checks localStorage for existing token on mount

### 3. `/project/[id]/contributors` Page ✅
**File**: `apps/web/app/project/[id]/contributors/page.tsx`
- **Saves to localStorage**: Yes (immediately on callback)
- **Connection status banner**: Yes - shows GitHub connection state
- **Reconnect option**: Yes - "Connect GitHub" button when disconnected
- **Validates token**: Yes - fetches user info and removes invalid tokens
- **Auto-fetches contributors**: Yes - when empty and token is available

## Token Storage
- **Location**: `localStorage.getItem("github_token")`
- **Set on**: GitHub OAuth callback redirect
- **Cleared on**: 
  - User clicks "Disconnect"
  - Token validation fails (expired/invalid)

## OAuth Flow
1. User clicks "Connect GitHub"
2. Redirected to GitHub OAuth (`/api/github/auth`)
3. GitHub redirects back with `?github_token=xxx&github_user=xxx`
4. Token is immediately saved to localStorage
5. URL is cleaned (params removed)
6. User info is fetched to validate token
7. If invalid, token is removed from localStorage

## Features
- ✅ Token persists across page reloads
- ✅ Token validated on each page load
- ✅ Expired tokens automatically removed
- ✅ Visual connection status indicators
- ✅ Easy reconnect options
- ✅ Auto-fetch contributors when token available
- ✅ Works across all OAuth entry points

## Usage
To check if GitHub is connected anywhere in the app:
```typescript
const githubToken = localStorage.getItem("github_token");
const isConnected = !!githubToken;
```

To trigger GitHub OAuth:
```typescript
const authUrl = api.github.authUrl(window.location.href);
window.location.href = authUrl;
```
