# 🤝 คู่มือการมีส่วนร่วมพัฒนา (AI Development Charter)

**Academic Management Platform (AMP)**
โรงเรียนไพวิทยาคาร | Version: v2.2.0

เอกสารนี้กำหนดมาตรฐานการพัฒนาสำหรับทีมและ AI ที่ทำงานบนโปรเจกต์นี้ ทุกคนที่มีส่วนร่วมพัฒนา ทั้งมนุษย์และ AI ต้องปฏิบัติตามกฎในเอกสารนี้อย่างเคร่งครัด

---

## 📋 มาตรฐานการเขียนโค้ด (Coding Standards)

- ใช้ **Vanilla JavaScript** เท่านั้น — ห้ามใช้ Framework หรือ Build Tools เพิ่มเติม
- ตั้งชื่อ Method เป็น **camelCase** (เช่น `renderLessonPlanForm`, `saveLessonPlan`)
- ตั้งชื่อ CSS Class เป็น **kebab-case** (เช่น `lesson-plan-card`, `framework-badge`)
- ใช้ `const` และ `let` เท่านั้น — ห้ามใช้ `var`
- เขียน Comment **ภาษาไทย** สำหรับ business logic, **ภาษาอังกฤษ** สำหรับ technical logic
- **Sanitize input** ก่อน render ด้วย `innerHTML` ทุกครั้ง
- ทุก `async function` ต้องมี `try/catch` ครอบอยู่เสมอ
- แยก concerns ให้ชัดเจน: render functions, save functions, utility functions

---

## 💬 มาตรฐาน Commit Message

ใช้ **Conventional Commits** format:

```
<type>(<scope>): <คำอธิบายสั้น>
```

| Type | ใช้เมื่อ |
|---|---|
| `feat` | เพิ่ม feature ใหม่ |
| `fix` | แก้ไข bug |
| `docs` | อัปเดตเอกสารเท่านั้น |
| `style` | แก้ไข CSS/UI ไม่เปลี่ยน logic |
| `refactor` | ปรับโครงสร้างโค้ดโดยไม่เปลี่ยน behavior |
| `test` | เพิ่มหรือแก้ไข tests |
| `chore` | งาน maintenance ทั่วไป |

**ตัวอย่าง:**
```
feat(lesson-plan): add Framework 2-3-4-3-4 checkbox matrix
fix(attendance): resolve offline sync queue duplication
docs(sprint-d1): create complete project documentation
```

---

## 🌿 Branch Strategy

| Branch | วัตถุประสงค์ |
|---|---|
| `main` | Production branch — stable เท่านั้น |
| `dev` | Development integration branch |
| `feature/xxx` | Feature branches สำหรับแต่ละ Sprint |
| `hotfix/xxx` | Critical bug fixes ที่ต้องการ deploy ด่วน |

> [!IMPORTANT]
> ห้าม push โดยตรงไปยัง `main` ยกเว้นผ่านการ merge จาก `dev` หลัง test ผ่านทั้งหมด

---

## 🏃 Sprint Strategy

- Sprint แต่ละอันมี **Scope ชัดเจน** — ห้ามรวม Sprint ที่ต่างประเภทกัน
- ทุก Sprint ต้องมี **Implementation Plan** ก่อนเริ่ม
- ทุก Sprint ต้องผ่าน **Verification** ก่อน commit
- ทุก Sprint ต้องอัปเดต **CHANGELOG.md** และ **walkthrough.md**

| Sprint Type | ตัวย่อ | คำอธิบาย |
|---|---|---|
| Documentation | D | เขียนและอัปเดตเอกสาร |
| Feature | F | เพิ่ม feature ใหม่ |
| Bug Fix | B | แก้ไข bugs |
| Refactor | R | ปรับโครงสร้างโค้ด |
| Security | S | แก้ไขหรือทดสอบด้านความปลอดภัย |

**ชื่อ Sprint:** ใช้รูปแบบ `Sprint D1`, `Sprint F1`, `Sprint B1` เป็นต้น

---

## ✅ Verification Requirements

ก่อน commit ทุกครั้งต้องผ่านเงื่อนไขต่อไปนี้:

- [ ] รัน `node -c app.js` — ต้องไม่มี syntax error
- [ ] ทุก feature ใหม่ต้องมี unit test หรือ integration test
- [ ] ตรวจสอบ backward compatibility กับข้อมูลเก่าใน Firestore
- [ ] ตรวจสอบ role-based access control สำหรับทุก feature ใหม่
- [ ] ตรวจสอบว่า feature เก่าทั้งหมดยังทำงานปกติ (regression check)

---

## 🚀 Release Process

ดู [RELEASE.md](./RELEASE.md) สำหรับ checklist การ release ครบชุด

---

## 📦 Versioning Policy

ใช้ **Semantic Versioning (SemVer): `MAJOR.MINOR.PATCH`**

| Component | เปลี่ยนเมื่อ |
|---|---|
| **MAJOR** | เปลี่ยนแปลงที่ incompatible กับเวอร์ชันเก่า หรือ architecture ใหม่ทั้งหมด |
| **MINOR** | เพิ่ม feature ใหม่ที่ backward compatible |
| **PATCH** | แก้ไข bug หรืออัปเดตเอกสารเล็กน้อย |

---

## 🔄 Backward Compatibility Policy

- ข้อมูล Firestore เก่าต้องยังทำงานได้กับ code ใหม่ทุกครั้ง
- ถ้า schema เปลี่ยน ต้องมี **migration logic** หรือ **auto-initialization** ใน code
- ห้ามลบ field จาก Firestore document โดยไม่มี migration plan
- เพิ่ม field ใหม่ได้โดยให้มีค่า default เสมอ

---

## 🤖 AI Rules (กฎสำหรับ AI)

> [!IMPORTANT]
> กฎเหล่านี้บังคับใช้กับ AI ทุกตัวที่ทำงานบนโปรเจกต์นี้อย่างเด็ดขาด

1. **AI MUST NOT remove existing features**
   ห้ามลบหรือปิดการใช้งาน feature ที่มีอยู่ในระบบ ไม่ว่าจะเป็นการ refactor หรือเพิ่ม feature ใหม่

2. **AI MUST NOT change UI without request**
   ห้ามแก้ไข UI, layout, สีสัน, หรือ CSS โดยไม่ได้รับคำสั่งจากผู้ใช้

3. **AI MUST complete one Sprint at a time**
   ทำให้เสร็จทีละ Sprint ก่อนเริ่ม Sprint ใหม่ ห้ามรวม Sprint ที่ไม่เกี่ยวข้องกัน

4. **AI MUST update documentation every Sprint**
   อัปเดต `CHANGELOG.md` และ `walkthrough.md` ทุก Sprint ไม่มีข้อยกเว้น

5. **AI MUST verify syntax before commit**
   รัน `node -c app.js` ก่อนทุก commit และต้องผ่านโดยไม่มี error

6. **AI MUST provide implementation report**
   สรุป walkthrough หลังทุก Sprint โดยอธิบายสิ่งที่เปลี่ยนแปลงและผลการ verify

7. **AI MUST NOT change Firestore schema without approval**
   ห้ามแก้ไข collections, document fields, หรือ indexes โดยไม่ได้รับคำสั่ง

8. **AI MUST ask before major architectural changes**
   ถามก่อนเสมอถ้าการเปลี่ยนแปลงกระทบ architecture ของระบบ

---

## 📝 บันทึก

เอกสารนี้ถูกสร้างขึ้นใน Sprint D1 (2026-07-06) และจะอัปเดตเมื่อกฎหรือมาตรฐานเปลี่ยนแปลง
