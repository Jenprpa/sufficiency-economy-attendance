# 🎓 Academic Management Platform (AMP) — โรงเรียนไพวิทยาคาร

![Version](https://img.shields.io/badge/version-v2.2.0-blue?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)
![Platform](https://img.shields.io/badge/platform-PWA-orange?style=flat-square)
![Firebase](https://img.shields.io/badge/backend-Firebase%20Firestore-yellow?style=flat-square)

---

## 📋 ภาพรวมโปรเจกต์

**Academic Management Platform (AMP)** คือระบบบริหารจัดการวิชาการแบบครบวงจรสำหรับ **โรงเรียนไพวิทยาคาร** พัฒนาในรูปแบบ **Progressive Web App (PWA)** รองรับการทำงานทั้งในโหมดออนไลน์และออฟไลน์ ข้อมูลทั้งหมดเชื่อมต่อและซิงก์กับ **Firebase Firestore** แบบ Real-time

ระบบนี้ออกแบบมาเพื่อลดภาระงานเอกสารของครู ช่วยให้ผู้บริหารเข้าถึงข้อมูลวิชาการได้ทันที และสนับสนุนการดำเนินงานตามหลักปรัชญาเศรษฐกิจพอเพียงในสถานศึกษา

---

## 🎯 วัตถุประสงค์ของระบบ

- 📌 **บันทึกและติดตามการเข้าร่วมกิจกรรม** ของนักเรียนในกิจกรรมวิชาการและกิจกรรมเสริมหลักสูตร
- 📅 **จัดการปฏิทินรายวิชา** ให้ครูสามารถวางแผนการสอนได้อย่างเป็นระบบ
- 🌱 **สร้างแผนกิจกรรมพอเพียง** ตามกรอบ Framework 2-3-4-3-4 ของปรัชญาเศรษฐกิจพอเพียง
- ✅ **รองรับ Workflow การอนุมัติ** แผนการสอนและกิจกรรมผ่านระบบดิจิทัล
- 📊 **Dashboard สำหรับผู้บริหาร** เพื่อติดตามสถิติและภาพรวมของโรงเรียนแบบ Real-time

---

## ✨ ฟีเจอร์ปัจจุบัน (v2.2.0)

| ฟีเจอร์ | รายละเอียด | สถานะ |
|---|---|---|
| **การบันทึกเข้าร่วมกิจกรรม (Check-in)** | ระบบ Check-in นักเรียนเข้ากิจกรรม รองรับออฟไลน์ | ✅ พร้อมใช้งาน |
| **ปฏิทินรายวิชา (5-Step Wizard)** | สร้างปฏิทินการสอนผ่าน Wizard 5 ขั้นตอน | ✅ พร้อมใช้งาน |
| **ตารางหมุนเวียน (Rotation Schedule Builder)** | เครื่องมือสร้างตารางหมุนเวียนกลุ่มนักเรียน | ✅ พร้อมใช้งาน |
| **แผนกิจกรรมพอเพียง (Sufficiency Activity Planner)** | วางแผนกิจกรรมตาม Framework 2-3-4-3-4 | ✅ พร้อมใช้งาน |
| **Workflow การอนุมัติแผน** | ส่ง → รอตรวจ → อนุมัติ / ส่งกลับแก้ไข | ✅ พร้อมใช้งาน |
| **Dashboard และรายงาน** | กราฟสถิติการเข้าร่วม, สรุปรายวิชา, รายงาน PDF | ✅ พร้อมใช้งาน |

### 🌱 Sufficiency Activity Planner — Framework 2-3-4-3-4

ระบบรองรับการวางแผนกิจกรรมตามหลักปรัชญาเศรษฐกิจพอเพียง ผ่านกรอบแนวคิด **2-3-4-3-4** ซึ่งประกอบด้วย:

| หมวด | รายการ |
|---|---|
| **เงื่อนไข 2** | ความรู้, คุณธรรม |
| **หลักการ 3** | พอประมาณ, มีเหตุผล, มีภูมิคุ้มกัน |
| **มิติ 4** | เศรษฐกิจ, สังคม, สิ่งแวดล้อม, วัฒนธรรม |
| **ศาสตร์ 3** | ศาสตร์พระราชา, ศาสตร์สากล, ศาสตร์ภูมิปัญญา |
| **พระราโชบาย 4** | ทัศนคติ, พื้นฐานชีวิต, มีงานทำ, เป็นพลเมืองที่ดี |

---

## 🛠️ เทคโนโลยีที่ใช้

| เทคโนโลยี | รายละเอียด |
|---|---|
| **HTML5** | โครงสร้างหน้าเว็บ Semantic markup |
| **Vanilla CSS** | จัดการสไตล์ทั้งหมด ไม่พึ่ง CSS Framework |
| **Vanilla JavaScript** | Logic ฝั่ง Client ทั้งหมด ไม่ใช้ Framework |
| **Firebase Firestore** | Database หลัก (SDK v10.8.0 compat mode) |
| **Firebase Authentication** | ระบบ Login / Logout ด้วย Email/Password |
| **PWA / Service Worker** | รองรับการทำงานออฟไลน์และ Add to Home Screen |
| **Chart.js** | แสดงกราฟและ Dashboard สถิติต่าง ๆ |

> [!NOTE]
> โปรเจกต์นี้ใช้ **Vanilla Stack** (HTML + CSS + JS) โดยเจตนา เพื่อให้ครูและนักพัฒนาในโรงเรียนสามารถทำความเข้าใจและบำรุงรักษาโค้ดได้ง่ายโดยไม่ต้องพึ่งพา Build Tool หรือ Framework ขนาดใหญ่

---

## 📦 การติดตั้ง

มี 3 วิธีในการติดตั้งและรันระบบ:

1. **Local** — เปิดไฟล์ `index.html` โดยตรงในเบราว์เซอร์ (สำหรับทดสอบเบื้องต้น)
2. **VS Code Live Server** — ใช้ Extension `Live Server` เพื่อ Development แบบ Hot Reload
3. **Firebase Hosting** — Deploy ขึ้น Production ผ่าน Firebase CLI

---

## 💻 การรันในเครื่อง (Local Development)

```bash
# 1. Clone repository
git clone https://github.com/Jenprpa/sufficiency-economy-attendance.git

# 2. เข้าไปในโฟลเดอร์โปรเจกต์
cd sufficiency-economy-attendance

# 3. เปิดไฟล์ index.html ในเบราว์เซอร์ได้เลย
#    (ไม่มี Build Step — ไม่ต้องติดตั้ง npm dependencies ใด ๆ)
start index.html
```

> [!TIP]
> แนะนำให้ใช้ **VS Code** ร่วมกับ Extension **Live Server** เพื่อประสบการณ์การพัฒนาที่ดีขึ้น
> คลิกขวาที่ `index.html` → **"Open with Live Server"** จะได้ Auto Reload เมื่อแก้ไขโค้ด

---

## 🔥 การ Deploy ไปยัง Firebase

```bash
# 1. ติดตั้ง Firebase CLI (ทำครั้งเดียว)
npm install -g firebase-tools

# 2. เข้าสู่ระบบด้วย Google Account
firebase login

# 3. Deploy ขึ้น Firebase Hosting
firebase deploy
```

> [!IMPORTANT]
> ต้องตั้งค่า `firebase.json` และ `.firebaserc` ให้ถูกต้องก่อน Deploy
> กรุณาตรวจสอบ `firestore.rules` และ `firestore.indexes.json` ก่อน Deploy ทุกครั้ง

---

## 🌐 การ Deploy ไปยัง GitHub Pages

```bash
# 1. Commit และ Push โค้ดทั้งหมดขึ้น branch main
git add .
git commit -m "chore: deploy to GitHub Pages"
git push origin main
```

จากนั้นเปิดใช้งาน GitHub Pages:

1. ไปที่ **Settings** ของ Repository บน GitHub
2. เลือก **Pages** ในเมนูด้านซ้าย
3. ตั้ง **Source** เป็น `Deploy from a branch`
4. เลือก Branch: **`main`** และ Folder: **`/ (root)`**
5. กด **Save** — GitHub จะ Build และ Deploy ให้อัตโนมัติ

> [!WARNING]
> Firebase Firestore ต้องการการตั้งค่า CORS และ Firebase Authentication Rules ให้รองรับ Domain ของ GitHub Pages ด้วย

---

## 📁 โครงสร้างโฟลเดอร์

```
sufficiency-economy-attendance/
│
├── 📄 index.html                # Entry point หลักของแอปพลิเคชัน
├── 📄 app.js                    # JavaScript Logic ทั้งหมด (~11,900 บรรทัด)
├── 📄 style.css                 # Stylesheet หลัก
├── 📄 sw.js                     # Service Worker (PWA / Offline support)
│
├── 📄 firebase.json             # Firebase Hosting configuration
├── 📄 firestore.rules           # Firestore Security Rules
├── 📄 firestore.indexes.json    # Firestore Composite Indexes
├── 📄 manifest.json             # PWA Web App Manifest
│
├── 🖼️  banner.jpg               # Banner image สำหรับหน้าหลัก
├── 🖼️  logo.png                 # โลโก้โรงเรียนไพวิทยาคาร
│
├── 📘 README.md                 # ไฟล์นี้ — ภาพรวมโปรเจกต์
├── 📋 CHANGELOG.md              # ประวัติการเปลี่ยนแปลงของแต่ละเวอร์ชัน
├── 🗺️  ROADMAP.md               # แผนการพัฒนาในอนาคต
├── 🤝 CONTRIBUTING.md           # คู่มือสำหรับผู้ร่วมพัฒนาและ AI Development Charter
├── 🏗️  ARCHITECTURE.md          # สถาปัตยกรรมระบบและการออกแบบ
├── 🗄️  DATABASE.md              # โครงสร้าง Firestore Collections และ Schema
├── 🔒 SECURITY.md               # นโยบายความปลอดภัยและการรายงานช่องโหว่
├── 🚀 RELEASE.md                # กระบวนการ Release และ Versioning
├── 🏗️  ARCHITECTURE_REFACTOR_PLAN.md # แผนการปรับปรุงและแยก ES Modules 8 เฟส
├── 🗺️  MODULE_DEPENDENCY_MAP.md      # แผนผังการไหลของข้อมูลเชิงลึกและความเชื่อมโยง
├── ⚠️ TECHNICAL_DEBT.md            # รายการหนี้เทคนิคและความเสี่ยงของระบบ
├── ⚡ PERFORMANCE_REVIEW.md         # บทประเมินประสิทธิภาพการทำงานและขีดจำกัด
├── 🗂️ APPJS_FUNCTION_INDEX.md        # ดัชนีฟังก์ชัน 224 เมธอดใน app.js และแผนงาน
└── 📖 walkthrough.md            # บันทึกการพัฒนาและการทดสอบล่าสุด
```

---

## 🏷️ เวอร์ชัน

| เวอร์ชัน | วันที่ | สถานะ |
|---|---|---|
| **v2.2.0** | 6 กรกฎาคม 2569 | ✅ **Current Stable** |
| v2.1.0 | 2 กรกฎาคม 2569 | — |
| v2.0.1 | 1 กรกฎาคม 2569 | — |
| v1.2.0 | 21 มิถุนายน 2569 | — |
| v1.1.0 | 20 มิถุนายน 2569 | — |
| v1.0.0 | 19 มิถุนายน 2569 | — |

ดูรายละเอียดการเปลี่ยนแปลงทั้งหมดได้ที่ [CHANGELOG.md](./CHANGELOG.md)

---

## 🙏 เครดิต

พัฒนาโดย **คณาจารย์โรงเรียนไพวิทยาคาร** ด้วยความช่วยเหลือจาก AI จาก **Antigravity (Google DeepMind)**

- 🏫 **โรงเรียนไพวิทยาคาร** — ผู้ออกแบบ Requirement และผู้ใช้งานหลัก
- 🤖 **Antigravity / Google DeepMind** — AI Assistant สนับสนุนการพัฒนาและเอกสาร

---

<p align="center">
  <sub>Academic Management Platform (AMP) v2.2.0 — โรงเรียนไพวิทยาคาร · MIT License</sub>
</p>
