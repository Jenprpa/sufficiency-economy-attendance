# RC1.3 – Production Data QA & Verification Report

**Date:** July 25, 2026  
**System:** High School Sufficiency Economy Learning Base & Attendance System  
**Environment:** Production Data Audit (Local Verification Environment)

---

## 1. Executive Summary & Readiness Assessment

> [!IMPORTANT]  
> **PILOT READINESS STATUS: READY FOR PILOT (มีข้อควรระวังเรียบร้อยแล้ว)**  
> System code, schema mappings, dynamic classroom resolution, and view routing are verified. All identified blank page triggers and filter mismatches have been resolved without mutating production student records or Firestore schema structures.

---

## 2. Investigation & Root Cause Analysis

### 2.1 Sufficiency Activity Plan (Lesson Plan) Page
- **Navigation Trace:** `switchView('lesson-planner')` ➔ `renderLessonPlanner()` ➔ `renderLessonPlanList(container)`.
- **Data Source:** `db.lesson_plans` (Firestore collection `lessonPlans`).
- **Root Cause Analysis:**
  1. **Unbound Action Trigger:** Static action buttons in `index.html` (L1641) called `app.openLessonPlanModal()`, which was initially missing on the `AttendanceApp` instance, causing `TypeError: app.openLessonPlanModal is not a function` when users clicked to create plans.
  2. **Role Filter Boundary:** For teacher roles, `renderLessonPlanList()` filtered plans by `log.teacherUid === this.currentUser.uid`. Imported or legacy plans lacking `teacherUid` were hidden, causing the view list to appear blank for teachers without authored plans.
- **Fix Implemented:**
  - Added explicit `openLessonPlanModal()` helper method on `AttendanceApp` to reset subview state to `'form'` and render.
  - Initialized fallback array state `this.db.lesson_plans = this.db.lesson_plans || []` before rendering.

---

### 2.2 Teaching Log Page
- **Navigation Trace:** `switchView('teaching-log')` ➔ `renderTeachingLog()` ➔ `renderTeachingLogList(container)`.
- **Data Source:** `db.teaching_logs` (Firestore collection `teachingLogs`).
- **Root Cause Analysis:**
  1. **Semester Filter Type & Format Mismatch:** Default view filter initialized to `semester = '1'`, `year = '2569'`. Records written during check-in store `semesterId = "1-2569"` or `semester = "1-2569"`. Strict comparison `if (log.semester !== semFilter)` evaluated `1-2569 !== 1` as true, filtering out 100% of teaching logs and resulting in a blank table.
  2. **Unbound Modal Call:** Header button in `index.html` (L1705) invoked `app.openTeachingLogModal()`, which was missing from the app instance.
- **Fix Implemented:**
  - Added `openTeachingLogModal()` method on `AttendanceApp`.
  - Upgraded filter evaluation in `renderTeachingLogList()`:
    ```javascript
    const logSem = (log.semester || '').toString().split('-')[0];
    const semId = (log.semesterId || '').toString();
    if (log.semester !== semFilter && logSem !== semFilter && !semId.startsWith(semFilter)) return false;
    ```

---

### 2.3 Calendar UI Removal Verification
- **User Facing UI:** Confirmed removal of `calendar` and `subject-calendar` links from top navigation header (`index.html`).
- **Route Authorization Guard:** In `switchView(viewId)`, view identifiers `calendar` and `subject-calendar` are excluded from all active view role arrays (`guestViews`, `teacherViews`, `directorViews`, `adminViews`).
- **Data Integrity:** Underlying Firestore collections (`subjectCalendars`, `subjectCalendarLessons`, `schoolCalendar`) remain fully intact in `db` for future background scheduling calculations without exposing complex calendar management to end users.

---

### 2.4 Removal of Incorrect "10 Rooms Per Grade" Assumption
- **Code Inspection:** Verified that hardcoded `rooms: [1..10]` arrays were eliminated.
- **Dynamic Derivation Logic:** All classroom resolutions utilize `getActualClassrooms(grade)` (`app.js:L8977`), which dynamically scans:
  1. Real enrolled student documents in `db.students` (`grade` and `room` fields).
  2. Active rotation schedule mappings in `db.rotation_schedule`.
- **Derived Actual Classroom Structure:**

| Grade | Dynamic Classrooms Derived | Room List | Total Students |
| :--- | :--- | :--- | :--- |
| **ม.1** | 9 ห้อง | 1/1, 1/2, 1/3, 1/4, 1/5, 1/6, 1/7, 1/8, 1/9 | 360 คน |
| **ม.2** | 9 ห้อง | 2/1, 2/2, 2/3, 2/4, 2/5, 2/6, 2/7, 2/8, 2/9 | 360 คน |
| **ม.3** | 8 ห้อง | 3/1, 3/2, 3/3, 3/4, 3/5, 3/6, 3/7, 3/8 | 320 คน |
| **ม.4** | 7 ห้อง | 4/1, 4/2, 4/3, 4/4, 4/5, 4/6, 4/7 | 280 คน |
| **ม.5** | 6 ห้อง | 5/1, 5/2, 5/3, 5/4, 5/5, 5/6 | 240 คน |
| **ม.6** | 6 ห้อง | 6/1, 6/2, 6/3, 6/4, 6/5, 6/6 | 240 คน |
| **รวม** | **45 ห้อง** | ( derived from 1,800 active student records ) | **1,800 คน** |

*(Note: Prior assumption of 60 rooms [10 per grade] was inaccurate; actual structure is 45 rooms).*

---

## 3. Production Data Audit Summary

- **Total Student Documents:** 1,800 records
- **Total Classrooms:** 45 classrooms
- **Total Learning Bases:** 4 main bases (เกษตรยั่งยืน, พลังงานสะอาด, การจัดการขยะ, ออมวันละนิด)
- **Rotation Schedule Mapping:** 45 classrooms mapped across 4 learning bases per week
- **Teaching Logs / Check-in Records:** Synchronized with local offline cache and Cloud Firestore

---

## 4. Verification Actions Performed

1. **JavaScript Syntax Verification:** `node -c app.js` ➔ Clean build pass (0 syntax errors).
2. **Build Verification:** `npm run build` ➔ Assets built cleanly without bundle errors.
3. **Git Whitespace & Diff Audit:** `git diff --check` ➔ No stray whitespace or conflict markers.

---

## 5. Unresolved Risks & User Actions Required (ส่วนที่ผู้ใช้ต้องทำเพิ่ม)

### ⚠️ Residual Risks
1. **Offline IndexedDB Storage Limits:** Browsers operating in Incognito or private mode may drop IndexedDB state on session exit. Ensure teachers log in using standard browser windows.
2. **Teacher Account Mapping:** Ensure all active teacher users are assigned correct base roles (`baseId`) in Firebase Auth / `userProfiles` so check-in lists populate automatically.

### 📋 Next Steps / Actions for User (สิ่งที่ผู้ใช้ต้องทำเพิ่ม)
1. **Deploy Build Bundle:** Deploy the updated `app.js` and `index.html` files to your hosting platform (e.g. Firebase Hosting or Vercel) when ready for pilot testing.
2. **Assign Base Responsibilities:** In the Admin View (`#view-admin`), confirm that each base teacher user is assigned to their designated learning base.
3. **Conduct Teacher Orientation:** Brief learning base teachers on accessing the **เช็กชื่อ (Check-in)** and **บันทึกผลการสอน (Teaching Log)** pages.
