# TradeLens AI - Security Specification

## Data Invariants
1. A user profile (`/users/{uid}`) can only be created/modified by the owner.
2. Analysis results stored under `/users/{uid}/analyses/` must belong to the user.
3. Users cannot modify the `uid` or `email` after creation in their profile.

## The Dirty Dozen Payloads (Target: Denied)
1. **Identity Spoofing**: Attempt to create a user profile with a different `uid` than the authenticated one.
2. **Resource Poisoning**: Large string (1MB) as a `displayName`.
3. **Ghost Update**: Adding an `isAdmin: true` field to the user profile via client.
4. **Unauthorized Read**: User A trying to read User B's `/analyses` collection.
5. **Orphaned Analysis**: Creating an analysis entry for a user profile that doesn't exist.
6. **Immutable Breach**: Trying to update `createdAt` timestamp.
7. **Cross-User Injection**: User A saving an analysis into User B's subcollection.
8. **Invalid Scale**: Confidence level set to `-5` or `105`.
9. **Pattern Poisoning**: Injecting 1000 patterns into the patterns list.
10. **Terminal State Lockdown**: (N/A for this app, but checking for state consistency).
11. **Malicious ID**: Using a 2KB string as a document ID.
12. **Email Manipulation**: User trying to change their verified email string.

## Red Team Conflict Report

| Collection | Identity Spoofing | State Shortcutting | Resource Poisoning |
|------------|-------------------|--------------------|--------------------|
| /users     | Restricted (uid)  | N/A                | Size Enforced      |
| /analyses  | Restricted (uid)  | N/A                | Schema Enforced    |
