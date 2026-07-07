# 🗺️ แผนภาพความเกี่ยวเนื่องระหว่างโมดูล (Module Dependency Map)

**Academic Management Platform (AMP)** — โรงเรียนไพวิทยาคาร | Version: v2.2.0

เอกสารนี้รวบรวมแผนภาพ Mermaid.js เพื่อแสดงทิศทางการไหลของข้อมูล (Data Flow) และโครงสร้างความเกี่ยวเนื่องระหว่างโมดูล (Module Dependencies) ทั้งในระบบปัจจุบันและสถาปัตยกรรมเป้าหมายในอนาคต

> [!NOTE]
> **Cross-reference:** ดูรายละเอียดไฟล์และการย้ายใน [ARCHITECTURE_REFACTOR_PLAN.md](./ARCHITECTURE_REFACTOR_PLAN.md) และโครงสร้าง collections ใน [DATABASE.md](./DATABASE.md)

---

## 1. 🔄 การไหลของข้อมูลในปัจจุบัน (Current Data Flow v2.2.0)

ในเวอร์ชันปัจจุบัน ข้อมูลส่วนใหญ่จะไหลผ่านคลาสศูนย์กลาง (`AttendanceApp` ใน `app.js`) และบันทึกผ่าน Firebase SDK หรือ Local Cache ก่อนส่งผ่านไปยังมุมมองต่าง ๆ

```mermaid
flowchart TD
    Login[Login หน้าแรก] -->|1. ยืนยันตัวตน| FirebaseAuth[Firebase Auth / users collection]
    FirebaseAuth -->|2. แคชสิทธิ์ & โปรไฟล์| LocalCache[(Local Storage / Cache)]
    LocalCache -->|3. เรนเดอร์หน้าแรก| Dashboard[Dashboard สถิติการเข้าเรียน]
    Dashboard -->|4. เช็กชื่อนักเรียน| Attendance[Attendance เช็กชื่อประจำฐาน]
    Dashboard -->|5. สร้างแผนกิจกรรม| Planner[Activity Planner แผนพอเพียง]
    Attendance -->|6. ส่งข้อมูลสรุป| Reports[Reports ระบบสร้างรายงาน PDF/Print]
    Planner -->|7. สรุปผลสัมฤทธิ์| Reports
    
    style Login fill:#f5f5f0,stroke:#6c757d
    style FirebaseAuth fill:#4361ee,stroke:#3f37c9,color:#fff
    style LocalCache fill:#f4a261,stroke:#e76f51,color:#fff
    style Dashboard fill:#2d6a4f,stroke:#1b4332,color:#fff
```

---

## 2. 🔮 การไหลของข้อมูลในอนาคต (Future AMP Data Flow)

ในสถาปัตยกรรมเป้าหมาย การไหลของข้อมูลจะถูกเชื่อมต่อเข้ากับโมดูลใหม่ ๆ (Teaching Log, Resource Center, Analytics) เพื่อรองรับการทำงานระยะยาว

```mermaid
flowchart TD
    Login[Login / auth.js] -->|ตรวจสอบสิทธิ์| Dashboard[Dashboard / dashboard.js]
    
    %% Core Flows
    Dashboard -->|เขียนแผนบูรณาการ| Planner[Activity Planner / planner.js]
    Dashboard -->|ระบุกลุ่มหมุนเวียน| Attendance[Attendance / attendance.js]
    
    %% Future Integration
    Planner -.->|อ้างอิงหัวข้อสอน| TeachLog[Teaching Log / teaching-log.js]
    Attendance -.->|บันทึกจำนวนคาบจริง| TeachLog
    
    Planner -.->|ดึงสื่อการสอน| Resources[Resource Center]
    
    %% Analytics & Reports
    TeachLog -.->|ส่งสถิติการสอนจริง| Analytics[Analytics & Executive Module]
    Attendance -->|ส่งยอดสถิตินักเรียน| Analytics
    
    Analytics -->|สร้างกราฟและประเมินผล| Reports[Reports / reports.js]
    
    style Login fill:#f5f5f0,stroke:#6c757d
    style Planner fill:#2d6a4f,stroke:#1b4332,color:#fff
    style Attendance fill:#2d6a4f,stroke:#1b4332,color:#fff
    style TeachLog fill:#e2eafc,stroke:#b1c9ef,stroke-width:2px
    style Resources fill:#e2eafc,stroke:#b1c9ef,stroke-width:2px
    style Analytics fill:#e2eafc,stroke:#b1c9ef,stroke-width:2px
```

---

## 3. 🏗️ แผนผังความเกี่ยวเนื่องเชิงโมดูล (Module Dependency Structure)

แผนภาพนี้แสดงให้เห็นว่าโมดูลหลักแต่ละส่วนมีการอ้างอิงข้อมูลและการพึ่งพาซึ่งกันและกัน (Dependencies) อย่างไร โดยมี **Firebase Service** และ **Utilities** เป็นรากฐานสำคัญของระบบ

```mermaid
graph TD
    %% Lower Level Layer (Foundation)
    subgraph Foundation [เลเยอร์โครงสร้างพื้นฐาน]
        Utils[utils.js & constants.js]
        Firebase[firebase-service.js]
    end

    %% Service Layer
    subgraph Services [เลเยอร์บริการหลัก]
        Auth[auth.js]
        PWA[PWA / sw.js / Offline cache]
    end
    
    %% Business Logic Modules
    subgraph CoreModules [เลเยอร์ฟังก์ชันธุรกิจ]
        Calendar[calendar.js / ปฏิทินวิชา]
        Attendance[attendance.js / การเช็กชื่อ]
        Planner[planner.js / แผนพอเพียง]
        Rotation[rotation.js / ตารางหมุนเวียน]
    end

    %% UI & Output Layer
    subgraph UIOutputs [เลเยอร์การแสดงผลและรายงาน]
        Dashboard[dashboard.js / Dashboard]
        Reports[reports.js / ระบบรายงาน]
        Admin[settings.js / จัดการระบบ]
    end

    %% Dependencies arrows
    Firebase --> Auth
    Firebase --> CoreModules
    Firebase --> Admin
    
    Utils --> Services
    Utils --> CoreModules
    Utils --> UIOutputs
    
    Auth --> Dashboard
    Auth --> CoreModules
    Auth --> Admin
    
    PWA --> Attendance
    
    Rotation --> Attendance
    Calendar --> Planner
    
    Attendance --> Reports
    Planner --> Reports
    Dashboard --> Reports

    %% Styling
    classDef foundation fill:#f8f9fa,stroke:#adb5bd,stroke-width:2px;
    classDef service fill:#e8f1f5,stroke:#4a90e2,stroke-width:2px;
    classDef core fill:#eef8f2,stroke:#2d6a4f,stroke-width:2px;
    classDef ui fill:#fff7e6,stroke:#ff9900,stroke-width:2px;
    
    class Utils,Firebase foundation;
    class Auth,PWA service;
    class Calendar,Attendance,Planner,Rotation core;
    class Dashboard,Reports,Admin ui;
```

---

## 🔒 กฎความปลอดภัยและการข้ามขอบเขตโมดูล (Module Boundaries)

> [!WARNING]
> เพื่อไม่ให้ระบบเกิดสภาวะการพึ่งพากันแบบวงกลม (Circular Dependencies) ทุกโมดูลต้องปฏิบัติตามกฎต่อไปนี้:
> 1. **ห้ามโมดูลในระดับฟังก์ชันธุรกิจอ้างอิงข้ามกันโดยตรง** — หากจำเป็น ต้องเรียกผ่านตัวกลางหรือส่งผ่านเป็น parameter
> 2. **ห้ามโมดูลภายนอกแก้ไขตัวแปรคงที่ (Constants)** — constants.js ต้องมีสถานะเป็น read-only
> 3. **Firebase calls ต้องผ่าน firebase-service.js เท่านั้น** — ห้ามโมดูล UI เรียกใช้ `firebase.firestore()` โดยตรงในอนาคต
