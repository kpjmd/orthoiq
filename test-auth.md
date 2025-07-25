# Authentication Test Checklist

## 1. Anonymous User Tests
- [ ] Load the mini app at `/mini`
- [ ] Verify "Anonymous" label is shown
- [ ] Verify "1 of 1" questions remaining is displayed
- [ ] Submit a question and verify it works
- [ ] Verify question count decreases to "0 of 1"
- [ ] Try to submit another question - should be blocked
- [ ] Verify "View Artwork" button shows locked icon and is disabled

## 2. Authentication Flow Tests
- [ ] Click "Sign in with Farcaster" button
- [ ] Verify Quick Auth popup/flow appears
- [ ] Complete authentication
- [ ] Verify user profile appears instead of "Sign in" button
- [ ] Verify "Authenticated" label replaces "Anonymous"
- [ ] Verify question limit changes to "3 of 3"

## 3. Authenticated User Tests
- [ ] Submit a question as authenticated user
- [ ] Verify question count decreases properly
- [ ] Verify "View Artwork" button is now enabled and clickable
- [ ] Click "View Artwork" and verify modal opens
- [ ] Submit 3 questions total to exhaust limit
- [ ] Verify proper rate limit message appears

## 4. Sign Out Tests
- [ ] Click "Sign Out" button
- [ ] Verify returns to anonymous state
- [ ] Verify question limit returns to "1 of 1"
- [ ] Verify "View Artwork" button becomes locked again

## 5. Session Persistence Tests
- [ ] Sign in with Farcaster
- [ ] Refresh the page
- [ ] Verify user remains authenticated
- [ ] Verify question count persists correctly

## Key Implementation Details:
1. Quick Auth is used instead of @farcaster/auth-kit
2. Authentication state is managed in AuthProvider using sdk.quickAuth.getToken()
3. User tier is determined based on authentication status
4. View Artwork button is conditionally rendered based on isAuthenticated
5. Rate limits: Anonymous = 1, Authenticated = 3, Medical = 10 questions per day