# 🗂️ ดัชนีฟังก์ชันใน app.js (app.js Function Index)

**Academic Management Platform (AMP)** — โรงเรียนไพวิทยาคาร | Version: v2.2.0

เอกสารนี้รวบรวมรายการฟังก์ชันและเมธอดทั้งหมดของคลาส `AttendanceApp` ใน `app.js` เพื่อจัดทำดัชนีระบุช่วงบรรทัด หน้าที่ของฟังก์ชัน ความเกี่ยวเนื่อง และแผนสำหรับการย้ายไปยังโมดูลย่อยในอนาคต

---

## 📊 ดัชนีเมธอด (Method Index Table)

| เมธอด (Method Name) | หน้าที่และความรับผิดชอบ (Purpose) | ช่วงบรรทัด (Lines) | Dependencies ปัจจุบัน | โมดูลในอนาคต (Future Module) | แผนการจัดการ (Action) | ระดับความเสี่ยง (Risk) |
|---|---|---|---|---|---|---|
| `constructor()` | แอปพลิเคชันคอร์และอินเตอร์เฟซหลัก | 4 - 38 | LocalStorage, DOM | `ui.js / app.js` | Keep/Refactor | Medium |
| `async init()` | แอปพลิเคชันคอร์และอินเตอร์เฟซหลัก | 39 - 114 | LocalStorage, DOM | `ui.js / app.js` | Keep/Refactor | Medium |
| `initFirestore()` | แอปพลิเคชันคอร์และอินเตอร์เฟซหลัก | 115 - 173 | LocalStorage, DOM | `ui.js / app.js` | Keep/Refactor | Medium |
| `syncFirebaseUser()` | บริการซิงก์ เชื่อมต่อ และจัดการข้อมูล Cloud | 174 - 192 | LocalStorage, DOM | `firebase-service.js` | Move | High |
| `updateFirestoreConnectionStatus(connected)` | บริการซิงก์ เชื่อมต่อ และจัดการข้อมูล Cloud | 193 - 207 | LocalStorage, DOM | `firebase-service.js` | Move | High |
| `updateOfflineSyncWarning(hasPending)` | ฟังก์ชันยูทิลิตี้และการจัดการทั่วไป | 208 - 252 | LocalStorage, DOM | `utils.js` | Move | Low |
| `async tryReconnectCloud(event)` | บริการซิงก์ เชื่อมต่อ และจัดการข้อมูล Cloud | 253 - 299 | LocalStorage, DOM | `firebase-service.js` | Move | High |
| `async tryReconnectCloudFromLogin(event)` | บริการซิงก์ เชื่อมต่อ และจัดการข้อมูล Cloud | 300 - 336 | LocalStorage, DOM | `firebase-service.js` | Move | High |
| `clearSystemCache(event)` | ฟังก์ชันยูทิลิตี้และการจัดการทั่วไป | 337 - 373 | LocalStorage, DOM | `utils.js` | Move | Low |
| `showVersionUpdateBanner()` | ฟังก์ชันยูทิลิตี้และการจัดการทั่วไป | 374 - 446 | LocalStorage, DOM | `utils.js` | Move | Low |
| `async getDocWithCacheFallback(docRef)` | บริการซิงก์ เชื่อมต่อ และจัดการข้อมูล Cloud | 447 - 465 | LocalStorage, DOM | `firebase-service.js` | Move | High |
| `async getCollectionWithCacheFallback(colRef)` | บริการซิงก์ เชื่อมต่อ และจัดการข้อมูล Cloud | 466 - 486 | LocalStorage, DOM | `firebase-service.js` | Move | High |
| `async loadDatabase(timeoutMs = 20000)` | บริการซิงก์ เชื่อมต่อ และจัดการข้อมูล Cloud | 487 - 616 | LocalStorage, DOM | `firebase-service.js` | Move | High |
| `loadDatabaseFromLocalStorage()` | บริการซิงก์ เชื่อมต่อ และจัดการข้อมูล Cloud | 617 - 662 | LocalStorage, DOM | `firebase-service.js` | Move | High |
| `initializeEmptyDatabase()` | แอปพลิเคชันคอร์และอินเตอร์เฟซหลัก | 663 - 699 | LocalStorage, DOM | `ui.js / app.js` | Keep/Refactor | Medium |
| `async loadDatabaseFromCloudInBackground()` | บริการซิงก์ เชื่อมต่อ และจัดการข้อมูล Cloud | 700 - 805 | LocalStorage, DOM | `firebase-service.js` | Move | High |
| `async saveDatabase(saveLogsToFirestore = false, collectionsToSync = null)` | บริการซิงก์ เชื่อมต่อ และจัดการข้อมูล Cloud | 806 - 875 | LocalStorage, DOM | `firebase-service.js` | Move | High |
| `async syncCollectionFully(collectionName, dataArray, getDocIdFn)` | บริการซิงก์ เชื่อมต่อ และจัดการข้อมูล Cloud | 876 - 925 | LocalStorage, DOM | `firebase-service.js` | Move | High |
| `async triggerAutoBackup(isNightly = false)` | บริการซิงก์ เชื่อมต่อ และจัดการข้อมูล Cloud | 926 - 952 | LocalStorage, DOM | `firebase-service.js` | Move | High |
| `async checkNightlyBackup()` | บริการซิงก์ เชื่อมต่อ และจัดการข้อมูล Cloud | 953 - 981 | LocalStorage, DOM | `firebase-service.js` | Move | High |
| `async loadCloudBackups()` | บริการซิงก์ เชื่อมต่อ และจัดการข้อมูล Cloud | 982 - 1026 | LocalStorage, DOM | `firebase-service.js` | Move | High |
| `async restoreDatabaseFromCloud(backupId)` | บริการซิงก์ เชื่อมต่อ และจัดการข้อมูล Cloud | 1027 - 1055 | LocalStorage, DOM | `firebase-service.js` | Move | High |
| `async manualCloudBackup()` | บริการซิงก์ เชื่อมต่อ และจัดการข้อมูล Cloud | 1056 - 1069 | LocalStorage, DOM | `firebase-service.js` | Move | High |
| `async logAudit(actionDescription)` | บริการซิงก์ เชื่อมต่อ และจัดการข้อมูล Cloud | 1070 - 1088 | LocalStorage, DOM | `firebase-service.js` | Move | High |
| `async loadAuditLogs()` | บริการซิงก์ เชื่อมต่อ และจัดการข้อมูล Cloud | 1089 - 1129 | LocalStorage, DOM | `firebase-service.js` | Move | High |
| `runMigrationChecks()` | ฟังก์ชันยูทิลิตี้และการจัดการทั่วไป | 1130 - 1428 | LocalStorage, DOM | `utils.js` | Move | Low |
| `resetToDemoData(showConfirm = true)` | ฟังก์ชันยูทิลิตี้และการจัดการทั่วไป | 1429 - 1665 | LocalStorage, DOM | `utils.js` | Move | Low |
| `resetToEmptyData(showConfirm = true)` | ฟังก์ชันยูทิลิตี้และการจัดการทั่วไป | 1666 - 1714 | LocalStorage, DOM | `utils.js` | Move | Low |
| `async clearStudentsOnly(showConfirm = true)` | บริการซิงก์ เชื่อมต่อ และจัดการข้อมูล Cloud | 1715 - 1732 | LocalStorage, DOM | `firebase-service.js` | Move | High |
| `bindEvents()` | แอปพลิเคชันคอร์และอินเตอร์เฟซหลัก | 1733 - 1880 | LocalStorage, DOM | `ui.js / app.js` | Keep/Refactor | Medium |
| `switchView(viewId)` | แอปพลิเคชันคอร์และอินเตอร์เฟซหลัก | 1881 - 1962 | LocalStorage, DOM | `ui.js / app.js` | Keep/Refactor | Medium |
| `openModal(modalId)` | ฟังก์ชันยูทิลิตี้และการจัดการทั่วไป | 1963 - 2033 | LocalStorage, DOM | `utils.js` | Move | Low |
| `closeModal(modalId)` | ฟังก์ชันยูทิลิตี้และการจัดการทั่วไป | 2034 - 2037 | LocalStorage, DOM | `utils.js` | Move | Low |
| `togglePasswordVisibility(inputId, btn)` | ระบบยืนยันตัวตนและจัดการเซสชัน | 2038 - 2056 | LocalStorage, DOM | `auth.js` | Move | High |
| `populateLoginSuggestions()` | ฟังก์ชันยูทิลิตี้และการจัดการทั่วไป | 2057 - 2149 | LocalStorage, DOM | `utils.js` | Move | Low |
| `setupLoginAutoComplete()` | ฟังก์ชันยูทิลิตี้และการจัดการทั่วไป | 2150 - 2226 | LocalStorage, DOM | `utils.js` | Move | Low |
| `loadSession()` | ระบบยืนยันตัวตนและจัดการเซสชัน | 2227 - 2259 | LocalStorage, DOM | `auth.js` | Move | High |
| `async completeLogin(userObj)` | บริการซิงก์ เชื่อมต่อ และจัดการข้อมูล Cloud | 2260 - 2288 | LocalStorage, DOM | `firebase-service.js` | Move | High |
| `updateUserUI()` | ระบบยืนยันตัวตนและจัดการเซสชัน | 2289 - 2437 | LocalStorage, DOM | `auth.js` | Move | High |
| `async retryLoginProfileLoad(event)` | บริการซิงก์ เชื่อมต่อ และจัดการข้อมูล Cloud | 2438 - 2488 | LocalStorage, DOM | `firebase-service.js` | Move | High |
| `async retryCheckinDataLoad(event)` | บริการซิงก์ เชื่อมต่อ และจัดการข้อมูล Cloud | 2489 - 2516 | LocalStorage, DOM | `firebase-service.js` | Move | High |
| `async login()` | บริการซิงก์ เชื่อมต่อ และจัดการข้อมูล Cloud | 2517 - 2769 | LocalStorage, DOM | `firebase-service.js` | Move | High |
| `async logout()` | บริการซิงก์ เชื่อมต่อ และจัดการข้อมูล Cloud | 2770 - 2786 | LocalStorage, DOM | `firebase-service.js` | Move | High |
| `openChangePasswordModal(force = false)` | ระบบยืนยันตัวตนและจัดการเซสชัน | 2787 - 2807 | LocalStorage, DOM | `auth.js` | Move | High |
| `async changePasswordSubmit()` | บริการซิงก์ เชื่อมต่อ และจัดการข้อมูล Cloud | 2808 - 2883 | LocalStorage, DOM | `firebase-service.js` | Move | High |
| `render()` | แอปพลิเคชันคอร์และอินเตอร์เฟซหลัก | 2884 - 2955 | LocalStorage, DOM | `ui.js / app.js` | Keep/Refactor | Medium |
| `formatThaiDateShort(dateStr)` | ยูทิลิตี้แชร์ข้อมูล สัญกรณ์ไทย และการช่วยทำงาน | 2956 - 2975 | LocalStorage, DOM | `utils.js` | Move | Low |
| `getWeekByDate(dateStr)` | ยูทิลิตี้แชร์ข้อมูล สัญกรณ์ไทย และการช่วยทำงาน | 2976 - 3016 | LocalStorage, DOM | `utils.js` | Move | Low |
| `renderDashboard()` | การเรนเดอร์ UI เฉพาะโมดูล | 3017 - 3192 | LocalStorage, DOM | `ui.js` | Move | Medium |
| `renderExecutiveCards(containerId)` | การเรนเดอร์ UI เฉพาะโมดูล | 3193 - 3306 | LocalStorage, DOM | `ui.js` | Move | Medium |
| `renderCheckin()` | ระบบบันทึกการเข้าเรียนและจัดการ Staging Queue | 3307 - 3600 | LocalStorage, DOM | `attendance.js` | Move | High |
| `renderCheckinStudentList(searchQuery = '')` | ระบบบันทึกการเข้าเรียนและจัดการ Staging Queue | 3601 - 3661 | LocalStorage, DOM | `attendance.js` | Move | High |
| `setStudentStatus(studentId, status)` | ระบบบันทึกการเข้าเรียนและจัดการ Staging Queue | 3662 - 3669 | LocalStorage, DOM | `attendance.js` | Move | High |
| `checkAllPresent()` | ระบบบันทึกการเข้าเรียนและจัดการ Staging Queue | 3670 - 3677 | LocalStorage, DOM | `attendance.js` | Move | High |
| `resetCurrentCheckin()` | ระบบบันทึกการเข้าเรียนและจัดการ Staging Queue | 3678 - 3688 | LocalStorage, DOM | `attendance.js` | Move | High |
| `selectCheckinClass(clsName, clickedBtn)` | ระบบบันทึกการเข้าเรียนและจัดการ Staging Queue | 3689 - 3742 | LocalStorage, DOM | `attendance.js` | Move | High |
| `updateCheckinCounters()` | ระบบบันทึกการเข้าเรียนและจัดการ Staging Queue | 3743 - 3768 | LocalStorage, DOM | `attendance.js` | Move | High |
| `filterCheckinList(value)` | ระบบบันทึกการเข้าเรียนและจัดการ Staging Queue | 3769 - 3773 | LocalStorage, DOM | `attendance.js` | Move | High |
| `setCheckinRating(rating)` | ระบบบันทึกการเข้าเรียนและจัดการ Staging Queue | 3774 - 3792 | LocalStorage, DOM | `attendance.js` | Move | High |
| `resetCheckinRating()` | ระบบบันทึกการเข้าเรียนและจัดการ Staging Queue | 3793 - 3805 | LocalStorage, DOM | `attendance.js` | Move | High |
| `handleCheckinPhotoSelected(input)` | ระบบบันทึกการเข้าเรียนและจัดการ Staging Queue | 3806 - 3858 | LocalStorage, DOM | `attendance.js` | Move | High |
| `clearCheckinPhoto(e)` | ระบบบันทึกการเข้าเรียนและจัดการ Staging Queue | 3859 - 3872 | LocalStorage, DOM | `attendance.js` | Move | High |
| `handleCheckinDocSelected(input)` | ระบบบันทึกการเข้าเรียนและจัดการ Staging Queue | 3873 - 3895 | LocalStorage, DOM | `attendance.js` | Move | High |
| `async saveCurrentAttendance()` | บริการซิงก์ เชื่อมต่อ และจัดการข้อมูล Cloud | 3896 - 3899 | LocalStorage, DOM | `firebase-service.js` | Move | High |
| `async saveCurrentAttendanceWithOptions(isStaging)` | บริการซิงก์ เชื่อมต่อ และจัดการข้อมูล Cloud | 3900 - 4080 | LocalStorage, DOM | `firebase-service.js` | Move | High |
| `async syncStagingBatch(batchId)` | บริการซิงก์ เชื่อมต่อ และจัดการข้อมูล Cloud | 4081 - 4183 | LocalStorage, DOM | `firebase-service.js` | Move | High |
| `async deleteStagingBatch(batchId)` | บริการซิงก์ เชื่อมต่อ และจัดการข้อมูล Cloud | 4184 - 4204 | LocalStorage, DOM | `firebase-service.js` | Move | High |
| `async syncAllStagingLogsToCloud()` | บริการซิงก์ เชื่อมต่อ และจัดการข้อมูล Cloud | 4205 - 4329 | LocalStorage, DOM | `firebase-service.js` | Move | High |
| `loadStagingLogs()` | ระบบบันทึกการเข้าเรียนและจัดการ Staging Queue | 4330 - 4373 | LocalStorage, DOM | `attendance.js` | Move | High |
| `openStagingDetailsModal(batchId)` | ระบบบันทึกการเข้าเรียนและจัดการ Staging Queue | 4374 - 4485 | LocalStorage, DOM | `attendance.js` | Move | High |
| `updateStagingBadgeCount()` | ระบบบันทึกการเข้าเรียนและจัดการ Staging Queue | 4486 - 4499 | LocalStorage, DOM | `attendance.js` | Move | High |
| `renderAdmin()` | การเรนเดอร์ UI เฉพาะโมดูล | 4500 - 4647 | LocalStorage, DOM | `ui.js` | Move | Medium |
| `renderReports()` | ระบบสร้างรายงานและส่งออกไฟล์ | 4648 - 4691 | LocalStorage, DOM | `reports.js` | Move | Medium |
| `toggleReportFilters(type)` | ระบบสร้างรายงานและส่งออกไฟล์ | 4692 - 4715 | LocalStorage, DOM | `reports.js` | Move | Medium |
| `generateReport()` | ระบบสร้างรายงานและส่งออกไฟล์ | 4716 - 5051 | LocalStorage, DOM | `reports.js` | Move | Medium |
| `exportReportToExcel()` | ระบบสร้างรายงานและส่งออกไฟล์ | 5052 - 5066 | LocalStorage, DOM | `reports.js` | Move | Medium |
| `renderManage()` | การเรนเดอร์ UI เฉพาะโมดูล | 5067 - 5079 | LocalStorage, DOM | `ui.js` | Move | Medium |
| `async runUserDataIntegrityCheck()` | บริการซิงก์ เชื่อมต่อ และจัดการข้อมูล Cloud | 5080 - 5132 | LocalStorage, DOM | `firebase-service.js` | Move | High |
| `analyzeUserDataIntegrity(users, userProfiles, userAccounts, teachers)` | ระบบยืนยันตัวตนและจัดการเซสชัน | 5133 - 5445 | LocalStorage, DOM | `auth.js` | Move | High |
| `renderIntegrityReport(report, users, userProfiles, userAccounts)` | ระบบสร้างรายงานและส่งออกไฟล์ | 5446 - 5632 | LocalStorage, DOM | `reports.js` | Move | Medium |
| `getIntegrityIssueLabel(type)` | การจัดการฐานข้อมูลและสิทธิ์ผู้ดูแลระบบ | 5633 - 5647 | LocalStorage, DOM | `settings.js` | Move | High |
| `showDryRunRepair(type, uid, issue)` | การจัดการฐานข้อมูลและสิทธิ์ผู้ดูแลระบบ | 5648 - 5720 | LocalStorage, DOM | `settings.js` | Move | High |
| `exportIntegrityReport(report)` | ระบบสร้างรายงานและส่งออกไฟล์ | 5721 - 5731 | LocalStorage, DOM | `reports.js` | Move | Medium |
| `async handleForgotPassword(event)` | บริการซิงก์ เชื่อมต่อ และจัดการข้อมูล Cloud | 5732 - 5778 | LocalStorage, DOM | `firebase-service.js` | Move | High |
| `showRecoveryActionModal(uid, name, email, statusType, issue)` | ฟังก์ชันยูทิลิตี้และการจัดการทั่วไป | 5779 - 5818 | LocalStorage, DOM | `utils.js` | Move | Low |
| `async sendFirebasePasswordReset(email)` | บริการซิงก์ เชื่อมต่อ และจัดการข้อมูล Cloud | 5819 - 5836 | LocalStorage, DOM | `firebase-service.js` | Move | High |
| `switchManageTab(tabId)` | ฟังก์ชันยูทิลิตี้และการจัดการทั่วไป | 5837 - 5891 | LocalStorage, DOM | `utils.js` | Move | Low |
| `getFilteredStudents()` | ฟังก์ชันยูทิลิตี้และการจัดการทั่วไป | 5892 - 5902 | LocalStorage, DOM | `utils.js` | Move | Low |
| `renderManageStudents()` | การเรนเดอร์ UI เฉพาะโมดูล | 5903 - 5962 | LocalStorage, DOM | `ui.js` | Move | Medium |
| `renderManageTeachers()` | การเรนเดอร์ UI เฉพาะโมดูล | 5963 - 6025 | LocalStorage, DOM | `ui.js` | Move | Medium |
| `toggleCheckAllStudents(masterCheckbox)` | ฟังก์ชันยูทิลิตี้และการจัดการทั่วไป | 6026 - 6041 | LocalStorage, DOM | `utils.js` | Move | Low |
| `toggleCheckAllTeachers(masterCheckbox)` | ฟังก์ชันยูทิลิตี้และการจัดการทั่วไป | 6042 - 6057 | LocalStorage, DOM | `utils.js` | Move | Low |
| `handleStudentCheckboxChange(cb)` | ฟังก์ชันยูทิลิตี้และการจัดการทั่วไป | 6058 - 6077 | LocalStorage, DOM | `utils.js` | Move | Low |
| `handleTeacherCheckboxChange(cb)` | ฟังก์ชันยูทิลิตี้และการจัดการทั่วไป | 6078 - 6097 | LocalStorage, DOM | `utils.js` | Move | Low |
| `updateStudentSelectionUI()` | ฟังก์ชันยูทิลิตี้และการจัดการทั่วไป | 6098 - 6111 | LocalStorage, DOM | `utils.js` | Move | Low |
| `updateTeacherSelectionUI()` | ฟังก์ชันยูทิลิตี้และการจัดการทั่วไป | 6112 - 6125 | LocalStorage, DOM | `utils.js` | Move | Low |
| `async deleteSelectedStudents()` | บริการซิงก์ เชื่อมต่อ และจัดการข้อมูล Cloud | 6126 - 6173 | LocalStorage, DOM | `firebase-service.js` | Move | High |
| `deleteSelectedTeachers()` | ฟังก์ชันยูทิลิตี้และการจัดการทั่วไป | 6174 - 6206 | LocalStorage, DOM | `utils.js` | Move | Low |
| `renderManageBases()` | จัดการตารางหมุนเวียนและฐานเรียนรู้ | 6207 - 6252 | LocalStorage, DOM | `rotation.js` | Move | Medium |
| `renderManageSchedule()` | จัดการตารางหมุนเวียนและฐานเรียนรู้ | 6253 - 6303 | LocalStorage, DOM | `rotation.js` | Move | Medium |
| `openAddStudentModal()` | ฟังก์ชันยูทิลิตี้และการจัดการทั่วไป | 6304 - 6315 | LocalStorage, DOM | `utils.js` | Move | Low |
| `openEditStudentModal(studentId)` | ฟังก์ชันยูทิลิตี้และการจัดการทั่วไป | 6316 - 6331 | LocalStorage, DOM | `utils.js` | Move | Low |
| `saveStudentFromForm()` | การจัดการฐานข้อมูลและสิทธิ์ผู้ดูแลระบบ | 6332 - 6381 | LocalStorage, DOM | `settings.js` | Move | High |
| `async deleteStudent(studentId)` | บริการซิงก์ เชื่อมต่อ และจัดการข้อมูล Cloud | 6382 - 6404 | LocalStorage, DOM | `firebase-service.js` | Move | High |
| `openAddTeacherModal()` | ฟังก์ชันยูทิลิตี้และการจัดการทั่วไป | 6405 - 6414 | LocalStorage, DOM | `utils.js` | Move | Low |
| `openEditTeacherModal(username)` | ฟังก์ชันยูทิลิตี้และการจัดการทั่วไป | 6415 - 6427 | LocalStorage, DOM | `utils.js` | Move | Low |
| `saveTeacherFromForm()` | การจัดการฐานข้อมูลและสิทธิ์ผู้ดูแลระบบ | 6428 - 6464 | LocalStorage, DOM | `settings.js` | Move | High |
| `deleteTeacher(username)` | ฟังก์ชันยูทิลิตี้และการจัดการทั่วไป | 6465 - 6477 | LocalStorage, DOM | `utils.js` | Move | Low |
| `async resetTeacherPassword(username)` | บริการซิงก์ เชื่อมต่อ และจัดการข้อมูล Cloud | 6478 - 6503 | LocalStorage, DOM | `firebase-service.js` | Move | High |
| `openAddBaseModal()` | จัดการตารางหมุนเวียนและฐานเรียนรู้ | 6504 - 6516 | LocalStorage, DOM | `rotation.js` | Move | Medium |
| `openEditBaseModal(id)` | จัดการตารางหมุนเวียนและฐานเรียนรู้ | 6517 - 6534 | LocalStorage, DOM | `rotation.js` | Move | Medium |
| `saveBaseFromForm()` | จัดการตารางหมุนเวียนและฐานเรียนรู้ | 6535 - 6584 | LocalStorage, DOM | `rotation.js` | Move | Medium |
| `deleteBase(id)` | จัดการตารางหมุนเวียนและฐานเรียนรู้ | 6585 - 6599 | LocalStorage, DOM | `rotation.js` | Move | Medium |
| `openManageBaseClassRoomsModal(baseId)` | จัดการตารางหมุนเวียนและฐานเรียนรู้ | 6600 - 6632 | LocalStorage, DOM | `rotation.js` | Move | Medium |
| `_appendBaseClassRoomRow(container, clsValue, roomValue)` | จัดการตารางหมุนเวียนและฐานเรียนรู้ | 6633 - 6654 | LocalStorage, DOM | `rotation.js` | Move | Medium |
| `addBaseClassRoomRow()` | จัดการตารางหมุนเวียนและฐานเรียนรู้ | 6655 - 6662 | LocalStorage, DOM | `rotation.js` | Move | Medium |
| `removeBaseClassRoomRow(btn)` | จัดการตารางหมุนเวียนและฐานเรียนรู้ | 6663 - 6671 | LocalStorage, DOM | `rotation.js` | Move | Medium |
| `saveBaseClassRoomsFromModal()` | จัดการตารางหมุนเวียนและฐานเรียนรู้ | 6672 - 6728 | LocalStorage, DOM | `rotation.js` | Move | Medium |
| `openAddScheduleModal()` | จัดการตารางหมุนเวียนและฐานเรียนรู้ | 6729 - 6738 | LocalStorage, DOM | `rotation.js` | Move | Medium |
| `openEditScheduleModal(index)` | จัดการตารางหมุนเวียนและฐานเรียนรู้ | 6739 - 6754 | LocalStorage, DOM | `rotation.js` | Move | Medium |
| `saveScheduleFromForm()` | จัดการตารางหมุนเวียนและฐานเรียนรู้ | 6755 - 6805 | LocalStorage, DOM | `rotation.js` | Move | Medium |
| `deleteSchedule(index)` | จัดการตารางหมุนเวียนและฐานเรียนรู้ | 6806 - 6816 | LocalStorage, DOM | `rotation.js` | Move | Medium |
| `handleExcelImport(inputElement, type)` | ระบบสร้างรายงานและส่งออกไฟล์ | 6817 - 6845 | LocalStorage, DOM | `reports.js` | Move | Medium |
| `importStudents(rows)` | ฟังก์ชันยูทิลิตี้และการจัดการทั่วไป | 6846 - 6897 | LocalStorage, DOM | `utils.js` | Move | Low |
| `importTeachers(rows)` | ฟังก์ชันยูทิลิตี้และการจัดการทั่วไป | 6898 - 6940 | LocalStorage, DOM | `utils.js` | Move | Low |
| `importSchedule(rows)` | จัดการตารางหมุนเวียนและฐานเรียนรู้ | 6941 - 6979 | LocalStorage, DOM | `rotation.js` | Move | Medium |
| `downloadStudentTemplate()` | ยูทิลิตี้แชร์ข้อมูล สัญกรณ์ไทย และการช่วยทำงาน | 6980 - 6991 | LocalStorage, DOM | `utils.js` | Move | Low |
| `downloadTeacherTemplate()` | ยูทิลิตี้แชร์ข้อมูล สัญกรณ์ไทย และการช่วยทำงาน | 6992 - 7002 | LocalStorage, DOM | `utils.js` | Move | Low |
| `downloadScheduleTemplate()` | จัดการตารางหมุนเวียนและฐานเรียนรู้ | 7003 - 7012 | LocalStorage, DOM | `rotation.js` | Move | Medium |
| `backupDatabase()` | ฟังก์ชันยูทิลิตี้และการจัดการทั่วไป | 7013 - 7037 | LocalStorage, DOM | `utils.js` | Move | Low |
| `restoreDatabase(inputElement)` | บริการซิงก์ เชื่อมต่อ และจัดการข้อมูล Cloud | 7038 - 7062 | LocalStorage, DOM | `firebase-service.js` | Move | High |
| `formatThaiDate(dateStr)` | ยูทิลิตี้แชร์ข้อมูล สัญกรณ์ไทย และการช่วยทำงาน | 7063 - 7079 | LocalStorage, DOM | `utils.js` | Move | Low |
| `renderRotation()` | จัดการตารางหมุนเวียนและฐานเรียนรู้ | 7080 - 7186 | LocalStorage, DOM | `rotation.js` | Move | Medium |
| `showRotationDetail(weekNum, baseId)` | จัดการตารางหมุนเวียนและฐานเรียนรู้ | 7187 - 7240 | LocalStorage, DOM | `rotation.js` | Move | Medium |
| `renderRotationDetailStudents(clsName)` | จัดการตารางหมุนเวียนและฐานเรียนรู้ | 7241 - 7271 | LocalStorage, DOM | `rotation.js` | Move | Medium |
| `exportRotationToExcel()` | จัดการตารางหมุนเวียนและฐานเรียนรู้ | 7272 - 7284 | LocalStorage, DOM | `rotation.js` | Move | Medium |
| `handleImageOcrImport(inputElement)` | ยูทิลิตี้แชร์ข้อมูล สัญกรณ์ไทย และการช่วยทำงาน | 7285 - 7376 | LocalStorage, DOM | `utils.js` | Move | Low |
| `parseOcrTextToCalendar(text)` | จัดการปฏิทินรายวิชา วันหยุด และบทเรียน | 7377 - 7449 | LocalStorage, DOM | `calendar.js` | Move | Medium |
| `renderOcrReviewTable(parsedData)` | ยูทิลิตี้แชร์ข้อมูล สัญกรณ์ไทย และการช่วยทำงาน | 7450 - 7528 | LocalStorage, DOM | `utils.js` | Move | Low |
| `saveOcrImportedSchedule()` | จัดการตารางหมุนเวียนและฐานเรียนรู้ | 7529 - 7645 | LocalStorage, DOM | `rotation.js` | Move | Medium |
| `getRoomTeachers(roomName)` | จัดการตารางหมุนเวียนและฐานเรียนรู้ | 7646 - 7659 | LocalStorage, DOM | `rotation.js` | Move | Medium |
| `getClassesForBaseAndGrade(baseId, grade, isWeekB)` | จัดการตารางหมุนเวียนและฐานเรียนรู้ | 7660 - 7760 | LocalStorage, DOM | `rotation.js` | Move | Medium |
| `ensureScheduleRowProperties(sch)` | จัดการตารางหมุนเวียนและฐานเรียนรู้ | 7761 - 7823 | LocalStorage, DOM | `rotation.js` | Move | Medium |
| `validateAttendanceGeneration(scheduleRow)` | ระบบบันทึกการเข้าเรียนและจัดการ Staging Queue | 7824 - 7858 | LocalStorage, DOM | `attendance.js` | Move | High |
| `showStatusModal(type, title, message, buttonsHtml = null)` | ฟังก์ชันยูทิลิตี้และการจัดการทั่วไป | 7859 - 7990 | LocalStorage, DOM | `utils.js` | Move | Low |
| `renderCalendar()` | จัดการปฏิทินรายวิชา วันหยุด และบทเรียน | 7991 - 8052 | LocalStorage, DOM | `calendar.js` | Move | Medium |
| `_renderCalendarGrid(items)` | จัดการปฏิทินรายวิชา วันหยุด และบทเรียน | 8053 - 8090 | LocalStorage, DOM | `calendar.js` | Move | Medium |
| `_renderCalendarTimeline(items)` | จัดการปฏิทินรายวิชา วันหยุด และบทเรียน | 8091 - 8128 | LocalStorage, DOM | `calendar.js` | Move | Medium |
| `switchCalendarMode(mode)` | จัดการปฏิทินรายวิชา วันหยุด และบทเรียน | 8129 - 8148 | LocalStorage, DOM | `calendar.js` | Move | Medium |
| `resetCalendarFilters()` | จัดการปฏิทินรายวิชา วันหยุด และบทเรียน | 8149 - 8157 | LocalStorage, DOM | `calendar.js` | Move | Medium |
| `showActivityDetails(idx, scheduleItem)` | ฟังก์ชันยูทิลิตี้และการจัดการทั่วไป | 8158 - 8185 | LocalStorage, DOM | `utils.js` | Move | Low |
| `renderBases()` | จัดการตารางหมุนเวียนและฐานเรียนรู้ | 8186 - 8189 | LocalStorage, DOM | `rotation.js` | Move | Medium |
| `showBasesGrid()` | จัดการตารางหมุนเวียนและฐานเรียนรู้ | 8190 - 8238 | LocalStorage, DOM | `rotation.js` | Move | Medium |
| `showBaseDetails(baseId)` | จัดการตารางหมุนเวียนและฐานเรียนรู้ | 8239 - 8344 | LocalStorage, DOM | `rotation.js` | Move | Medium |
| `renderSearch()` | การเรนเดอร์ UI เฉพาะโมดูล | 8345 - 8360 | LocalStorage, DOM | `ui.js` | Move | Medium |
| `searchActivities()` | ฟังก์ชันยูทิลิตี้และการจัดการทั่วไป | 8361 - 8415 | LocalStorage, DOM | `utils.js` | Move | Low |
| `clearSearchFilters()` | ฟังก์ชันยูทิลิตี้และการจัดการทั่วไป | 8416 - 8432 | LocalStorage, DOM | `utils.js` | Move | Low |
| `renderManageSemesters()` | การเรนเดอร์ UI เฉพาะโมดูล | 8433 - 8469 | LocalStorage, DOM | `ui.js` | Move | Medium |
| `openAddSemesterModal()` | ฟังก์ชันยูทิลิตี้และการจัดการทั่วไป | 8470 - 8492 | LocalStorage, DOM | `utils.js` | Move | Low |
| `saveSemesterFromForm()` | ฟังก์ชันยูทิลิตี้และการจัดการทั่วไป | 8493 - 8518 | LocalStorage, DOM | `utils.js` | Move | Low |
| `setActiveSemester(semId)` | ฟังก์ชันยูทิลิตี้และการจัดการทั่วไป | 8519 - 8528 | LocalStorage, DOM | `utils.js` | Move | Low |
| `deleteSemester(semId)` | ฟังก์ชันยูทิลิตี้และการจัดการทั่วไป | 8529 - 8541 | LocalStorage, DOM | `utils.js` | Move | Low |
| `renderSchoolCalendar()` | จัดการปฏิทินรายวิชา วันหยุด และบทเรียน | 8542 - 8594 | LocalStorage, DOM | `calendar.js` | Move | Medium |
| `openCalendarSetupWizardModal()` | จัดการปฏิทินรายวิชา วันหยุด และบทเรียน | 8595 - 8612 | LocalStorage, DOM | `calendar.js` | Move | Medium |
| `generateCalendarWeeks()` | จัดการปฏิทินรายวิชา วันหยุด และบทเรียน | 8613 - 8663 | LocalStorage, DOM | `calendar.js` | Move | Medium |
| `openSchoolEventModal(index = null)` | ฟังก์ชันยูทิลิตี้และการจัดการทั่วไป | 8664 - 8706 | LocalStorage, DOM | `utils.js` | Move | Low |
| `onCalendarEventTypeChange()` | จัดการปฏิทินรายวิชา วันหยุด และบทเรียน | 8707 - 8718 | LocalStorage, DOM | `calendar.js` | Move | Medium |
| `saveCalendarEvent()` | จัดการปฏิทินรายวิชา วันหยุด และบทเรียน | 8719 - 8792 | LocalStorage, DOM | `calendar.js` | Move | Medium |
| `deleteCalendarEvent(index)` | จัดการปฏิทินรายวิชา วันหยุด และบทเรียน | 8793 - 8816 | LocalStorage, DOM | `calendar.js` | Move | Medium |
| `openCheckinAdminRoomModal()` | ระบบบันทึกการเข้าเรียนและจัดการ Staging Queue | 8817 - 8852 | LocalStorage, DOM | `attendance.js` | Move | High |
| `saveCheckinAdminRoom()` | ระบบบันทึกการเข้าเรียนและจัดการ Staging Queue | 8853 - 8881 | LocalStorage, DOM | `attendance.js` | Move | High |
| `renderTeacherHistory()` | การเรนเดอร์ UI เฉพาะโมดูล | 8882 - 9081 | LocalStorage, DOM | `ui.js` | Move | Medium |
| `openHistoryDetailsModal(logId, isStaging)` | ระบบบันทึกการเข้าเรียนและจัดการ Staging Queue | 9082 - 9226 | LocalStorage, DOM | `attendance.js` | Move | High |
| `async renderSubjectCalendarTab()` | บริการซิงก์ เชื่อมต่อ และจัดการข้อมูล Cloud | 9227 - 9245 | LocalStorage, DOM | `firebase-service.js` | Move | High |
| `async loadSubjectCalendars()` | บริการซิงก์ เชื่อมต่อ และจัดการข้อมูล Cloud | 9246 - 9297 | LocalStorage, DOM | `firebase-service.js` | Move | High |
| `filterSubjectCalendars()` | จัดการปฏิทินรายวิชา วันหยุด และบทเรียน | 9298 - 9367 | LocalStorage, DOM | `calendar.js` | Move | Medium |
| `resetSubjectCalendarFilters()` | จัดการปฏิทินรายวิชา วันหยุด และบทเรียน | 9368 - 9386 | LocalStorage, DOM | `calendar.js` | Move | Medium |
| `renderSubjectCalendarsList(calendars)` | จัดการปฏิทินรายวิชา วันหยุด และบทเรียน | 9387 - 9424 | LocalStorage, DOM | `calendar.js` | Move | Medium |
| `openCalendarWizard()` | จัดการปฏิทินรายวิชา วันหยุด และบทเรียน | 9425 - 9462 | LocalStorage, DOM | `calendar.js` | Move | Medium |
| `closeCalendarWizard()` | จัดการปฏิทินรายวิชา วันหยุด และบทเรียน | 9463 - 9466 | LocalStorage, DOM | `calendar.js` | Move | Medium |
| `prevWizardStep()` | จัดการปฏิทินรายวิชา วันหยุด และบทเรียน | 9467 - 9473 | LocalStorage, DOM | `calendar.js` | Move | Medium |
| `nextWizardStep()` | จัดการปฏิทินรายวิชา วันหยุด และบทเรียน | 9474 - 9486 | LocalStorage, DOM | `calendar.js` | Move | Medium |
| `showWizardStep(step)` | จัดการปฏิทินรายวิชา วันหยุด และบทเรียน | 9487 - 9566 | LocalStorage, DOM | `calendar.js` | Move | Medium |
| `onWizardGradeChange()` | จัดการปฏิทินรายวิชา วันหยุด และบทเรียน | 9567 - 9586 | LocalStorage, DOM | `calendar.js` | Move | Medium |
| `onWizardClassroomTypeChange()` | จัดการปฏิทินรายวิชา วันหยุด และบทเรียน | 9587 - 9607 | LocalStorage, DOM | `calendar.js` | Move | Medium |
| `onWizardClassroomSelectionChange(event)` | จัดการปฏิทินรายวิชา วันหยุด และบทเรียน | 9608 - 9621 | LocalStorage, DOM | `calendar.js` | Move | Medium |
| `addWizardScheduleRow()` | จัดการปฏิทินรายวิชา วันหยุด และบทเรียน | 9622 - 9663 | LocalStorage, DOM | `calendar.js` | Move | Medium |
| `removeWizardScheduleRow(rowId)` | จัดการปฏิทินรายวิชา วันหยุด และบทเรียน | 9664 - 9669 | LocalStorage, DOM | `calendar.js` | Move | Medium |
| `validateWizardStep(step)` | จัดการปฏิทินรายวิชา วันหยุด และบทเรียน | 9670 - 9767 | LocalStorage, DOM | `calendar.js` | Move | Medium |
| `generatePreviewLessons()` | จัดการปฏิทินรายวิชา วันหยุด และบทเรียน | 9768 - 9832 | LocalStorage, DOM | `calendar.js` | Move | Medium |
| `async confirmAndGenerateCalendar()` | บริการซิงก์ เชื่อมต่อ และจัดการข้อมูล Cloud | 9833 - 9961 | LocalStorage, DOM | `firebase-service.js` | Move | High |
| `async viewLessons(calendarId)` | บริการซิงก์ เชื่อมต่อ และจัดการข้อมูล Cloud | 9962 - 10034 | LocalStorage, DOM | `firebase-service.js` | Move | High |
| `renderLessonsList(lessons)` | จัดการปฏิทินรายวิชา วันหยุด และบทเรียน | 10035 - 10104 | LocalStorage, DOM | `calendar.js` | Move | Medium |
| `filterLessons()` | จัดการปฏิทินรายวิชา วันหยุด และบทเรียน | 10105 - 10124 | LocalStorage, DOM | `calendar.js` | Move | Medium |
| `closeLessonsView()` | จัดการปฏิทินรายวิชา วันหยุด และบทเรียน | 10125 - 10131 | LocalStorage, DOM | `calendar.js` | Move | Medium |
| `async toggleLessonStatus(lessonId, newStatus)` | บริการซิงก์ เชื่อมต่อ และจัดการข้อมูล Cloud | 10132 - 10168 | LocalStorage, DOM | `firebase-service.js` | Move | High |
| `async deleteCalendar(calendarId)` | บริการซิงก์ เชื่อมต่อ และจัดการข้อมูล Cloud | 10169 - 10218 | LocalStorage, DOM | `firebase-service.js` | Move | High |
| `openEditLessonModal(lessonId)` | จัดการปฏิทินรายวิชา วันหยุด และบทเรียน | 10219 - 10231 | LocalStorage, DOM | `calendar.js` | Move | Medium |
| `async saveLessonDetails()` | บริการซิงก์ เชื่อมต่อ และจัดการข้อมูล Cloud | 10232 - 10292 | LocalStorage, DOM | `firebase-service.js` | Move | High |
| `openMakeupLessonModal()` | จัดการปฏิทินรายวิชา วันหยุด และบทเรียน | 10293 - 10317 | LocalStorage, DOM | `calendar.js` | Move | Medium |
| `async saveMakeupLesson()` | บริการซิงก์ เชื่อมต่อ และจัดการข้อมูล Cloud | 10318 - 10418 | LocalStorage, DOM | `firebase-service.js` | Move | High |
| `exportCalendarLessons()` | จัดการปฏิทินรายวิชา วันหยุด และบทเรียน | 10419 - 10447 | LocalStorage, DOM | `calendar.js` | Move | Medium |
| `openRotationBuilder(isEdit = false)` | จัดการตารางหมุนเวียนและฐานเรียนรู้ | 10448 - 10498 | LocalStorage, DOM | `rotation.js` | Move | Medium |
| `closeRotationBuilder()` | จัดการตารางหมุนเวียนและฐานเรียนรู้ | 10499 - 10503 | LocalStorage, DOM | `rotation.js` | Move | Medium |
| `renderRotationBuilderStep()` | จัดการตารางหมุนเวียนและฐานเรียนรู้ | 10504 - 10543 | LocalStorage, DOM | `rotation.js` | Move | Medium |
| `prevRotationStep()` | จัดการตารางหมุนเวียนและฐานเรียนรู้ | 10544 - 10551 | LocalStorage, DOM | `rotation.js` | Move | Medium |
| `nextRotationStep()` | จัดการตารางหมุนเวียนและฐานเรียนรู้ | 10552 - 10589 | LocalStorage, DOM | `rotation.js` | Move | Medium |
| `renderBuilderBasesList()` | จัดการตารางหมุนเวียนและฐานเรียนรู้ | 10590 - 10612 | LocalStorage, DOM | `rotation.js` | Move | Medium |
| `addBuilderBaseRow()` | จัดการตารางหมุนเวียนและฐานเรียนรู้ | 10613 - 10625 | LocalStorage, DOM | `rotation.js` | Move | Medium |
| `removeBuilderBaseRow(idx)` | จัดการตารางหมุนเวียนและฐานเรียนรู้ | 10626 - 10635 | LocalStorage, DOM | `rotation.js` | Move | Medium |
| `moveBuilderBaseRow(idx, direction)` | จัดการตารางหมุนเวียนและฐานเรียนรู้ | 10636 - 10647 | LocalStorage, DOM | `rotation.js` | Move | Medium |
| `updateBuilderBaseField(idx, field, value)` | จัดการตารางหมุนเวียนและฐานเรียนรู้ | 10648 - 10654 | LocalStorage, DOM | `rotation.js` | Move | Medium |
| `renderBuilderInitialGrades()` | การเรนเดอร์ UI เฉพาะโมดูล | 10655 - 10689 | LocalStorage, DOM | `ui.js` | Move | Medium |
| `executeAutoRotation()` | จัดการตารางหมุนเวียนและฐานเรียนรู้ | 10690 - 10709 | LocalStorage, DOM | `rotation.js` | Move | Medium |
| `getWeekDates(startDateVal, weekNum)` | ยูทิลิตี้แชร์ข้อมูล สัญกรณ์ไทย และการช่วยทำงาน | 10710 - 10740 | LocalStorage, DOM | `utils.js` | Move | Low |
| `calculateRotation(initialGrades, weekCount, startDate, bases)` | แอปพลิเคชันคอร์และอินเตอร์เฟซหลัก | 10741 - 10808 | LocalStorage, DOM | `ui.js / app.js` | Keep/Refactor | Medium |
| `renderBuilderPreviewTable()` | การเรนเดอร์ UI เฉพาะโมดูล | 10809 - 10869 | LocalStorage, DOM | `ui.js` | Move | Medium |
| `updateBuilderPreviewCell(week, baseId, value)` | ฟังก์ชันยูทิลิตี้และการจัดการทั่วไป | 10870 - 10916 | LocalStorage, DOM | `utils.js` | Move | Low |
| `async saveRotationBuilderSchedule()` | บริการซิงก์ เชื่อมต่อ และจัดการข้อมูล Cloud | 10917 - 10979 | LocalStorage, DOM | `firebase-service.js` | Move | High |
| `renderLessonPlanner()` | จัดการปฏิทินรายวิชา วันหยุด และบทเรียน | 10980 - 11007 | LocalStorage, DOM | `calendar.js` | Move | Medium |
| `renderLessonPlanList(container)` | จัดการปฏิทินรายวิชา วันหยุด และบทเรียน | 11008 - 11235 | LocalStorage, DOM | `calendar.js` | Move | Medium |
| `renderLessonPlanForm(container)` | จัดการปฏิทินรายวิชา วันหยุด และบทเรียน | 11236 - 11579 | LocalStorage, DOM | `calendar.js` | Move | Medium |
| `renderLessonPlanDetail(container)` | จัดการปฏิทินรายวิชา วันหยุด และบทเรียน | 11580 - 11919 | LocalStorage, DOM | `calendar.js` | Move | Medium |
| `exportRotationJson()` | จัดการตารางหมุนเวียนและฐานเรียนรู้ | 11920 - 11945 | LocalStorage, DOM | `rotation.js` | Move | Medium |
