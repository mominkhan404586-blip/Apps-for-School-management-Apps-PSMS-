# Security Specification — PSMS Bangladesh Firestore & Storage Rules

## 1. Core Data Invariants
1. No unauthenticated user may read or write any document or storage object (`default-deny` catch-all rule in Firestore, RTDB, and Storage).
2. A non-admin user can ONLY read/write their own owned documents (`/users/{uid}`, `/users/{uid}/private/preferences`, `/schools/{schoolId}` with `ownerUid == uid`, `/notices/{noticeId}` with `createdByUid == uid`, `/cloud_backups/{uid}`) and CANNOT self-assign `central_admin`, `school_admin`, or `teacher` roles or change `role`/`status`/`isActive` on their profile.
3. Only the verified **Super Central Admin** (`mominkhan404586@gmail.com` with `email_verified == true` or a verified `/admins/{uid}` entry whose `accessLevel == 'Super Central Admin'`) has full global read/write/delete access across all 17 collections and storage paths.
4. Active School Admins (`role == 'school_admin' && status == 'active' && isActive != false`) are strictly isolated to their own `schoolId` across `/teachers`, `/students`, `/classes`, `/subjects`, `/attendance`, `/exams`, `/results`, and `/applications`.
5. Active Teachers (`role == 'teacher' && status == 'active' && isActive != false`) can read school records and write `/attendance`, `/exams`, `/results` strictly within their assigned `schoolId`.
6. Users with `status in ['rejected', 'suspended', 'deactivated']` or `isActive == false` are blocked from login, session sync, and school-scoped rule privileges.
7. All strings enforce explicit `.size()` bounds; all IDs enforce `^[a-zA-Z0-9_\\-]+$` and `<= 128` chars; all timestamps (`createdAt`, `updatedAt`) MUST equal `request.time`.
8. `audit_logs` and `activityLogs` are strictly append-only (`update` and `delete` always denied).
9. No `get()` or `exists()` calls are placed inside `allow list` rules (Zero-Read List Clause).
10. Firebase Storage enforces verified email auth, owner/school-role path isolation, allowlisted MIME types (`image/jpeg`, `image/png`, `image/webp`, `application/pdf`), and 5 MB image / 10 MB document size limits.

## 2. Adversarial Test Matrix ("Dirty Dozen+")
1. Unauthenticated read on `/users/uid1`, `/teachers/t1`, `/students/s1` -> DENIED
2. Authenticated non-owner read on `/users/otherUid` -> DENIED
3. Self-privilege escalation create `/users/uid1` with `role: 'central_admin'` or `isActive: true` -> DENIED
4. Shadow field injection (`isVerified: true`) on any collection -> DENIED
5. Unverified email spoof (`email: 'mominkhan404586@gmail.com', email_verified: false`) -> DENIED
6. Owner attempting to mutate `role`, `status`, or `isActive` on `/users/uid1` update -> DENIED
7. Owner attempting to forge `createdAt` or `updatedAt` timestamp -> DENIED
8. Oversized string (> 200 chars) on `nameBn` in `/schools/SCH1` -> DENIED
9. Invalid path ID (`../etc` or > 128 chars) on `/schools/{schoolId}` or `/students/{studentId}` -> DENIED
10. Non-Super-Central-Admin (including subordinate reviewer) attempt to write `/admins/{adminId}` -> DENIED
11. Anyone attempting to update or delete `/audit_logs/{logId}` or `/activityLogs/{logId}` -> DENIED
12. School Admin of `SCH-1` attempting to read/write `/students` or `/results` of `SCH-2` -> DENIED
13. Deactivated/rejected/suspended user attempting school-scoped writes -> DENIED
14. Non-Super-Central-Admin user creating `/notices/N1` with `audience: 'all'` -> DENIED
15. Non-owner or unverified email trying to read/write `/cloud_backups/{otherUid}` -> DENIED
16. Oversized or executable upload (`application/x-msdownload` or > 5 MB) to `/profile_photos/{uid}/...` -> DENIED
17. Cross-user upload to `/profile_photos/{otherUid}/...` -> DENIED
