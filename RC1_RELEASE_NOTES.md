# Release Candidate 1 (RC1) Release Notes

**Project:** sufficiency-economy-attendance  
**Release Target:** Release Candidate 1 (RC1)  
**Date:** July 13, 2026  
**Status:** Frozen for Pilot Use  

---

## 1. RC1 Scope

Release Candidate 1 (RC1) marks the feature freeze for the Sufficiency Economy Attendance & Teaching Log tracking system. The objective of this release is to freeze all code, verify production configurations, and prepare the application for a pilot trial with a selected group of educators. 

No new features, schema adjustments, or visual redesigns will be introduced during the RC1 phase. Only confirmed release-blocking bugs will be resolved.

---

## 2. Completed Features

* **Authentication & Role Access Controls:**
  * Role-based views: Admin, Director (read-only), and Teacher.
  * Role navigation guards in view transitions.
  * Secure logout handling (clearing session storage and volatile data).
* **Attendance Check-in Workflow:**
  * Dynamic student lists based on selected classroom.
  * Quick check-all action.
  * Live status counters (Present, Absent, Late, Leave, Activity).
  * Double-check-in warnings to prevent duplicate daily submissions.
* **Offline Draft and Recovery:**
  * Automated background saving of attendance drafts to `localStorage`.
  * Automatic restore dialog when draft context matches active classroom and teacher.
  * Rejection guards to prevent classroom or teacher draft mismatches.
* **Teaching Log & Lesson Plan Auto-Match:**
  * Quick redirect from attendance save to teaching log prefilled with classroom metadata.
  * SEP (Sufficiency Economy Philosophy) framework mapping (Knowledge & Morality conditions, 3 Principles, 4 Dimensions).
  * Check against duplicate teaching log entries for the same date/slot/class.
* **Validation & Dashboard Alerting:**
  * Dynamic missing attendance slot detection.
  * Warning badges and warning cards displayed on the Executive Dashboard (capped at 5 to prevent UI clutter).
* **Comprehensive Reports:**
  * School-wide and class-specific attendance percentage summaries.
  * Teacher-specific teaching log timelines.
  * SEP framework usage aggregation showing stats and top-linked principles/dimensions.

---

## 3. QA-1 Fixes

* **Report Rendering Crash Fix:** Resolved `TypeError` where direct navigation/deep-linking to reports caused a crash. Added fallback checks for report select dropdowns that are not yet loaded in the DOM.
* **Mobile Table Overflow Fix:** Added responsive table wrapper styling (`.table-responsive` with `overflow-x: auto`) and layout safety padding to ensure proper rendering on screens down to 390px.

---

## 4. Known Limitations

* **Offline Storage Location:** Draft backups are saved to the browser's `localStorage` and are browser/device-specific.
* **No Database Sync for Drafts:** Active drafts are kept locally and will not synchronize to Firestore until successfully submitted online.

---

## 5. Pilot Audience

* **Teachers:** One teacher account assigned per learning base (ฐานการเรียนรู้) for the pilot test.
* **Director/Report Viewers:** Selected administration members to review dashboards and reports in read-only mode.
* **Admins:** System administrators for configuration checks.
