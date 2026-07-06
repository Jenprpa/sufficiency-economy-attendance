# CHANGELOG — Academic Management Platform (AMP)
## โรงเรียนไพวิทยาคาร

> รูปแบบเอกสารนี้ยึดตามมาตรฐาน [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
> และโปรเจกต์นี้ใช้ [Semantic Versioning](https://semver.org/spec/v2.0.0.html)
>
> หมวดหมู่การเปลี่ยนแปลงที่ใช้:
> - **เพิ่มใหม่ (Added)** — ฟีเจอร์หรือโมดูลใหม่ที่เพิ่มเข้ามา
> - **เปลี่ยนแปลง (Changed)** — การเปลี่ยนแปลงฟีเจอร์ที่มีอยู่แล้ว
> - **เลิกใช้ (Deprecated)** — ฟีเจอร์ที่จะถูกนำออกในเวอร์ชันถัดไป
> - **นำออก (Removed)** — ฟีเจอร์ที่ถูกนำออกแล้ว
> - **แก้ไข (Fixed)** — การแก้ไข bug หรือปัญหาต่าง ๆ
> - **ความปลอดภัย (Security)** — การแก้ไขช่องโหว่ด้านความปลอดภัย

---

## [v2.2.0] - 2026-07-06

### เพิ่มใหม่ (Added)

- **แผนกิจกรรมพอเพียง (Sufficiency Activity Planner)** พร้อม Framework 2-3-4-3-4 ครบชุด
- ช่อง `checkbox` สำหรับเลือกกรอบแนวคิดปรัชญาของเศรษฐกิจพอเพียง แบ่งเป็น 5 กลุ่ม:
  - **เงื่อนไข 2** — `Knowledge` (ความรู้), `Morality` (คุณธรรม)
  - **หลักการ 3** — `Moderation` (พอประมาณ), `Reasonableness` (มีเหตุผล), `Self-Immunity` (มีภูมิคุ้มกัน)
  - **มิติ 4** — `Economic` (เศรษฐกิจ), `Social` (สังคม), `Environmental` (สิ่งแวดล้อม), `Cultural` (วัฒนธรรม)
  - **ศาสตร์ 3** — ศาสตร์พระราชา, ศาสตร์สากล, ศาสตร์ภูมิปัญญา
  - **พระราโชบาย 4** — ทัศนคติ, พื้นฐานชีวิต, มีงานทำ, เป็นพลเมืองที่ดี
- แสดง **Framework badges** ใน Detail view ของแผนกิจกรรม
- **Auto-initialization** สำหรับ backward compatibility กับ lesson plans เก่าที่ไม่มี `framework` object

### เปลี่ยนแปลง (Changed)

- เปลี่ยนชื่อ `'Lesson Planner'` เป็น `'แผนกิจกรรมพอเพียง'` ทั่วทั้งระบบ
- อัปเดต Navigation labels, list headers และ confirmation dialogs ให้สอดคล้องกับชื่อใหม่

### แก้ไข (Fixed)

- แก้ไข backward compatibility เมื่อโหลด lesson plan เก่าที่ไม่มี `framework` object — ระบบจะสร้าง default `framework` object ให้โดยอัตโนมัติแทนการ throw error

---

## [v2.1.0] - 2026-07-02

### เพิ่มใหม่ (Added)

- **Lesson Planner Module** (ต้นแบบของ Sufficiency Activity Planner)
- **Approval Workflow**: Teacher → Director/Supervisor → Approved — รองรับขั้นตอนการอนุมัติแบบลำดับชั้น
- **Comment/Feedback system** สำหรับผู้อนุมัติเพื่อแนบข้อเสนอแนะก่อนหรือหลังอนุมัติ
- **Status badges**: แบบร่าง, รออนุมัติ, อนุมัติแล้ว — แสดงสถานะแผนใน list view
- **Filter** และ **Search** ในรายการ Lesson Plans เพื่อค้นหาตามชื่อ, สถานะ หรือผู้สร้าง

### เปลี่ยนแปลง (Changed)

- Dashboard แสดง **pending approval count** — ผู้อนุมัติเห็นจำนวนแผนที่รออนุมัติทันทีเมื่อเข้าสู่ระบบ

---

## [v2.0.1] - 2026-07-01

### แก้ไข (Fixed)

- แก้ไข **Startup Bug**: ระบบไม่สามารถโหลดได้ในบางกรณีเมื่อ Firestore connection ช้าหรือ timeout
- ปรับปรุง error handling ใน `initFirestore()` — เพิ่ม retry logic และ fallback ไปยัง LocalStorage

### เพิ่มใหม่ (Added)

- **ปฏิทินรายวิชา (Academic Calendar) Module** พร้อม **5-Step Wizard** สำหรับตั้งค่าภาคเรียน
- **Holiday Management**: กำหนดวันหยุดราชการ/นักขัตฤกษ์ และการคำนวณ lesson dates อัตโนมัติ
- **Make-up Lesson tracking** — บันทึกและติดตามการสอนชดเชย
- **Export** และ **Print** ปฏิทินในรูปแบบที่พร้อมพิมพ์ (print-ready stylesheet)

---

## [v1.2.0] - 2026-06-21

### เพิ่มใหม่ (Added)

- **Rotation Schedule Builder**: ตาราง Grid สำหรับจัดการการหมุนเวียนฐานการเรียนรู้
- **Auto-rotation algorithm** สำหรับ ม.1–ม.6 — คำนวณลำดับการหมุนเวียนกลุ่มนักเรียนโดยอัตโนมัติ

---

## [v1.1.0] - 2026-06-20

### เพิ่มใหม่ (Added)

- **Subject Calendar Wizard** (5 ขั้นตอน) สำหรับสร้างปฏิทินรายวิชาทีละขั้น
- **Taught/Cancelled status toggles** — ครูสามารถทำเครื่องหมายชั่วโมงสอนว่าสอนแล้วหรือยกเลิก
- บันทึกรายละเอียดต่อชั่วโมง: `topic`, `plan`, `notes`
- **PDF/Print stylesheet** สำหรับการพิมพ์ปฏิทินรายวิชา

---

## [v1.0.0] - 2026-06-19

### เพิ่มใหม่ (Added)

- **Core attendance check-in (Check-in) system** — ระบบการเช็คชื่อนักเรียนหลัก
- **LocalStorage + Firebase Firestore sync** — บันทึกข้อมูลทั้งในเครื่องและ Cloud พร้อมกัน
- **Offline staging queue** — คิวรอส่งข้อมูลอัตโนมัติเมื่อกลับมาออนไลน์
- **Role-based access**: `admin`, `teacher`, `director`, `supervisor`, `guest` — ควบคุมสิทธิ์การเข้าถึงตามบทบาท
- **Default-deny Firestore security rules** — ปฏิเสธการเข้าถึงทุก Collection โดย default และเปิดเฉพาะที่จำเป็น
- **Audit logger** — บันทึก log การกระทำสำคัญทุก event พร้อม timestamp และ user ID
