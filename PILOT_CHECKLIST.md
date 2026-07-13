# Pilot Test Checklist - Release Candidate 1 (RC1)

**Application:** Sufficiency Economy Attendance & Teaching Log Tracking  
**Target Release:** Release Candidate 1 (RC1)  
**Status:** Pre-flight Verification  

---

## 1. Pilot Account Setups

Prior to starting the pilot trial, verify that the following accounts are configured and accessible:

- [ ] **Admin Account:** For managing metadata, configurations, and system date simulators.
- [ ] **Director Account (Report Viewer):** For reviewing dashboards, missing attendance alerts, and framework metrics.
- [ ] **Teacher Accounts (One per Learning Base):**
  - [ ] **Base 1 (ฐานป่า 3 อย่าง ประโยชน์ 4 อย่าง):** `teacher1`
  - [ ] **Base 2 (ฐานการทำบัญชีครัวเรือน):** `teacher2`
  - [ ] **Base 3 (ฐานปุ๋ยหมักและเกษตรอินทรีย์):** `teacher3`
  - [ ] **Base 4 (ฐานน้ำหมักชีวภาพ):** `teacher4`
  - [ ] **Base 5 (ฐานพลังงานทดแทน):** `teacher5`

---

## 2. Pre-flight Verification Steps (Per Account)

For each teacher account:

### A. Login & Interface Safety
- [ ] Perform a successful login using credentials.
- [ ] Verify the interface style renders cleanly (e.g., buttons, forms, and cards).
- [ ] Test on a mobile browser simulator (or real device) at 390px width to ensure tables do not overflow and wrap properly.

### B. Assigned Base and Class Verification
- [ ] Confirm the learning base name shown matches the teacher's profile.
- [ ] Verify the student list correctly loads after selecting a classroom.

### C. Attendance Smoke Check
- [ ] Select a classroom and click **Check-All (Present)**.
- [ ] Manually modify 1-2 students to *Absent* or *Late* and verify status counters update dynamically.
- [ ] Click **Save Attendance (Live)** to submit.
- [ ] Perform a duplicate check-in test: attempt to save the same classroom again and verify the "Duplicate Attendance" warning modal displays.

### D. Offline Draft Recovery Smoke Check
- [ ] Select a class, mark student attendance, but **do not save**.
- [ ] Refresh the browser page.
- [ ] Verify the **Draft Recovery Dialog** is displayed.
- [ ] Select "Restore" and confirm that the previous attendance state returns.

### E. Teaching Log Smoke Check
- [ ] Save an attendance list and verify automatic redirect to the **Teaching Log Form**.
- [ ] Verify that classroom, teacher name, and date details are prefilled.
- [ ] Select at least one condition, principle, and dimension from the SEP framework.
- [ ] Click **Save Log** to submit.

---

## 3. Reports Verification (Director/Admin View)

- [ ] Login as Director/Admin.
- [ ] Verify the **Executive Dashboard** updates automatically.
- [ ] Confirm that if a classroom is missing attendance, it is listed in the **Missing Attendance Warning** panel.
- [ ] Navigate to **Reports**:
  - [ ] Generate **Attendance Summary** report.
  - [ ] Generate **Teaching Logs Summary** report.
  - [ ] Generate **Teaching Framework (SEP) Metrics** report and verify matching metrics counters.

---

## 4. Issues Log

Please record any pilot issues discovered in the table below:

| Date | Learning Base | Device / OS | Description / Steps to Reproduce | Severity (High/Med/Low) | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
|      |               |             |                                  |                        |        |
|      |               |             |                                  |                        |        |
|      |               |             |                                  |                        |        |
