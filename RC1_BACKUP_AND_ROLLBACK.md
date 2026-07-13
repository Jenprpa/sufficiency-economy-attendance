# RC1 Backup and Rollback Documentation

**Release Version:** Release Candidate 1 (RC1)  
**Date:** July 13, 2026  

---

## 1. Stable Commit Reference points

* **Latest Stable Commit (QA-1 & Bug Fixes):** `91deb63`  
  * *Description:* fix(QA-1): resolve report rendering and mobile table issues
* **Previous Stable Commit (Sprint F5 completion):** `2bc429c`  
  * *Description:* feat(F5): add attendance draft restore

---

## 2. Rollback Command

To discard any unstable changes or roll back the codebase to the frozen state of RC1, execute the following command in the repository root:

```powershell
# To hard reset the local working directory back to RC1 baseline
git reset --hard 91deb63
```

---

## 3. Database Backup Recommendations (Before Pilot)

Since the application utilizes Google Cloud Firestore, we strongly recommend taking the following actions prior to starting the pilot trial to safeguard existing attendance records and configuration templates:

### A. Local DB Backup Export
1. Log in as an **Admin** user.
2. Navigate to the **Settings** or **Admin Panel**.
3. Under the **Database Operations**, locate the **Export Database** button.
4. Click to download the JSON representation of the current `localStorage` configuration database. Save this file locally in a secure backup folder.

### B. Firestore DB Export (Recommended for System Admins)
Use the Firebase Command Line Interface (CLI) or Google Cloud Console to run an export of the production collection documents:
```bash
gcloud firestore export gs://[YOUR_STORAGE_BUCKET]
```
This ensures that if database schemas are corrupted or dirty data is injected during the pilot, the collections can be restored.
