# Security Specification — PSMS Bangladesh Firestore Rules

## 1. Core Data Invariants
1. No unauthenticated user may read or write any document (`default-deny` catch-all rule).
2. A non-admin user can ONLY read their own `/users/{userId}` document and CANNOT self-assign `central_admin`, `school_admin`, or `teacher` roles or change `role`/`status` on their profile.
3. Only the verified bootstrapped Central Admin (`mominkhan404586@gmail.com` with `email_verified == true`) or a verified admin listed in `/admins/{uid}` has administrative privileges.
4. All strings enforce explicit `.size()` bounds; all IDs enforce `^[a-zA-Z0-9_\\-]+$` and `<= 128` chars; all timestamps (`createdAt`, `updatedAt`) MUST equal `request.time`.
5. `audit_logs` are strictly append-only (`update` and `delete` always denied).
6. `/users/{userId}/private/preferences` is isolated strictly to the verified owner UID or Central Admin; no cross-user reads or `list` queries are permitted.
7. Non-admin verified creators of `/notices/{noticeId}` cannot publish `audience: 'all'` broadcasts or modify archived notices.
8. `/cloud_backups/{backupId}` is strictly isolated to `backupId == request.auth.uid` with verified email (`email_verified == true`), native bounded map fields, and immutable `ownerUid`/`createdAt`.

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
10. Non-admin attempt to write `/admins/{adminId}` -> DENIED
11. Non-admin attempt to update or delete `/audit_logs/{logId}` -> DENIED
12. Non-admin attempt to mutate `/app_settings/global` -> DENIED
13. Non-owner attempt to read or write `/users/otherUid/private/preferences` -> DENIED
14. Non-admin user creating `/notices/N1` with `audience: 'all'` -> DENIED
15. Non-owner or unverified email trying to read/write `/cloud_backups/{otherUid}` -> DENIED
16. Shadow key or negative count injection in `/cloud_backups/{uid}` -> DENIED
