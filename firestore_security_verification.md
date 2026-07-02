# Firestore Security Rules - Verification & Testing Documentation

This document describes how to deploy, test, and manually verify the implemented Firestore Security Rules (`firestore.rules`) and scoped query structure.

---

## 1. Local Emulator Testing Setup

If you have the Firebase CLI installed, you can verify these rules locally using the Firestore Emulator:

### Steps:
1. **Initialize Firebase (if not already done)**:
   ```bash
   firebase init firestore
   ```
   *Select the existing `firestore.rules` file when prompted.*

2. **Start the Firestore Emulator**:
   ```bash
   firebase emulators:start --only firestore
   ```

3. **Run Automated Rules Unit Tests**:
   Create a test script (e.g., using `@firebase/rules-unit-testing`) to programmatically verify access roles:
   ```javascript
   const testing = require('@firebase/rules-unit-testing');
   
   // Example test case asserting that a teacher cannot update their own role
   const db = testing.initializeTestApp({ projectId: "my-project", auth: { uid: "teacher_uid" } }).firestore();
   const docRef = db.collection("userAccounts").doc("teacher_uid");
   await testing.assertFails(docRef.update({ role: "admin" }));
   ```

---

## 2. Manual Verification Checklist (Staging/Production)

Use the following manual checklist to test the permissions directly on a Firebase Staging project:

| Test Case | Actor | Target Resource / Action | Expected Result | Verified |
| :--- | :--- | :--- | :--- | :---: |
| **1. Unauthenticated Read** | Anonymous | Read any collection (e.g., `system_data`) | ❌ **Permission Denied** | [ ] |
| **2. Self Profile Read** | Teacher A (`uid1`) | Read `userProfiles/uid1` |  **Success** | [ ] |
| **3. Other Profile Read** | Teacher A (`uid1`) | Read `userProfiles/uid2` (Teacher B) | ❌ **Permission Denied** | [ ] |
| **4. Role Escalation Prevent** | Teacher A (`uid1`) | Update `role` field inside `userAccounts/uid1` | ❌ **Permission Denied** | [ ] |
| **5. Timestamp Update Allow** | Teacher A (`uid1`) | Update `lastLoginAt` and `status` in `userAccounts/uid1` |  **Success** | [ ] |
| **6. Modify System Data** | Teacher A (`uid1`) | Write/Update `system_data/bases` | ❌ **Permission Denied** | [ ] |
| **7. Read System Data** | Teacher A (`uid1`) | Read `system_data/bases` |  **Success** | [ ] |
| **8. Write Check-in Log** | Teacher A (`uid1`) | Create `attendance_logs/log_id` with valid checkedBy |  **Success** | [ ] |
| **9. Read Own Log** | Teacher A (`uid1`) | Read `attendance_logs/log_id` checkedBy Teacher A |  **Success** | [ ] |
| **10. Read Other Log** | Teacher A (`uid1`) | Read `attendance_logs/log_id` checkedBy Teacher B | ❌ **Permission Denied** | [ ] |
| **11. Admin Read All Logs** | Admin C (`uid3`) | Read all logs in `attendance_logs` collection |  **Success** | [ ] |
| **12. Director/Sup Read All**| Director B (`uid2`) | Read all logs in `attendance_logs` collection |  **Success** | [ ] |
| **13. Teacher Delete Final Log**| Teacher A (`uid1`) | Delete document in `attendance_logs` | ❌ **Permission Denied** | [ ] |
| **14. Admin Delete Final Log**| Admin C (`uid3`) | Delete document in `attendance_logs` |  **Success** | [ ] |
| **15. Approve Staged Log** | Director B (`uid2`) | Delete approved draft from `staging_logs` |  **Success** | [ ] |
| **16. Read Backups/Audit Logs** | Teacher A (`uid1`) | Read from `backups` or `audit_logs` | ❌ **Permission Denied** | [ ] |
| **17. Read Audit Logs (Admin)**| Admin C (`uid3`) | Read from `audit_logs` |  **Success** | [ ] |

---

## 3. Required Firestore Indexes

The query scope refactoring introduces the following filter properties:

| Collection | Filter Fields | Query Purpose | Index Status |
| :--- | :--- | :--- | :--- |
| `attendance_logs` | `checkedBy` (Equality) | Loads teacher's own checked attendance logs | **Single-field index** (Created automatically by Firestore) |
| `attendance_logs` | `studentId` (Equality) | Admin deletion of student references | **Single-field index** (Created automatically by Firestore) |

No custom **Composite Indexes** are required for current app queries since filters are simple single-field matches. If subsequent features introduce composite ordering (e.g. order by date and filter by checkedBy), the browser console will provide an index creation link upon executing the query.

---

## 4. Safe Fallback and TODOs

1. **Backward Compatibility**:
   - The rules contain a compatibility rule checking both `resource.data.teacherUid == request.auth.uid` and `resource.data.checkedBy == getUsername()`.
   - **TODO/Migration**: Since older attendance log documents lack a `teacherUid` field, a one-time migration script should be executed on production to populate `teacherUid` for all existing logs based on their `checkedBy` field. Once migrated, the `checkedBy` fallback in `firestore.rules` can be safely removed.
