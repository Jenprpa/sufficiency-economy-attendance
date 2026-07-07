# 🤖 คลังคำสั่ง AI (AI Prompt Library)

**Academic Management Platform (AMP)** — โรงเรียนไพวิทยาคาร | Version: v2.2.0

เอกสารนี้รวบรวม Prompt มาตรฐาน (Prompt Templates) สำหรับ AI Agent (เช่น Codex, Antigravity, Gemini, ChatGPT) ที่จะเข้ามาพัฒนาโปรเจกต์นี้ในอนาคต เพื่อควบคุมมาตรฐานการพัฒนาให้สอดคล้องกัน

> [!NOTE]
> **Cross-reference:** ดู [CONTRIBUTING.md](./CONTRIBUTING.md) สำหรับมาตรฐานการเขียนโค้ด (Coding Standards) และกฎของ AI (AI Rules)

---

## 1. 🚀 Feature Sprint Prompt
*สำหรับใช้เมื่อต้องการให้ AI พัฒนาฟีเจอร์ใหม่*

```markdown
You are working on the Academic Management Platform (AMP) for Paiwittayakarn School.
Current version: v2.2.0
Tech stack: HTML5, Vanilla CSS, Vanilla JavaScript, Firebase (Auth & Firestore SDK v10.8.0 compat mode)

Sprint Objective: [อธิบายวัตถุประสงค์ของ Feature เช่น Add teaching log module]
Proposed Files: [ระบุไฟล์ที่ต้องการแก้ไข/สร้างใหม่ เช่น app.js, index.html]

Rules:
1. You MUST NOT remove any existing features.
2. You MUST NOT modify the UI styling/layout unless explicitly requested.
3. Keep comments in Thai for business logic, English for technical logic.
4. Maintain backward compatibility with existing Firestore document schemas.
5. All async functions must use try/catch blocks.
6. Before finishing, you must run syntax validation and provide a walkthrough.md artifact.

Task:
Please analyze the codebase and implement the requested feature following the design guidelines in UI_GUIDELINES.md.
```

---

## 2. 🐛 Bug Fix Prompt
*สำหรับใช้เมื่อเกิดข้อผิดพลาดในระบบและต้องการให้ AI แก้ไข*

```markdown
You are working on the Academic Management Platform (AMP) for Paiwittayakarn School.
Current version: v2.2.0

Bug Report:
- Issue: [อธิบายปัญหา เช่น Offline check-in fails to sync due to missing timestamp]
- Steps to Reproduce: [ขั้นตอนการทำซ้ำ]
- Expected Behavior: [พฤติกรรมที่คาดหวัง]
- Actual Behavior: [พฤติกรรมที่เป็นจริง]

Rules:
1. Fix ONLY the reported bug. Do NOT refactor or add new features.
2. Ensure the fix does not break backward compatibility for existing records.
3. Validate javascript syntax after applying the fix.
4. Update CHANGELOG.md under the "Fixed" section of the current version.

Task:
Please locate the bug in [ระบุไฟล์] and apply the fix.
```

---

## 3. ✅ Verification Prompt
*สำหรับใช้เมื่อต้องการให้ AI ตรวจสอบความถูกต้องของโค้ดและการทำงาน*

```markdown
You are working on the Academic Management Platform (AMP) for Paiwittayakarn School.
Current version: v2.2.0

Please verify the following implementation:
- Feature name: [ชื่อฟีเจอร์ที่ต้องการตรวจสอบ]
- Commits/Changes: [รายการไฟล์หรือโค้ดที่เปลี่ยน]

Verification Checklist:
1. Syntax Validation: Run syntax checks on app.js (e.g. using node -c).
2. Backward Compatibility: Verify that old Firestore documents (without new fields) do not crash the app.
3. Role-Based Access Control (RBAC): Verify access permissions against the matrix in ROLE_MATRIX.md.
4. Offline Support: Test if the local caching and staging queue functions correctly when Firebase is disconnected.
5. HTML/CSS Validation: Ensure the UI changes are responsive (test on 375px mobile layout).

Task:
Perform the verification steps and output a report showing PASS/FAIL for each checklist item.
```

---

## 4. 🏷️ Release Prompt
*สำหรับใช้เมื่อต้องการเตรียมความพร้อมและออกเวอร์ชันใหม่*

```markdown
Prepare the release process for AMP v[VERSION].

Release Checklist:
1. Verify app.js syntax (must pass with no errors).
2. Verify all files match the current version number [VERSION] in headers/badges.
3. Compile all changes into CHANGELOG.md (follow Keep a Changelog standard).
4. Update README.md with the new version and release date.
5. Review the firestore.rules and firestore.indexes.json for any updates.
6. Outline the deployment steps for Firebase Hosting.

Task:
Generate the release files and summarize the changes.
```

---

## 5. 🏗️ Architecture Review Prompt
*สำหรับใช้เมื่อต้องการให้ AI ตรวจสอบและประเมินคุณภาพของโครงสร้างโค้ด (Architecture)*

```markdown
Analyze the architecture of the Academic Management Platform (AMP).
Current file: app.js (~11,900+ lines of Vanilla JavaScript)

Review Objectives:
1. God Class Risk: Evaluate the current state of app.js. Is it maintainable? Recommend division points for future refactoring.
2. Separation of Concerns: Identify mixed logic (e.g. UI rendering mixed with Firestore write calls).
3. Memory / Storage Limits: Check if any Firestore queries or documents are close to limits (e.g., rotation schedule size limit).
4. Cache Strategy: Verify if the service worker (sw.js) cache policy is optimal.

Task:
Provide an architectural health check report with a list of technical debts prioritized by impact.
```

---

## 6. 🔒 Security Audit Prompt
*สำหรับใช้เพื่อตรวจสอบความปลอดภัยของระบบ ข้อมูล และกฎการเข้าถึง*

```markdown
Conduct a security audit on the Academic Management Platform (AMP) codebase.

Audit Scope:
1. DOM XSS Vulnerabilities: Check all usages of innerHTML in app.js. Ensure data from user inputs is properly sanitized.
2. Firebase Firestore Rules: Review firestore.rules. Verify that write and read operations are secured by user role and document ownership.
3. LocalStorage Security: Inspect what data is cached locally. Ensure no secrets, plain passwords, or sensitive PII are persisted.
4. Role Escalation: Check if a client-side role change (e.g. altering local cache role) can bypass Firestore write rules.

Task:
Document security findings and provide code recommendations to resolve each vulnerability.
```

---

## 7. 📚 Documentation Sprint Prompt
*สำหรับใช้เมื่อต้องการอัปเดตหรือเพิ่มเอกสารโปรเจกต์เท่านั้น*

```markdown
Start a Documentation Sprint [SPRINT_ID] for AMP v2.2.0.

Objective: [ระบุหัวข้อเอกสารที่ต้องการ เช่น Update database schema documentation]
Target Files: [ระบุไฟล์เอกสาร เช่น DATABASE.md]

Rules:
1. Documentation ONLY. Do NOT write or modify application features, UI elements, or Firestore rules.
2. Write the documentation in Thai. Keep technical keywords, code examples, database collections, and field names in English.
3. Ensure headings are consistent and all markdown links between documents function correctly.

Task:
Review the codebase and generate the requested documentation.
```

---

## 8. 🚀 Git Release Prompt
*สำหรับให้ AI นำทางหรือรันกระบวนการ Git workflow สำหรับการ release*

```markdown
Execute Git release steps for AMP v[VERSION].

Steps to verify and perform:
1. Check git status to ensure working directory is clean.
2. Stage all modifications (git add .).
3. Commit with standard message (e.g., feat(lesson-plan): add sufficiency framework v[VERSION]).
4. Push to origin main.
5. Create release tag: git tag v[VERSION].
6. Push tag to origin: git push origin v[VERSION].

Task:
Execute or guide the developer through these commands, checking the output of each step for errors.
```

---

## 9. 🗄️ Firestore Review Prompt
*สำหรับให้ AI ตรวจสอบการตั้งค่า Schema, Rules และ Index ใน Firestore*

```markdown
Review the Firestore configuration files:
- firestore.rules
- firestore.indexes.json
- Database schemas described in DATABASE.md

Audit Checklist:
1. Check for missing rules for new collections.
2. Check for missing composite indexes in firestore.indexes.json for complex queries in app.js.
3. Verify that rules enforce role-based access for all operations (get, list, create, update, delete).

Task:
Provide an analysis of the Firestore setup and generate updated rules or index files if required.
```

---

## 10. ⚡ Performance Review Prompt
*สำหรับใช้ให้ AI วิเคราะห์ประสิทธิภาพการทำงานและความเร็วของระบบ*

```markdown
Review the performance of the Academic Management Platform (AMP) progressive web app.

Areas to analyze:
1. Bundle Size & Parsing: Analyze the loading performance of index.html with style.css and app.js (11,900+ lines).
2. Firestore Queries: Evaluate if read calls are optimized. Suggest paging or caching strategies for large collections.
3. Service Worker Performance: Assess sw.js caching strategy. Are assets served stale-while-revalidate?
4. Chart Rendering: Check if Chart.js is causing layout shifts or lag on low-end mobile devices.

Task:
Generate a performance optimization plan with concrete action items.
```
