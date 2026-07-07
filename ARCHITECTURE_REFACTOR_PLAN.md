# 🏗️ แผนการปรับปรุงสถาปัตยกรรม (Architecture Refactoring Plan)

**Academic Management Platform (AMP)** — โรงเรียนไพวิทยาคาร | Version: v2.2.0

เอกสารนี้กำหนดแผนงานและขั้นตอนในการแยกไฟล์เดี่ยว `app.js` ที่มีความยาวกว่า 11,900+ บรรทัด ออกเป็นโมดูลย่อย (Modularization Roadmap) ทั้งหมด 8 เฟส เพื่อเพิ่มประสิทธิภาพในการดูแลรักษาและความมั่นคงของระบบในระยะยาว

> [!IMPORTANT]
> **เป้าหมายหลัก:** แยกส่วนเชื่อมต่อการทำงานของแอปพลิเคชัน (Separation of Concerns) ออกจากกันเป็นอิสระ โดยอิงตามแนวคิด ES Modules และสามารถทดสอบแต่ละส่วนได้โดยง่าย
> **Cross-reference:** ดูรายละเอียดโครงสร้างฐานข้อมูลใน [DATABASE.md](./DATABASE.md) และความเกี่ยวเนื่องระหว่างโมดูลใน [MODULE_DEPENDENCY_MAP.md](./MODULE_DEPENDENCY_MAP.md)

---

## 📅 ตารางสรุป 8 เฟส (Refactoring Phases Summary)

| เฟส | โมดูลเป้าหมาย | ความเสี่ยง (Risk) | ประโยชน์หลัก |
|---|---|:---:|---|
| **Phase 1** | ยูทิลิตี้และค่าคงที่ (utils.js & constants.js) | 🟢 Low | ลดโค้ดซ้ำซ้อนในเมธอดจัดการวันและตัวจัดรูปแบบสัญกรณ์ไทย |
| **Phase 2** | บริการเชื่อมต่อ Firebase (firebase-service.js) | 🔴 High | รวมโค้ดการจัดการ Cloud Firestore & Auth SDK เข้าจุดเดียว |
| **Phase 3** | ยืนยันตัวตนและเซสชัน (auth.js) | 🔴 High | เพิ่มความปลอดภัยระบบล็อกอินและการเก็บสิทธิ์การเข้าใช้งาน |
| **Phase 4** | บันทึกการเช็กชื่อเข้าเรียน (attendance.js) | 🔴 High | การจัดการ Local Queue และการเช็กชื่อแบบออฟไลน์แยกเฉพาะ |
| **Phase 5** | แผนกิจกรรมพอเพียง (planner.js) | 🟡 Medium | แยก Logic บอร์ดอนุมัติและ Framework 2-3-4-3-4 ออกมาเป็นสัดส่วน |
| **Phase 6** | แผงควบคุมสถิติและผู้บริหาร (dashboard.js) | 🟡 Medium | จัดการ Chart.js และรายงานสำหรับผู้บริหารโดยเฉพาะ |
| **Phase 7** | ระบบสรุปรายงานและการส่งออก (reports.js) | 🟡 Medium | ปรับปรุงโมดูลจัดพิมพ์และการทำงานร่วมกับไฟล์ Excel |
| **Phase 8** | ระบบทดสอบและการรันอัตโนมัติ (CI & Tests) | 🟢 Low | รันเทสความถูกต้องของ Logic แบบอัตโนมัติก่อน Release |

---

## 🛠️ รายละเอียดแต่ละเฟส (Refactoring Phases Details)

### 🟢 Phase 1: การสกัดยูทิลิตี้และค่าคงที่ (Extract Utilities and Constants)
- **เป้าหมาย:** สกัดเอาฟังก์ชันประเภท helper และค่าคงที่ระบบออกไปไว้เป็นโมดูลแยกต่างหาก
- **ไฟล์ที่สร้างใหม่:** `js/constants.js`, `js/utils.js`
- **เมธอดที่จะย้าย:** `formatThaiDate()`, `formatThaiDateShort()`, `getWeekByDate()`, `runMigrationChecks()`, `clearSystemCache()`
- **ระดับความเสี่ยง:** 🟢 Low (ไม่มีความเกี่ยวพันกับ API หรือสิทธิ์การทำงาน)
- **Checklist การทบทวนความถูกต้อง:**
  - [ ] เมธอดจัดรูปแบบวันที่ภาษาไทยต้องส่งค่ารูปแบบเดิมกลับมาเหมือนเดิมทุกประการ
  - [ ] ตัวแปรคงที่ (เช่น รายชื่อฐานการเรียนรู้เริ่มต้น) ต้องดึงค่าได้ถูกต้อง
  - [ ] รัน `node -c js/utils.js` ผ่านไม่มี error

---

### 🔴 Phase 2: การสกัดส่วนจัดการ Firebase (Extract Firebase Service Layer)
- **เป้าหมาย:** แยก Logic ที่เกี่ยวข้องกับการดึง เขียน ซิงก์ และสำรองข้อมูล Cloud Firestore ออกจากแอปหลัก
- **ไฟล์ที่สร้างใหม่:** `js/firebase-service.js`
- **เมธอดที่จะย้าย:** `initFirestore()`, `syncFirebaseUser()`, `getDocWithCacheFallback()`, `getCollectionWithCacheFallback()`, `loadDatabaseFromCloudInBackground()`, `saveDatabase()`, `syncCollectionFully()`, `triggerAutoBackup()`, `checkNightlyBackup()`, `restoreDatabaseFromCloud()`
- **ระดับความเสี่ยง:** 🔴 High (อาจกระทบต่อการ Sync ข้อมูลออนไลน์/ออฟไลน์)
- **Checklist การทบทวนความถูกต้อง:**
  - [ ] หาก Firebase ออฟไลน์ ระบบต้องถอยกลับมาใช้ Cache fallback ได้อย่างปลอดภัย
  - [ ] การทำ Backup อัตโนมัติในตอนกลางคืนต้องทำงานสม่ำเสมอ
  - [ ] ตรวจสอบว่า API calls ไปยัง Firestore ไม่มีผลลัพธ์เป็น Null Reference

---

### 🔴 Phase 3: การสกัดระบบ Auth และเซสชัน (Extract Auth & Session)
- **เป้าหมาย:** แยก Logic การตรวจสอบสิทธิ์การใช้งาน (RBAC) และการล็อกอินเข้าสู่ระบบ
- **ไฟล์ที่สร้างใหม่:** `js/auth.js`
- **เมธอดที่จะย้าย:** `login()`, `logout()`, `loadSession()`, `completeLogin()`, `openChangePasswordModal()`, `changePasswordSubmit()`, `updateUserUI()`
- **ระดับความเสี่ยง:** 🔴 High (เป็นจุดเสี่ยงด้านความปลอดภัยและความถูกต้องของสิทธิ์)
- **Checklist การทบทวนความถูกต้อง:**
  - [ ] ผู้ใช้ต้องไม่สามารถเข้าถึงหน้าอื่นๆ นอกเหนือจาก Guest Dashboard ได้หากยังไม่ได้ Login
  - [ ] การเปลี่ยนรหัสผ่านในการเข้าใช้งานครั้งแรก (First Login Enforce) ต้องสามารถบล็อกผู้ใช้ได้อย่างสมบูรณ์
  - [ ] การสลับสิทธิ์การเข้าใช้งานของผู้ใช้องค์กรต้องสะท้อนในระดับ UI อย่างถูกต้อง

---

### 🔴 Phase 4: การสกัดระบบ Attendance และคิวออฟไลน์ (Extract Attendance)
- **เป้าหมาย:** แยกแผงเช็กชื่อนักเรียน ฟังก์ชัน staging queue และฟังก์ชัน sync
- **ไฟล์ที่สร้างใหม่:** `js/attendance.js`
- **เมธอดที่จะย้าย:** `renderCheckin()`, `renderCheckinStudentList()`, `setStudentStatus()`, `saveCurrentAttendance()`, `syncStagingBatch()`, `syncAllStagingLogsToCloud()`, `loadStagingLogs()`
- **ระดับความเสี่ยง:** 🔴 High (เป็นโมดูลหลักของระบบที่มีผู้ใช้งานมากที่สุด)
- **Checklist การทบทวนความถูกต้อง:**
  - [ ] การเช็กชื่อขณะออฟไลน์ต้องสามารถบันทึกลง Local Staging Queue และแสดง Badge แจ้งเตือนได้ถูกต้อง
  - [ ] เมื่อต่ออินเทอร์เน็ต คิวทั้งหมดต้อง Sync เข้าสู่ Firestore สำเร็จและลบข้อมูลใน LocalStorage
  - [ ] แผงควบคุมและประวัติเช็กชื่อของครูต้องอัปเดตสถิติตามฐานที่รับผิดชอบ

---

### 🟡 Phase 5: การสกัดระบบจัดการแผนกิจกรรมพอเพียง (Extract Sufficiency Activity Planner)
- **เป้าหมาย:** แยก Logic การสร้าง แก้ไข บันทึก ตีกลับ และอนุมัติแผนการจัดกิจกรรมการเรียนรู้พอเพียง
- **ไฟล์ที่สร้างใหม่:** `js/planner.js`
- **เมธอดที่จะย้าย:** `renderLessonPlanner()`, `renderLessonPlanForm()`, `saveLessonPlan()`, `renderLessonPlanDetail()`, `submitForApproval()`, `approveLessonPlan()`, `rejectLessonPlan()`
- **ระดับความเสี่ยง:** 🟡 Medium (เกี่ยวข้องกับการคำนวณและเก็บข้อมูลตัวเลือก Framework 2-3-4-3-4)
- **Checklist การทบทวนความถูกต้อง:**
  - [ ] เช็คบ็อกซ์ทั้ง 5 ด้านของเงื่อนไขเศรษฐกิจพอเพียงต้องสามารถเก็บค่าและแปลงลง Firestore ได้อย่างครบถ้วน
  - [ ] ผู้อำนวยการและศึกษานิเทศก์ต้องมองเห็นปุ่มตรวจและพิมพ์ความเห็นประกอบได้
  - [ ] ข้อมูลแผนกิจกรรมเก่าที่ไม่มีฟิลด์ framework ต้องโหลดได้ปกติ (Backward Compatibility)

---

### 🟡 Phase 6: การสกัดส่วน Dashboard และ Analytics (Extract Dashboard & Analytics)
- **เป้าหมาย:** แยก Logic การสร้างข้อมูลสถิติและการวาดกราฟสำหรับผู้บริหาร
- **ไฟล์ที่สร้างใหม่:** `js/dashboard.js`
- **เมธอดที่จะย้าย:** `renderDashboard()`, `renderExecutiveCards()`, `loadDashboardStats()`
- **ระดับความเสี่ยง:** 🟡 Medium (เกี่ยวข้องกับ Chart.js library)
- **Checklist การทบทวนความถูกต้อง:**
  - [ ] กราฟต้องสามารถวาดข้อมูลสถิติรายสัปดาห์และรายระดับชั้นออกมาได้อย่างถูกต้อง
  - [ ] สรุปตัวเลขยอดสะสมการมาเรียนเฉลี่ยและสถิติการส่งแผนการจัดกิจกรรมต้องสอดคล้องกับฐานข้อมูลจริง
  - [ ] หน้าจอการเรนเดอร์กราฟต้องไม่มี layout shift บนมือถือ

---

### 🟡 Phase 7: การสกัดส่วนจัดการรายงานและการส่งออก (Extract Reports & Export)
- **เป้าหมาย:** แยกส่วนรายงานผลรายบุคคล การกรองข้อมูลเช็กชื่อ และการแปลงข้อมูลเป็นไฟล์ Excel/PDF
- **ไฟล์ที่สร้างใหม่:** `js/reports.js`
- **เมธอดที่จะย้าย:** `renderReports()`, `generateReport()`, `exportReportToExcel()`, `exportRotationToExcel()`
- **ระดับความเสี่ยง:** 🟡 Medium (เกี่ยวกับ CSS print stylesheets และ JS Excel library)
- **Checklist การทบทวนความถูกต้อง:**
  - [ ] รายงานที่สร้างผ่านเบราว์เซอร์ต้องคงความกว้าง ความยาว และแสดงรายละเอียดครบถ้วน
  - [ ] ไฟล์ Excel ที่ส่งออกต้องมีคอลัมน์ชื่อนักเรียน รหัส และฐานเรียนรู้ครบถ้วน และเปิดด้วยซอฟต์แวร์สเปรดชีตได้สมบูรณ์

---

### 🟢 Phase 8: การเพิ่มกรอบการรันทดสอบระบบ (Add Test Harness & CI Checks)
- **เป้าหมาย:** สร้างระบบทดสอบแบบอัตโนมัติ (automated tests) และกำหนดขั้นตอนการตรวจสอบความสอดคล้องของโปรเจกต์
- **ไฟล์ที่สร้างใหม่:** `tests/run_tests.js`, `.github/workflows/verify.yml`
- **ระดับความเสี่ยง:** 🟢 Low (รันเฉพาะในสภาพแวดล้อมการพัฒนา)
- **Checklist การทบทวนความถูกต้อง:**
  - [ ] สามารถรันชุดคำสั่งตรวจเช็ก syntax ทั้งหมดผ่าน CLI สำเร็จ
  - [ ] ทุกครั้งที่มีการ Pull Request หรือ Merge โค้ดไปยัง branch หลัก ระบบต้องรัน test ผ่าน 100%
