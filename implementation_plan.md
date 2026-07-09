# Sprint F2 – Attendance to Teaching Log Integration

## Objective
After attendance save succeeds, prompt teacher to create a linked Teaching Log with prefilled context.

## Proposed Changes

### app.js — 4 changes

#### [MODIFY] saveCurrentAttendanceWithOptions (line ~4123)
Replace lines 4123–4126 (the Live success block) with a call to a new handler.  
The staging path (line 4043) stays unchanged — staging logs are drafts, not final saves.

#### [NEW] 4 helper methods (added after saveCurrentAttendanceWithOptions ~line 4128)
1. `_buildAttendanceContext(scheduleRow, attendanceState, students)` — builds context object from live save state
2. `_findMatchingLessonPlan(ctx)` — finds best matching lesson_plan by teacherUid+year+semester+week+baseId/grade
3. `_findExistingTeachingLog(ctx)` — duplicate check by attendanceLogId OR compound key
4. `openTeachingLogFromAttendance(ctx)` — main orchestrator: checks duplicate → opens form with prefill

#### [MODIFY] renderTeachingLogForm (line ~12303)
Respect `this.pendingAttendanceContext` prefill when `isNew` and context present.

### No other files changed (app.js only for implementation)
### Docs updated after implementation: CHANGELOG, ROADMAP, DATABASE, ARCHITECTURE, DATA_FLOW, walkthrough.md

## Verification
- node -c app.js ✓
- node -c sw.js ✓  
- Manual: Save attendance → prompt → open form → fields prefilled → lesson plan auto-selected

## Implementation Summary

F2 implemented:
- Attendance save creates Teaching Log prefill draft
- Teaching Log form shows attendance-origin notice
- Teaching Log stores sourceAttendanceLogId/sourceType
- Prefill state clears after successful save

