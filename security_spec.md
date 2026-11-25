# Security Specification — PSMS Bangladesh Firestore Rules

## 1. Core Data Invariants
1. No unauthenticated user may read or write any document (`default-deny` catch-all rule).
2. A non-admin user can ONLY read/write their own owned documents (`/users/{uid}`, `/users/{uid}/private/preferences`, `/schools/{schoolId}` with `ownerUid == uid`, `/notices/{noticeId}` with `createdByUid == uid`, `/cloud_backups/{uid}`) and CANNOT self-assign `central_admin`, `school_admin`, or `teacher` roles or change `role`/`status` on their profile.
3. Only the verified **Super Central Admin** (`mominkhan404586@gmail.com` with `email_verified == true` or a verified `/admins/{uid}` entry whose `accessLevel == 'Super Central Admin'`) has full global read/write/delete access across collections.
4. Subordinate reviewers (`Audit Officer`, `Regional Reviewer` in `/admins/{uid}`) have read-only inspection access to public governance collections (`get` on `/users`, `/schools`, `/notices`, `/audit_logs`), and CANNOT create/update/delete `/admins`, `/app_settings`, `/cloud_backups`, `/users/private`, or delete `/users` or `/schools`.
5. All strings enforce explicit `.size()` bounds; all IDs enforce `^[a-zA-Z0-9_\\-]+$` and `<= 128` chars; all timestamps (`createdAt`, `updatedAt`) MUST equal `request.time`.
6. `audit_logs` are strictly append-only (`update` and `delete` always denied).
7. `/users/{userId}/private/preferences` is isolated strictly to the verified owner UID or Super Central Admin; no cross-user reads or `list` queries are permitted.
8. Non-Super-Central-Admin verified creators of `/notices/{noticeId}` cannot publish `audience: 'all'` broadcasts or modify archived notices.
9. `/cloud_backups/{backupId}` is strictly isolated to `backupId == request.auth.uid` (with Super Central Admin oversight), verified email (`email_verified == true`), native bounded map fields, and immutable `ownerUid`/`createdAt`.

## 2. Adversarial Test Matrix ("Dirty Dozen+")
1. Unauthenticated read on `/users/uid1` -> DENIED
2. Authenticated non-owner read on `/users/otherUid` -> DENIED
3. Self-privilege escalation create `/users/uid1` with `role: 'central_admin'` -> DENIED
4. Shadow field injection (`isVerified: true`) on `/users/uid1` -> DENIED
5. Unverified email spoof (`email: 'mominkhan404586@gmail.com', email_verified: false`) -> DENIED
6. Owner attempting to mutate `role` field on `/users/uid1` update -> DENIED
7. Owner attempting to forge `createdAt` or `updatedAt` timestamp -> DENIED
8. Oversized string (> 200 chars) on `nameBn` in `/schools/SCH1` -> DENIED
9. Invalid path ID (`../etc` or > 128 chars) on `/schools/{schoolId}` -> DENIED
10. Non-Super-Central-Admin (including subordinate reviewer) attempt to write `/admins/{adminId}` -> DENIED
11. Anyone attempting to update or delete `/audit_logs/{logId}` -> DENIED
12. Non-Super-Central-Admin (including subordinate reviewer) attempt to mutate `/app_settings/global` -> DENIED
13. Non-owner (and subordinate reviewer) attempt to read or write `/users/otherUid/private/preferences` -> DENIED
14. Non-Super-Central-Admin user creating `/notices/N1` with `audience: 'all'` -> DENIED
15. Non-owner or unverified email trying to read/write `/cloud_backups/{otherUid}` -> DENIED
16. Shadow key or negative count injection in `/cloud_backups/{uid}` -> DENIED
17. Subordinate reviewer attempting to delete `/schools/{schoolId}` or `/users/{userId}` -> DENIED
