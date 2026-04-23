# Security Specification for Tetris High Scores

## 1. Data Invariants
- A `leaderboard` entry must have a valid `userId` matching the authenticated user.
- Scores must be integers and cannot be negative.
- Users can only read their own profile in `/users/`.
- The `leaderboard` is publicly readable for the top results but only writable by the authenticated user for their own records.
- Document IDs must match the `isValidId` pattern.

## 2. The Dirty Dozen Payloads
1. **Identity Spoofing**: Attempt to save a score with another user's `userId`.
2. **Resource Poisoning**: Use a 1MB string as a `userName`.
3. **Negative Score**: Attempt to save a score of `-500`.
4. **Invalid Type**: Send a string for the `score` field.
5. **Unauthorized Read**: Attempt to read another user's private profile.
6. **Unauthorized Update**: Attempt to change a score in the leaderboard after it's been saved.
7. **Bypass Verification**: Attempt to write to the leaderboard as an unverified user (if requirement is strict).
8. **Shadow Field**: Adding an `isAdmin: true` field to the user profile update.
9. **Timestamp Spoofing**: Sending a client-side timestamp instead of `serverTimestamp()`.
10. **ID Poisoning**: Using `/leaderboard/VERY_LONG_STRING` as a path.
11. **List Scraping**: Attempting to list the entire leaderboard without a limit or ordering.
12. **Orphaned Writes**: Creating a leaderboard entry for a user that doesn't exist.

## 3. Test Runner (Draft)
I will implement `firestore.rules` that block all these.
