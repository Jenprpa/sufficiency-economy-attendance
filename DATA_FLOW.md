# 🔄 การไหลของข้อมูล (Data Flow)

**Academic Management Platform (AMP)** — โรงเรียนไพวิทยาคาร | Version: v2.2.0

เอกสารนี้อธิบายการเคลื่อนย้ายข้อมูลผ่านระบบในทุก scenario หลัก

> [!NOTE]
> ดู DATABASE.md สำหรับโครงสร้าง collection และ ARCHITECTURE.md สำหรับ architecture ภาพรวม

---

## 1. 🔐 Login Flow (การเข้าสู่ระบบ)

```mermaid
sequenceDiagram
    actor User
    participant App as app.js
    participant Auth as Firebase Auth
    participant FS as Firestore
    participant LS as LocalStorage

    User->>App: กรอก email + password
    App->>Auth: signInWithEmailAndPassword()
    Auth-->>App: Firebase ID Token

    App->>FS: query users/{uid}
    FS-->>App: { name, role, bases, grade }

    App->>LS: cache userProfile
    App->>App: setCurrentUser() + renderUI()
    App-->>User: แสดง Dashboard ตาม role
```

**หมายเหตุ:**
- ถ้า Firebase ออฟไลน์ขณะ login → แสดง error, ไม่มี offline fallback สำหรับ login
- Role จะถูก cache ใน LocalStorage เพื่อใช้ render UI ระหว่าง session

---

## 2. 🌿 Firestore Read/Write Flow

```mermaid
graph TD
    A[User Action] --> B{Online?}
    B -- Yes --> C[Write to Firestore directly]
    B -- No --> D[Write to LocalStorage staging queue]
    C --> E[Firestore onSnapshot listener]
    E --> F[Update UI]
    D --> G[Service Worker monitors connection]
    G --> H{Back online?}
    H -- Yes --> I[Sync staging queue to Firestore]
    I --> E
    H -- No --> D
```

---

## 3. 📋 Local Cache Flow (การแคชข้อมูลในเครื่อง)

ข้อมูลที่ cache ใน LocalStorage:

| Key | เนื้อหา | อัปเดตเมื่อ |
|---|---|---|
| `userProfile` | ชื่อ, role, bases, grade | login / reload |
| `offlineQueue` | attendance logs ที่รอ sync | ทุกครั้งที่ offline check-in |
| `rotationCache` | ตารางหมุนเวียนล่าสุด | อัปเดตจาก Firestore |
| `appSettings` | schoolName, term, year | โหลดจาก system_data |

---

## 4. ✅ Attendance Data Flow (การบันทึกการเข้าร่วม)

```mermaid
sequenceDiagram
    actor Teacher
    participant App as app.js
    participant FS as Firestore
    participant LS as LocalStorage

    Teacher->>App: เลือกฐาน + เลือกนักเรียน + บันทึกสถานะ
    App->>App: validateAttendanceData()

    alt Online
        App->>FS: add attendance_logs/{docId}
        FS-->>App: ✅ success
        App-->>Teacher: แสดง toast "บันทึกสำเร็จ"
    else Offline
        App->>LS: push to offlineQueue[]
        App-->>Teacher: แสดง toast "บันทึกแบบออฟไลน์"
        Note over App,LS: เมื่อ online: syncOfflineQueue() → Firestore
    end
```

---

## 5. 📅 Academic Calendar Data Flow (ปฏิทินรายวิชา)

```mermaid
graph LR
    A[Teacher เริ่ม Wizard] --> B[เลือกวิชา + ระดับชั้น + ภาคเรียน]
    B --> C[กำหนดวันเริ่มต้น + จำนวนสัปดาห์]
    C --> D[กำหนดวันหยุด]
    D --> E[ระบบคำนวณ lesson dates อัตโนมัติ]
    E --> F[ครูยืนยัน + บันทึก]
    F --> G[Firestore: subject_calendars]
    G --> H[แสดงปฏิทินสมบูรณ์]
```

---

## 6. 🌱 Sufficiency Activity Planner Data Flow

```mermaid
sequenceDiagram
    actor Teacher
    actor Director
    participant App as app.js
    participant FS as Firestore

    Teacher->>App: กรอกแผนกิจกรรม + เลือก Framework 2-3-4-3-4
    App->>FS: add lesson_plans { status: "draft" }

    Teacher->>App: ส่งเพื่ออนุมัติ
    App->>FS: update status → "pending"

    Director->>App: เปิดรายการรออนุมัติ
    App->>FS: query lesson_plans where status == "pending"
    FS-->>App: แสดงรายการแผน

    alt อนุมัติ
        Director->>App: กดอนุมัติ + ใส่ comment
        App->>FS: update status → "approved"
    else ส่งกลับ
        Director->>App: กดส่งกลับ + ใส่ comment
        App->>FS: update status → "rejected"
        App-->>Teacher: แจ้งเตือน
    end
```

---

## 7. 📝 Teaching Log Data Flow (วางแผน v2.3)

```mermaid
graph LR
    A[Teacher เลือก lesson_plan] --> B[กรอกรายละเอียดการสอนจริง]
    B --> C[Firestore: teaching_logs]
    C --> D[เชื่อมกับ subject_calendars]
    D --> E[Dashboard แสดงสถิติ]
    E --> F[Analytics v2.5]
```

---

## 8. 📊 Analytics Data Flow (วางแผน v2.5)

```mermaid
graph TD
    A[attendance_logs] --> D[Analytics Engine]
    B[lesson_plans] --> D
    C[teaching_logs] --> D
    D --> E[Dashboard Charts]
    D --> F[Report Generator v2.6]
    F --> G[PDF / Excel Export]
```

---

## 9. 🔄 Offline Sync Flow (การซิงก์เมื่อออฟไลน์)

```mermaid
flowchart TD
    A[App เริ่มทำงาน] --> B{เชื่อมต่อ Firebase?}
    B -- Yes --> C[โหมดออนไลน์ปกติ]
    B -- No --> D[โหมดออฟไลน์]
    D --> E[บันทึกข้อมูลใน LocalStorage queue]
    E --> F[Service Worker ตรวจสอบการเชื่อมต่อ]
    F --> G{กลับมาออนไลน์?}
    G -- Yes --> H[syncOfflineQueue]
    H --> I{Sync สำเร็จ?}
    I -- Yes --> J[ลบข้อมูลจาก LocalStorage queue]
    I -- No --> K[Log error + เก็บไว้ใน queue]
    G -- No --> F
    J --> C
    K --> F
```

**ข้อจำกัดที่รู้จัก:**
- ถ้า document เดียวกันถูกแก้ไขทั้งออนไลน์และออฟไลน์ → อาจเกิด conflict
- ไม่มี merge strategy อัตโนมัติ — ข้อมูลล่าสุดจะเป็นผู้ชนะ

> [!WARNING]
> ดู KNOWN_ISSUES.md รายการ "Offline Merge Strategy" สำหรับรายละเอียดความเสี่ยง

---

## 10. 🔐 Role-Based Data Filtering

```mermaid
graph TD
    A[Firestore query] --> B{Role ของ User?}
    B -- teacher --> C["filter: teacherUid == currentUser.uid"]
    B -- director/supervisor --> D[ดูทุกข้อมูลในระบบ]
    B -- admin --> E[ดูและแก้ไขทุกอย่าง]
    B -- guest --> F[read-only Dashboard stats only]
    C --> G[แสดงเฉพาะข้อมูลของตนเอง]
    D --> H[แสดงข้อมูลทั้งหมด]
    E --> H
    F --> I[แสดงสถิติสรุปเท่านั้น]
```

---

## สรุป Data Sources ต่อ Module

| Module | Firestore Collection | LocalStorage | Service Worker |
|---|---|---|---|
| Authentication | `users` | `userProfile` | ❌ |
| Attendance | `attendance_logs`, `students` | `offlineQueue` | ✅ |
| Academic Calendar | `subject_calendars` | ❌ | ❌ |
| Sufficiency Planner | `lesson_plans` | ❌ | ❌ |
| Rotation Schedule | `system_data/rotation_schedule` | `rotationCache` | ❌ |
| Dashboard | `attendance_logs`, `lesson_plans` | ❌ | ❌ |
| Settings | `system_data/settings` | `appSettings` | ❌ |
