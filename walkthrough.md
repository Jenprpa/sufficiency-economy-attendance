# Walkthrough & Manual Test Checklist - V1.1 & V1.2 (Subject Calendar, Lesson Management, Reports & Rotation Builder)

We have completed the implementation of the Subject Calendar Wizard, Lesson Management, Make-up Lessons & Reports, and the V1.2 Rotation Schedule Builder. 

> [!NOTE]
> A comprehensive system-level design summary is documented in the [ARCHITECTURE_SUMMARY.md](file:///C:/Users/jenpr/.gemini/antigravity/brain/1e729e69-e48a-40cc-931b-8f4e85188ffd/ARCHITECTURE_SUMMARY.md) artifact, detailing file layouts, method categories, database schemas, role models, security rules, and pilot/production readiness.

Below is the checklist for verifying the new functionality in the application.

## V1.1 Sprint 1 Checklist (Subject Calendar Core)

### 1. Navigation & Access Control
- [ ] Log in as a **Teacher** (e.g., `teacher1`). Verify that the new menu item **"ปฏิทินรายวิชา"** is visible in the sidebar.
- [ ] Click **"ปฏิทินรายวิชา"**. Verify that the page switches to the Subject Calendar view and displays an empty state message if no calendars have been created yet.
- [ ] Log out, and log in as a **Director** or **Supervisor**. Verify that you can see the **"ปฏิทินรายวิชา"** menu item, but the "สร้างปฏิทินรายวิชาใหม่" action button is hidden.
- [ ] Log out, and verify that the menu item is hidden in guest mode.

### 2. 5-Step Wizard Navigation & Validation
- [ ] Log in as a **Teacher** or **Admin**, go to **"ปฏิทินรายวิชา"**, and click **"สร้างปฏิทินรายวิชาใหม่"**. Verify that Step 1 modal opens.
- [ ] **Step 1: Semester**
  - Leave fields blank or input an invalid date range (e.g., end date before start date). Click "ถัดไป" and verify that validation catches it.
  - Fill with valid year (`2569`), semester (`1`), start date (`2026-05-16`), and end date (`2026-10-02`). Click "ถัดไป".
- [ ] **Step 2: Subject**
  - Click "ถัดไป" with empty subject name or code. Verify that validation prevents continuation.
  - Fill in Subject Name (e.g., `คณิตศาสตร์เพิ่มเติม`), Subject Code (e.g., `ค21201`), Grade Level (`ม.1`), and periods (`2`). Click "ถัดไป".
- [ ] **Step 3: Classrooms**
  - Change Grade Level in Step 2, go back and forth, and verify that the classroom checkboxes adjust to show the selected grade level (e.g., `ม.1/1` to `ม.1/10`).
  - Choose **"ห้องเรียนเดียว"** and verify that checking a box unchecks all others.
  - Choose **"หลายห้องเรียน"** and verify that you can select multiple rooms.
  - Choose **"ทั้งระดับชั้น"** and verify that all 10 checkboxes are selected and disabled.
  - Leave checkboxes unselected and verify that the wizard prevents proceeding to Step 4. Click "ถัดไป" after checking rooms.
- [ ] **Step 4: Weekly Schedule**
  - Click "เพิ่มเวลาเรียน" to add slots. Verify that slots are added dynamically.
  - Verify that clicking the delete trash icon deletes a row.
  - Fill with invalid inputs (e.g., start time after end time or period <= 0) and verify validation catches it.
  - Enter a valid slot: Day: `วันจันทร์`, คาบที่: `1`, เวลา: `08:30` - `09:20`, สถานที่: `ห้อง 2206`. Click "ถัดไป".
- [ ] **Step 5: Review & Generate**
  - Verify that it shows a detailed summary of the subject, classrooms, semester, and date range.
  - Verify that the generated total number of lessons matches the logic (e.g. number of matching days in range * number of weekly slots * number of checked classrooms).
  - Verify that the first 5 preview lesson dates are listed with correct day names, times, and classrooms.

### 3. Generation & Listing
- [ ] Click **"ยืนยันและสร้างปฏิทิน"** on Step 5.
- [ ] Verify that a success modal appears.
- [ ] Verify that the wizard modal closes and the newly generated calendar is immediately listed in the table.
- [ ] If online, verify that data is written to Firestore collections `subjectCalendars` and `subjectCalendarLessons`. If offline, verify that they are saved to local cache/localStorage.

---

## V1.1 Sprint 2 Checklist (Lesson Management)

### 4. Status Toggling (Taught / Cancelled)
- [ ] Click **"ดูคาบเรียน"** on any calendar row. Verify that the lessons panel opens beneath the table.
- [ ] Verify that all lessons default to the status **"ตามแผน"** (planned).
- [ ] Click **"สอนแล้ว"** (taught) on a lesson. Verify that the status badge turns green with a checkmark icon.
- [ ] Click **"ยกเลิก"** (cancelled) on a lesson. Verify that the status badge turns red with an X-mark icon.
- [ ] Verify that the changes are written immediately to Firestore and the local storage cache.

### 5. Detailed Info Recording (Edit Topic, Plan, and Notes)
- [ ] Click **"บันทึกรายละเอียด"** (edit button) on a lesson row.
- [ ] Verify that the modal **"บันทึกรายละเอียดการเรียนสอน"** opens and displays:
  - หัวข้อการเรียนการสอน (Topic) - Required input field.
  - แผนการจัดการเรียนรู้/เป้าหมาย (Lesson Plan) - Textarea.
  - บันทึกหลังการสอน (Teaching Note) - Textarea.
- [ ] Try to submit with an empty Topic. Verify that the browser alerts you and prevents saving.
- [ ] Fill in all three fields (e.g. Topic: `สมการเชิงเส้นตัวแปรเดียว`, Plan: `สอนการย้ายข้างและสมบัติการเท่ากัน`, Note: `นักเรียนส่วนใหญ่เข้าใจดี มีบางคนยังสับสนเครื่องหมายลบ`) and click **"บันทึกข้อมูล"**.
- [ ] Verify that the success modal appears, the modal closes, and the details are immediately rendered under the location column in the table list.
- [ ] Verify that reloading the page and reopening the lessons view retains all recorded details.

### 6. Classroom & Status Combined Filtering
- [ ] Under the lessons card header, verify that there are two filter dropdowns: **"กรองห้องเรียน"** and **"กรองสถานะ"**.
- [ ] Change the Classroom filter to a specific room (e.g. `ม.1/1`). Verify that only lessons for `ม.1/1` are displayed.
- [ ] Change the Status filter to **"สอนแล้ว"**. Verify that only lessons that are marked as taught for classroom `ม.1/1` are displayed.
- [ ] Reset both filters to **"ทุกห้องเรียน"** and **"ทุกสถานะ"**. Verify that all lessons are shown.

---

## V1.1 Sprint 3 Checklist (Make-up Lessons & Reports)

### 7. Adding a Make-up Lesson
- [ ] Log in as the owner teacher of a calendar.
- [ ] Click **"ดูคาบเรียน"** on the calendar row. Verify that the button **"เพิ่มคาบเรียนชดเชย"** is visible.
- [ ] Click **"เพิ่มคาบเรียนชดเชย"**. Verify that the modal **"เพิ่มคาบเรียนชดเชย"** opens.
- [ ] Fill out the details:
  - Select classroom from the dropdown list (e.g., `ม.1/1`).
  - Enter a valid date, period (e.g., `3`), start/end time (e.g., `10:10` - `11:00`), location (e.g., `ห้องสมุด`), and Topic (e.g., `คาบติวสมการเพิ่ม`).
  - Add optional lesson plan and notes if needed.
- [ ] Click **"สร้างคาบชดเชย"**. Verify that the success modal appears, the modal closes, and the new make-up lesson is added to the list timeline.
- [ ] Verify that the make-up lesson row contains a blue/teal badge saying **"ชดเชย"** next to its status badge.
- [ ] Verify that the make-up lesson displays its calculated week number correctly relative to the semester start date.

### 8. Export Calendar Data
- [ ] In the lessons list card header, click **"ส่งออกปฏิทิน"**.
- [ ] Verify that a `.json` file downloads immediately (named e.g. `lessons_report_ค21201_2026-07-02.json`).
- [ ] Open the JSON file and verify it contains the full structured array of the calendar's lessons with all fields (topic, plan, note, location, status, isMakeup, etc.).

### 9. Print / PDF Reporting
- [ ] Click **"พิมพ์รายงาน / PDF"** in the lessons list card header.
- [ ] Verify that the browser's print dialog opens.
- [ ] Review the print preview layout:
  - Verify that the app's sidebar, top navigation header, filter inputs, actions buttons, and parent calendar list table are hidden from the printout.
  - Verify that only the timeline title, subtitle, and the lessons list table itself are shown.
  - Verify that the table wraps across pages naturally and has no scrollbars or clipped text.

### 10. Director/Supervisor Read-Only Role Validation
- [ ] Log in as a user with the **Director** or **Supervisor** role.
- [ ] Go to **"ปฏิทินรายวิชา"**. Verify that you can see all calendars generated by different teachers.
- [ ] Click **"ดูคาบเรียน"** on any calendar row.
- [ ] Verify that the **"เพิ่มคาบเรียนชดเชย"** button is **hidden**.
- [ ] Verify that all status and details edit buttons in the table display as **"อ่านอย่างเดียว"** and clicking them does not open any interactive edits.

---

## V1.1 Subject Calendar List Filters

### 11. Scoped List Filtering
- [ ] Log in as **Admin** or a **Teacher** who has created multiple subject calendars.
- [ ] Go to **"ปฏิทินรายวิชา"**. Verify that the filter bar is visible above the list table containing:
  - **ปีการศึกษา** (Academic Year)
  - **ภาคเรียน** (Semester)
  - **รหัส/ชื่อวิชา** (Subject query)
  - **ห้องเรียน** (Classroom)
  - **สถานะ** (Status: All / Planned / In Progress / Completed / Has Makeup)
- [ ] **Admin Only Verification**: Verify that the **ผู้สอน** (Teacher query) text input filter is visible. Log in as a **Teacher** and verify that the **ผู้สอน** filter input is hidden.
- [ ] Test Academic Year and Semester dropdown changes. Verify that the calendars list filters instantly to match.
- [ ] Type a partial name/code (e.g. `คณิต` or `ค21201`) in the subject search box. Verify that the list filters instantly.
- [ ] Select a classroom (e.g. `ม.1/1`). Verify that only calendars that include `ม.1/1` in their classrooms list are shown.
- [ ] Change status filter (e.g. to "มีคาบเรียนชดเชย"). Verify that calendars with makeup lessons are correctly filtered.
- [ ] Click **"รีเซ็ต"** (Reset) and verify that all inputs are cleared and all calendars are shown again.
- [ ] Verify that there is absolutely no week selector, learning base selector, base activity date filter, or base calendar grid visible on this page.

---

## V2.0.1 - Lesson Planner Integration (ปรัชญาของเศรษฐกิจพอเพียง)

### 12. Navigation & Access Control
- [ ] Log in as a **Teacher** (e.g. `teacher1`), **Admin**, or other roles. Verify that the new menu item **"แผนกิจกรรมพอเพียง"** (Lesson Planner) is visible in the sidebar navigation.
- [ ] Click the item. Verify that it switches to the **"แผนการจัดกิจกรรมการเรียนรู้ (Lesson Planner)"** view.
- [ ] Log in as a Guest. Verify that Guest users can access the planner in read-only mode to view approved/pending plans.

### 13. Writing a Sufficiency Economy Lesson Plan
- [ ] Log in as a **Teacher**, go to **"แผนกิจกรรมพอเพียง"**, and click **"เขียนแผนใหม่"**.
- [ ] Fill out the required details in the form:
  - **หัวข้อแผนการเรียนรู้** (Topic, e.g., "การปลูกผักไฮโดรโปนิกส์พอเพียง")
  - **ฐานการเรียนรู้** (Learning Base selection)
  - **ระดับชั้น** (Grade level, e.g., "ม.1 - ม.3")
  - **วัตถุประสงค์การเรียนรู้**
  - **3 ห่วง**: ความพอประมาณ, ความมีเหตุผล, การมีภูมิคุ้มกันที่ดี
  - **2 เงื่อนไข**: เงื่อนไขความรู้, เงื่อนไขคุณธรรม
  - **4 มิติ**: มิติด้านวัตถุ/เศรษฐกิจ, มิติด้านสังคม, มิติด้านสิ่งแวดล้อม, มิติด้านวัฒนธรรม
  - **กิจกรรมการเรียนรู้** (Activities)
  - **การวัดและประเมินผล** (Evaluation)
- [ ] Click **"บันทึกแบบร่าง"** (Save Draft). Verify that the plan is saved with status **"แบบร่าง"** and listed in the planner list.
- [ ] Edit the plan and click **"ส่งขออนุมัติแผน"** (Submit for Review). Verify that the status switches to **"รออนุมัติ"** (Pending).

### 14. Approval and Feedback Workflow
- [ ] Log in as a **Director** (e.g., `director1`), **Supervisor** (e.g., `supervisor1`), or **Admin**.
- [ ] Go to **"แผนกิจกรรมพอเพียง"** and click **"ดูรายละเอียด"** on the pending lesson plan.
- [ ] Verify that you can see all the details of the plan in an organized visual layout.
- [ ] Write a comment in the feedback section (e.g. "เนื้อหานี้บูรณาการกับมิติด้านวัตถุได้ดีมาก") and click **"อนุมัติแผน"** (Approve Plan).
- [ ] Verify that the plan status updates to **"อนุมัติแล้ว"** and the comment is persisted.
- [ ] For other pending plans, try writing feedback and clicking **"ส่งกลับแก้ไข"** (Send Back for Edits). Verify that status returns to Draft/Editable for the teacher.

### 15. Cloud and Local Sync Verification
- [ ] While online, save or update a plan. Open the Firebase Console / Firestore and verify that a new document containing the updated array is written to `system_data/lesson_plans`.
- [ ] Turn off connection (or simulate offline), reload the app, and verify that all plans are retrieved from local storage cache.

---

**All features have been merged, pushed, and tagged under v2.0.1 successfully!**
