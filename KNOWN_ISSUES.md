# ⚠️ ปัญหาที่รู้จักและหนี้เทคนิค (Known Issues & Technical Debt)

**Academic Management Platform (AMP)** — โรงเรียนไพวิทยาคาร | Version: v2.2.0

เอกสารนี้บันทึกปัญหาที่รู้จัก, ความเสี่ยงทางเทคนิค, และแผนการแก้ไขในอนาคต

> [!NOTE]
> ดู CONTRIBUTING.md สำหรับ Backward Compatibility Policy และ ARCHITECTURE.md สำหรับข้อมูล architecture

---

## สรุปปัญหาทั้งหมด

| # | ปัญหา | Impact | Priority | สถานะ |
|---|---|---|---|---|
| 1 | God Class (app.js) | สูง | 🟡 Medium | 🔴 Open |
| 2 | DOM XSS Risk | สูง | 🔴 High | 🔴 Open |
| 3 | Firestore Composite Indexes | กลาง | 🟡 Medium | 🟡 Partial |
| 4 | Offline Merge Strategy | กลาง | 🟡 Medium | 🔴 Open |
| 5 | Service Worker Cache | ต่ำ | 🟢 Low | 🔴 Open |

---

## รายละเอียดปัญหา

---

### 🔴 1. God Class — `app.js`

**คำอธิบาย:**
`app.js` เป็นไฟล์เดียวที่มีโค้ดมากกว่า **11,900+ บรรทัด** โดยรวมทุก logic ไว้ด้วยกัน ทั้ง UI rendering, business logic, Firebase operations, chart generation, form handling, wizard flows และ utility functions ทำให้ยากต่อการบำรุงรักษา

**Impact:**
- อ่านโค้ดยากมาก — หา function ใช้เวลานาน
- เพิ่ม feature ใหม่เสี่ยงต่อการทำลาย feature เดิม (regression)
- ไม่สามารถ test แต่ละ function แบบ unit ได้ง่าย
- Browser parse time เพิ่มขึ้นตามขนาดไฟล์

**Priority:** 🟡 Medium — ระบบยังทำงานได้ดี แต่จะซับซ้อนขึ้นเรื่อย ๆ

**แผนการแก้ไข:**
แบ่ง `app.js` ออกเป็น modules โดยใช้ ES Modules หรือ file-per-feature pattern:
```
js/
├── auth.js          (login, logout, role)
├── attendance.js    (check-in, offline queue)
├── calendar.js      (subject calendar wizard)
├── planner.js       (lesson plan CRUD)
├── approval.js      (workflow)
├── dashboard.js     (charts, stats)
├── rotation.js      (rotation schedule)
└── utils.js         (shared utilities)
```

> [!CAUTION]
> การ refactor ต้องเป็น Sprint แยกต่างหาก (Sprint R1) ห้ามรวมกับ Feature Sprint

---

### 🔴 2. DOM XSS Risk

**คำอธิบาย:**
ทั่วทั้ง `app.js` มีการใช้ `innerHTML` เพื่อ render HTML จาก user input โดยตรง โดยไม่มีการ sanitize ก่อน ตัวอย่างรูปแบบที่มีความเสี่ยง:
```javascript
// ❌ ไม่ปลอดภัย
element.innerHTML = `<div>${userInput}</div>`;

// ✅ ปลอดภัย (ควรใช้แบบนี้)
element.innerHTML = `<div>${sanitize(userInput)}</div>`;
```

**Impact:**
- ถ้า teacher หรือ student มีชื่อที่มี HTML/script tags → อาจ inject code ลงใน DOM
- Risk ระดับ Medium ในระบบปิด (users ทั้งหมดรู้จักกัน) แต่ต้องแก้ก่อน scale

**Priority:** 🔴 High — ต้องแก้ใน Sprint B ถัดไป

**แผนการแก้ไข:**
```javascript
// สร้าง utility function
function sanitize(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ใช้ใน template literals ทุกที่ที่มี user input
```

> [!CAUTION]
> **Sprint B1** ควรเป็น DOM XSS Sanitization Sprint ก่อน Sprint Feature ถัดไป

---

### 🟡 3. Firestore Composite Indexes

**คำอธิบาย:**
Query บางรายการใน `app.js` ต้องการ composite indexes ที่ต้อง deploy ผ่าน `firestore.indexes.json` ถ้า indexes ไม่ถูก deploy หรือ outdated จะทำให้ query ช้า หรือ fail พร้อม error ใน Firestore Console

**Impact:**
- Query ที่ซับซ้อน (เช่น filter attendance ตาม grade + date) จะช้าหรือ fail
- Error จะปรากฏใน browser console เท่านั้น — ผู้ใช้อาจไม่รู้ว่ามีปัญหา

**Priority:** 🟡 Medium — ปัจจุบัน indexes หลักถูก deploy แล้ว แต่ต้องตรวจสอบเมื่อเพิ่ม query ใหม่

**สถานะปัจจุบัน:**
Indexes ที่ deploy แล้ว (ดู [firestore.indexes.json](./firestore.indexes.json)):
- `attendance_logs`: `[grade, date]`, `[studentId, date]`
- `lesson_plans`: `[teacherUid, status]`, `[status, createdAt]`
- `subject_calendars`: `[teacherUid, term]`

**แผนการแก้ไข:**
- รัน `firebase deploy --only firestore:indexes` ทุกครั้งที่เพิ่ม query ใหม่
- ตรวจสอบ Firestore Console > Indexes หลัง deploy ทุกครั้ง

---

### 🟡 4. Offline Merge Strategy

**คำอธิบาย:**
เมื่อ teacher บันทึกข้อมูลแบบ offline และ sync กลับมาทีหลัง ระบบใช้ strategy แบบ "last write wins" ซึ่งหมายความว่าถ้ามีการแก้ไขข้อมูลเดียวกันจากหลายแหล่ง อาจเกิด data conflict ได้

**ตัวอย่าง scenario:**
1. Teacher A บันทึก attendance ของนักเรียน X ว่า "present" ขณะออฟไลน์
2. Admin แก้ไขบันทึกเดียวกันเป็น "absent" ขณะออนไลน์
3. Teacher A กลับมาออนไลน์ → ข้อมูล offline sync เขียนทับข้อมูล online

**Impact:**
- ข้อมูลสูญหายหรือไม่ถูกต้อง
- ไม่มี notification เมื่อเกิด conflict

**Priority:** 🟡 Medium — เกิดน้อยในทางปฏิบัติ แต่ควรแก้ก่อน v3.0

**แผนการแก้ไข:**
- เพิ่ม `timestamp` ใน offline queue entry
- ตรวจสอบว่า Firestore document ถูกแก้ไขหลัง offline timestamp หรือไม่
- ถ้า conflict → แสดง dialog ให้ user เลือก

---

### 🟢 5. Service Worker Cache

**คำอธิบาย:**
`sw.js` cache ไฟล์ static เช่น `index.html`, `app.js`, `style.css` เพื่อรองรับ offline mode แต่ cache invalidation strategy ปัจจุบันต้องการให้ user ปิด browser แล้วเปิดใหม่ หรือ clear cache ด้วยตนเองเมื่อ deploy version ใหม่

**Impact:**
- หลัง deploy `v2.3` users อาจยังเห็น UI ของ `v2.2` จนกว่าจะ clear cache
- ไม่มี version check ใน Service Worker ปัจจุบัน

**Priority:** 🟢 Low — เกิดเฉพาะหลัง deploy ใหม่ และแก้ได้โดย hard refresh

**แผนการแก้ไข:**
เพิ่ม cache versioning ใน `sw.js`:
```javascript
const CACHE_NAME = 'amp-cache-v2.2.0'; // อัปเดตทุก release

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys
                .filter(key => key !== CACHE_NAME)
                .map(key => caches.delete(key))
            )
        )
    );
});
```

---

## แผนการแก้ไขระยะยาว (Future Refactoring Roadmap)

| Sprint | งาน | เป้าหมาย |
|---|---|---|
| **Sprint B1** | DOM XSS Sanitization | แก้ไขทุก innerHTML ที่มี user input |
| **Sprint B2** | Service Worker Cache Versioning | เพิ่ม cache versioning ใน sw.js |
| **Sprint R1** | God Class Refactoring | แบ่ง app.js เป็น modules แยกกัน |
| **Sprint R2** | Offline Merge Strategy | เพิ่ม conflict detection |
| **Sprint S1** | Security Audit | ตรวจสอบ Firestore Rules ทั้งหมด |

---

## วิธีรายงานปัญหาใหม่

ถ้าพบปัญหาใหม่ ให้เพิ่มในเอกสารนี้ตามรูปแบบต่อไปนี้:

```markdown
### [Priority] N. ชื่อปัญหา

**คำอธิบาย:** [อธิบายปัญหา]

**Impact:** [ผลกระทบต่อระบบและผู้ใช้]

**Priority:** 🔴 High / 🟡 Medium / 🟢 Low

**แผนการแก้ไข:** [วิธีแก้ไขที่แนะนำ]
```

> [!TIP]
> ใช้ AI_PROMPTS.md ส่วน "Security Audit Prompt" และ "Architecture Review Prompt" เพื่อค้นหาปัญหาใหม่
