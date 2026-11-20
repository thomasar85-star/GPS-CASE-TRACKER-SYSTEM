# Firestore Security Specification (Phase 0 TDD)

## 1. Data Invariants
1. **Identity Integrity**: Every `/cases/{caseId}` document MUST set `createdByUid == request.auth.uid` on creation, and `createdByUid` is strictly immutable on update.
2. **PII Isolation**: Private officer PII (`email`, `phone`) resides strictly in `/users/{userId}` and is readable/writable ONLY by `userId == request.auth.uid` or verified admins. `/officers/{officerId}` and `/stations/{stationId}` contain NO personal emails or phone numbers.
3. **Case PII & Query Enforcement**: `/cases/{caseId}` contains complainant/suspect details; both `get` and `list` MUST require `isAdmin() || (isVerified() && resource.data.createdByUid == request.auth.uid)` so clients cannot scrape other users' dockets.
4. **Relational Integrity**: On `/cases/{caseId}` create, `stationId` MUST reference an existing document in `/stations/{stationId}`.
5. **Temporal Integrity**: `createdAt` and `updatedAt` MUST match `request.time` on create; `createdAt` is immutable on update and `updatedAt` MUST equal `request.time` on update.
6. **Terminal State Locking**: Once a case reaches `status == 'closed_withdrawn'`, non-admin updates are strictly rejected.
7. **Bounded Arrays & Strict Keys**: Every array (`suspects <= 25`, `evidence <= 50`, `witnessStatements <= 50`, `submissions <= 100`, `crimeScenePhotos <= 10`, `stolenPropertyPhotos <= 10`) and every string has strict size/regex limits, and `keys().hasAll(...) && keys().hasOnly(...)` blocks ghost fields.
8. **Path Variable Hardening**: Every document ID path variable passes `isValidId()`.

## 2. The "Dirty Dozen" Attack Payloads (All Must Return PERMISSION_DENIED)
1. **Unauthenticated Case Read**: Unauthenticated `get(/cases/case_001)`.
2. **Unverified Email Case Create**: `create(/cases/case_001)` with `request.auth.token.email_verified == false`.
3. **Identity Spoofing**: `create(/cases/case_999)` where `createdByUid: "other_user_uid"` != `request.auth.uid`.
4. **Ghost Field / Shadow Write**: `create(/cases/case_999)` injecting `"isAdminApproved": true`.
5. **Orphaned Station Reference**: `create(/cases/case_999)` with `stationId: "nonexistent_station"`.
6. **Temporal Tampering**: `create(/cases/case_999)` with client-forged `createdAt` != `request.time`.
7. **Immutable Field Mutation**: `update(/cases/case_001)` attempting to change `createdByUid` or `createdAt`.
8. **Terminal State Bypass**: `update(/cases/case_closed)` where existing `status == 'closed_withdrawn'` by non-admin.
9. **Denial-of-Wallet ID Poisoning**: `create(/cases/aaaa...200chars)` exceeding 128-char `isValidId()` bound.
10. **Array Exhaustion**: `create(/cases/case_999)` with `suspects` array of length 26 (> 25).
11. **Cross-User PII Scrape**: `get(/users/victim_uid)` or `list(/cases)` without matching `createdByUid == request.auth.uid`.
12. **Privilege Escalation**: `create(/admins/attacker_uid)` or `update(/users/attacker_uid)` modifying `dutyRole` to unauthorized value or escalating privileges.
