# UI Guidelines — Academic Management Platform (AMP)
## โรงเรียนไพวิทยาคาร · v2.2.0

> [!NOTE]
> **Cross-reference:** ดู [CONTRIBUTING.md](./CONTRIBUTING.md) สำหรับ AI Rules และ [ARCHITECTURE.md](./ARCHITECTURE.md) สำหรับ Tech Stack

**วัตถุประสงค์:** เอกสารนี้กำหนดมาตรฐาน UI ที่ทุก AI agent และนักพัฒนาต้องปฏิบัติตามเพื่อให้ UI มีความสม่ำเสมอตลอดโปรเจกต์

---

## สารบัญ

1. [🎨 Theme (ธีมหลัก)](#-theme-ธีมหลัก)
2. [🔤 Typography (ตัวอักษร)](#-typography-ตัวอักษร)
3. [📐 Spacing (ระยะห่าง)](#-spacing-ระยะห่าง)
4. [🃏 Card Design (การออกแบบ Card)](#-card-design-การออกแบบ-card)
5. [🔘 Button Style (รูปแบบปุ่ม)](#-button-style-รูปแบบปุ่ม)
6. [🪟 Modal Style (รูปแบบ Modal)](#-modal-style-รูปแบบ-modal)
7. [📊 Table Style (รูปแบบตาราง)](#-table-style-รูปแบบตาราง)
8. [📝 Form Style (รูปแบบฟอร์ม)](#-form-style-รูปแบบฟอร์ม)
9. [🎨 Color Palette (ชุดสี)](#-color-palette-ชุดสี)
10. [📱 Responsive Breakpoints](#-responsive-breakpoints)
11. [📋 UI Rules (กฎ UI)](#-ui-rules-กฎ-ui)

---

## 🎨 Theme (ธีมหลัก)

ธีมของ AMP ได้รับแรงบันดาลใจจากปรัชญา **เศรษฐกิจพอเพียง** สะท้อนผ่านภาพลักษณ์ของธรรมชาติ ความเรียบง่าย และความยั่งยืน

| คุณสมบัติ | รายละเอียด |
|---|---|
| **แนวคิด** | ธรรมชาติ, เศรษฐกิจพอเพียง |
| **โทนสี** | สีเขียว · สีน้ำตาล · สีทอง |
| **Mode** | Light mode (ค่าเริ่มต้น) — Dark mode ไม่รองรับในปัจจุบัน |
| **Font (ภาษาไทย)** | `Sarabun` (Google Fonts) |
| **Font (ตัวเลข / code)** | `Inter` |

**การโหลด Font:**

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
```

```css
body {
  font-family: 'Sarabun', 'Inter', sans-serif;
}

code, pre, .number {
  font-family: 'Inter', monospace;
}
```

---

## 🔤 Typography (ตัวอักษร)

| ระดับ | Element | ขนาด | น้ำหนัก | การใช้งาน |
|---|---|---|---|---|
| Page Title | `h1` | `1.75rem` | `700` | ชื่อหน้าหลักของแต่ละ module |
| Section Header | `h2` | `1.35rem` | `600` | หัวข้อหลักภายในหน้า |
| Card Title | `h3` | `1.1rem` | `600` | ชื่อ Card |
| Body Text | `p` | `1rem` | `400` | เนื้อหาทั่วไป |
| Small / Caption | `span.small` | `0.85rem` | `400` | label, timestamp |
| Badge | `span.badge` | `0.75rem` | `600` | status labels |

```css
h1 { font-size: 1.75rem; font-weight: 700; }
h2 { font-size: 1.35rem; font-weight: 600; }
h3 { font-size: 1.1rem;  font-weight: 600; }
p  { font-size: 1rem;    font-weight: 400; line-height: 1.6; }

.small  { font-size: 0.85rem; font-weight: 400; color: var(--color-text-secondary); }
.badge  { font-size: 0.75rem; font-weight: 600; padding: 2px 8px; border-radius: 99px; }
```

---

## 📐 Spacing (ระยะห่าง)

ใช้ CSS custom properties ต่อไปนี้เป็น spacing scale มาตรฐาน **ห้ามใช้ค่าที่ไม่อยู่ใน scale นี้**

```css
:root {
  --space-xs:  4px;
  --space-sm:  8px;
  --space-md:  16px;
  --space-lg:  24px;
  --space-xl:  32px;
  --space-xxl: 48px;
}
```

### กฎการใช้ Spacing

| บริบท | ค่า | ตัวอย่าง |
|---|---|---|
| Card padding | `--space-lg` (24px) | `padding: var(--space-lg)` |
| Section gap | `--space-xl` (32px) | `gap: var(--space-xl)` |
| Button padding (vertical) | `--space-sm` (8px) | `padding-top/bottom: var(--space-sm)` |
| Button padding (horizontal) | `--space-md` (16px) | `padding-left/right: var(--space-md)` |
| Table cell padding (vertical) | `--space-sm` (8px) | `padding-top/bottom: var(--space-sm)` |
| Table cell padding (horizontal) | `--space-md` (16px) | `padding-left/right: var(--space-md)` |

---

## 🃏 Card Design (การออกแบบ Card)

Card คือ building block หลักของทุกหน้าใน AMP ต้องออกแบบให้สม่ำเสมอตามมาตรฐานนี้

```css
.card {
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  padding: 24px;
  transition: box-shadow 0.2s ease;
}

.card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
}

.card-header {
  border-bottom: 1px solid #eeeeee;
  padding-bottom: var(--space-md);
  margin-bottom: var(--space-md);
}
```

### กฎ Card

> [!WARNING]
> **ห้ามใช้ border ด้านข้างหรือด้านล่าง** บน Card เพิ่มเติมจากที่กำหนด — ใช้เฉพาะ `box-shadow` เพื่อแยก Card ออกจาก background

| คุณสมบัติ | ค่า |
|---|---|
| `background` | `#ffffff` |
| `border-radius` | `12px` |
| `box-shadow` (default) | `0 2px 8px rgba(0,0,0,0.08)` |
| `box-shadow` (hover) | `0 4px 16px rgba(0,0,0,0.12)` |
| `padding` | `24px` |
| Card Header border | `border-bottom: 1px solid #eeeeee` |

---

## 🔘 Button Style (รูปแบบปุ่ม)

| ประเภท | Class | สี (Hex) | การใช้งาน |
|---|---|---|---|
| Primary | `.btn-primary` | `#2d6a4f` | Action หลัก เช่น บันทึก, ส่ง |
| Secondary | `.btn-secondary` | `#6c757d` | Action รอง เช่น ยกเลิก |
| Danger | `.btn-danger` | `#dc3545` | ลบ, ปฏิเสธ |
| Success | `.btn-success` | `#52b788` | อนุมัติ |
| Ghost | `.btn-ghost` | `transparent` + border | Action รองที่ไม่สำคัญ |

```css
/* Base button */
.btn {
  border-radius: 8px;
  min-width: 80px;
  min-height: 36px;
  padding: var(--space-sm) var(--space-md);
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  border: none;
  transition: background 0.15s ease, box-shadow 0.15s ease;
}

.btn-primary   { background: #2d6a4f; color: #ffffff; }
.btn-secondary { background: #6c757d; color: #ffffff; }
.btn-danger    { background: #dc3545; color: #ffffff; }
.btn-success   { background: #52b788; color: #ffffff; }
.btn-ghost     { background: transparent; color: #2d6a4f; border: 1px solid #2d6a4f; }

.btn:hover { filter: brightness(0.92); }
.btn:focus { outline: none; box-shadow: 0 0 0 3px rgba(45, 106, 79, 0.25); }
```

> [!CAUTION]
> **ห้ามใช้ปุ่มที่มีขนาดเล็กกว่า `36px` height** — เป็นข้อกำหนดด้าน accessibility เพื่อให้ผู้ใช้สามารถกดได้ง่ายบน mobile

---

## 🪟 Modal Style (รูปแบบ Modal)

```css
/* Backdrop */
.modal-backdrop {
  background: rgba(0, 0, 0, 0.5);
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

/* Modal Box */
.modal-box {
  background: #ffffff;
  border-radius: 16px;
  max-width: 600px;
  width: 90%;
  animation: fadeIn 0.2s ease;
  display: flex;
  flex-direction: column;
  max-height: 90vh;
}

/* Modal Header */
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-lg);
  border-bottom: 1px solid #eeeeee;
}

/* Modal Body */
.modal-body {
  padding: var(--space-lg);
  overflow-y: auto;
  flex: 1;
}

/* Modal Footer */
.modal-footer {
  border-top: 1px solid #eeeeee;
  padding: var(--space-md) var(--space-lg);
  display: flex;
  justify-content: flex-end;
  gap: var(--space-sm);
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-8px); }
  to   { opacity: 1; transform: translateY(0); }
}
```

### โครงสร้าง Modal

| ส่วน | รายละเอียด |
|---|---|
| Backdrop | `rgba(0,0,0,0.5)` ครอบทั้งหน้าจอ |
| Modal Box | background white, `border-radius: 16px`, `max-width: 600px` |
| Modal Header | มี title + close button (X) |
| Modal Body | `padding: 24px`, `overflow-y: auto` |
| Modal Footer | `border-top`, ปุ่ม align right |
| Animation | `fadeIn 0.2s ease` |

---

## 📊 Table Style (รูปแบบตาราง)

```css
.table-container {
  overflow-x: auto; /* Responsive บน mobile */
}

table {
  width: 100%;
  border-collapse: collapse;
  border: none;
}

thead th {
  background: #f8f9fa;
  font-weight: 600;
  padding: var(--space-sm) var(--space-md);
  text-align: left;
  white-space: nowrap;
}

tbody td {
  padding: var(--space-sm) var(--space-md);
  border-top: 1px solid #f0f0f0;
}

tbody tr:hover {
  background: #f0f4f8;
}
```

### กฎ Table

| หัวข้อ | รายละเอียด |
|---|---|
| Header background | `#f8f9fa`, `font-weight: 600` |
| Row hover | background `#f0f4f8` |
| Border | ไม่ใช้ border บน row — ใช้ padding และ `border-top` บน `td` แทน |
| Responsive | ใช้ `overflow-x: auto` บน container สำหรับ mobile |
| Stripe | ไม่บังคับ — แต่ถ้าใช้ต้องสม่ำเสมอทั้ง module |

---

## 📝 Form Style (รูปแบบฟอร์ม)

```css
/* Input, Textarea, Select */
input,
textarea,
select {
  border: 1px solid #ced4da;
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 1rem;
  font-family: 'Sarabun', sans-serif;
  width: 100%;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

/* Focus State */
input:focus,
textarea:focus,
select:focus {
  outline: none;
  border-color: #2d6a4f;
  box-shadow: 0 0 0 3px rgba(45, 106, 79, 0.15);
}

/* Error State */
input.error,
textarea.error,
select.error {
  border-color: #dc3545;
}

.error-message {
  color: #dc3545;
  font-size: 0.85rem;
  margin-top: 4px;
}

/* Label */
label {
  display: block;
  font-weight: 600;
  margin-bottom: 4px;
}

/* Required indicator */
label .required {
  color: #dc3545;
  margin-left: 2px;
}
```

### ตัวอย่างโครงสร้าง Form Field

```html
<div class="form-group">
  <label for="studentName">
    ชื่อนักเรียน <span class="required">*</span>
  </label>
  <input
    id="studentName"
    type="text"
    class="error"
    placeholder="กรอกชื่อ-นามสกุล"
  />
  <span class="error-message">กรุณากรอกชื่อนักเรียน</span>
</div>
```

### กฎ Form

| หัวข้อ | รายละเอียด |
|---|---|
| Default border | `1px solid #ced4da` |
| `border-radius` | `8px` |
| Padding | `8px 12px` |
| Focus border | `#2d6a4f` + `box-shadow: 0 0 0 3px rgba(45,106,79,0.15)` |
| Error border | `#dc3545` |
| Error message | สีแดง `#dc3545`, แสดงใต้ input |
| Label | `font-weight: 600`, แสดงด้านบน input |
| Required fields | แสดง `*` สีแดงหลัง label |

---

## 🎨 Color Palette (ชุดสี)

```css
:root {
  --color-primary:        #2d6a4f;
  --color-primary-light:  #52b788;
  --color-accent:         #d4a017;
  --color-bg:             #f5f5f0;
  --color-card-bg:        #ffffff;
  --color-text-primary:   #1a1a2e;
  --color-text-secondary: #6c757d;
  --color-success:        #52b788;
  --color-warning:        #f4a261;
  --color-danger:         #dc3545;
  --color-info:           #4361ee;
}
```

| ชื่อสี | CSS Variable | Hex |
|---|---|---|
| สีหลัก (Primary) | `--color-primary` | `#2d6a4f` |
| สีหลักอ่อน (Primary Light) | `--color-primary-light` | `#52b788` |
| สีเน้น (Accent / Gold) | `--color-accent` | `#d4a017` |
| สีพื้นหลัง (Background) | `--color-bg` | `#f5f5f0` |
| สีการ์ด (Card Background) | `--color-card-bg` | `#ffffff` |
| สีข้อความหลัก | `--color-text-primary` | `#1a1a2e` |
| สีข้อความรอง | `--color-text-secondary` | `#6c757d` |
| สีสำเร็จ (Success) | `--color-success` | `#52b788` |
| สีแจ้งเตือน (Warning) | `--color-warning` | `#f4a261` |
| สีผิดพลาด (Danger) | `--color-danger` | `#dc3545` |
| สีข้อมูล (Info) | `--color-info` | `#4361ee` |

---

## 📱 Responsive Breakpoints

| Device | Breakpoint | Layout | Sidebar |
|---|---|---|---|
| Desktop | `min-width: 1024px` | 2–3 columns | Fixed |
| Tablet | `768px – 1023px` | 1–2 columns | Collapsible |
| Mobile | `max-width: 767px` | 1 column | Bottom navigation |

```css
/* Desktop */
@media (min-width: 1024px) {
  .layout-grid { grid-template-columns: repeat(3, 1fr); }
  .sidebar { position: fixed; width: 240px; }
}

/* Tablet */
@media (min-width: 768px) and (max-width: 1023px) {
  .layout-grid { grid-template-columns: repeat(2, 1fr); }
  .sidebar { position: relative; width: 100%; }
}

/* Mobile */
@media (max-width: 767px) {
  .layout-grid { grid-template-columns: 1fr; }
  .sidebar { display: none; }
  .bottom-nav { display: flex; }
}
```

> [!TIP]
> ออกแบบโดยใช้หลัก **Mobile First** — เริ่มต้นเขียน CSS สำหรับ mobile แล้วค่อย override ด้วย `min-width` media query เพื่อ desktop

---

## 📋 UI Rules (กฎ UI)

> [!IMPORTANT]
> กฎเหล่านี้บังคับใช้กับ **AI agent และนักพัฒนาทุกคน** ทุก Pull Request จะถูกตรวจสอบตามมาตรฐานนี้

1. **ห้ามออกแบบหน้าเดิมใหม่โดยไม่ได้รับอนุมัติ**
   — ถ้าต้องการ redesign ต้องขอ approval จากเจ้าของโปรเจกต์ก่อนทุกครั้ง

2. **ใช้ component ที่มีอยู่ซ้ำเสมอ**
   — ก่อนสร้าง component ใหม่ ให้ตรวจสอบว่ามี style ที่ใกล้เคียงอยู่แล้วหรือไม่

3. **ห้ามใช้ spacing ที่ไม่สอดคล้องกัน**
   — ใช้เฉพาะค่าจาก spacing scale (`--space-xs` ถึง `--space-xxl`) ที่กำหนดไว้เท่านั้น

4. **ห้ามเพิ่ม CSS Framework ใหม่**
   — โปรเจกต์ใช้ **Vanilla CSS** เท่านั้น ห้ามเพิ่ม Bootstrap, Tailwind, หรือ library อื่นๆ

5. **ทุก interactive element ต้องมี hover state**
   — ปุ่ม, Card, แถวตาราง, link ทุกตัวต้องมี visual feedback เมื่อ hover

6. **ทุก input ต้องมี focus state**
   — ต้องมองเห็นได้ชัดเจน (accessibility) — ต้องไม่ใช้ `outline: none` โดยไม่มีสิ่งทดแทน

7. **ไม่ใช้ inline style**
   — ทุก style ต้องอยู่ใน `style.css` เท่านั้น ห้ามใช้ `style=""` attribute บน HTML element

8. **ทดสอบบน Mobile ก่อน deploy**
   — layout ต้องใช้งานได้บนจอขนาด **375px** ขึ้นไปทุก breakpoint

---

*อัปเดตล่าสุด: 2026-07-06 · AMP v2.2.0 · โรงเรียนไพวิทยาคาร*
