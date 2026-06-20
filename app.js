// Pai Wittyakarn School Student Attendance App - Core Engine

class AttendanceApp {
    constructor() {
        this.db = {};
        this.currentUser = null;
        this.currentView = 'dashboard';
        this.manageTab = 'students';
        this.systemDate = '2026-06-20'; // Current Local Time simulated
        this.studentPage = 1;
        this.pageSize = 15;
        
        // Active Charts
        this.dashChart = null;
        this.adminChart = null;

        // Firestore properties
        this.useFirestore = false;
        this.firestore = null;

        // Initialize App
        this.init();
    }

    // Initialize databases and bindings
    async init() {
        // Initialize Firestore
        this.initFirestore();

        // 1. Load database or seed demo data
        await this.loadDatabase();

        // 2. Bind DOM Events
        this.bindEvents();

        // 3. Sync Simulator Date
        document.getElementById('system-date-input').value = this.systemDate;

        // 4. Load Current User Session
        this.loadSession();

        // 5. Render active view
        this.render();

        // Check Nightly Backup
        if (this.useFirestore) {
            this.checkNightlyBackup();
            this.loadCloudBackups();
            this.loadAuditLogs();
        }
    }

    initFirestore() {
        const firebaseConfig = {
            apiKey: "PLACEHOLDER_FIREBASE_API_KEY",
            authDomain: "PLACEHOLDER_FIREBASE_AUTH_DOMAIN",
            projectId: "PLACEHOLDER_FIREBASE_PROJECT_ID",
            storageBucket: "PLACEHOLDER_FIREBASE_STORAGE_BUCKET",
            messagingSenderId: "PLACEHOLDER_FIREBASE_MESSAGING_SENDER_ID",
            appId: "PLACEHOLDER_FIREBASE_APP_ID"
        };

        if (firebaseConfig.apiKey === "PLACEHOLDER_FIREBASE_API_KEY") {
            this.useFirestore = false;
            console.log("Firebase placeholder keys detected, using LocalStorage.");
            return;
        }

        try {
            firebase.initializeApp(firebaseConfig);
            this.firestore = firebase.firestore();
            this.useFirestore = true;
            console.log("Firebase Firestore initialized successfully.");
        } catch (e) {
            console.error("Error initializing Firebase:", e);
            this.useFirestore = false;
        }
    }

    updateFirestoreConnectionStatus(connected) {
        const badge = document.getElementById('firestore-status-badge');
        if (badge) {
            if (connected && this.useFirestore) {
                badge.textContent = 'เชื่อมต่อสำเร็จ';
                badge.style.backgroundColor = 'var(--secondary)'; // green
            } else {
                badge.textContent = 'ไม่ได้เชื่อมต่อ / ออฟไลน์ (Local Storage)';
                badge.style.backgroundColor = 'var(--accent)'; // red
            }
        }
    }

    // Check localStorage, if empty seed dummy data
    async loadDatabase() {
        if (this.useFirestore) {
            try {
                const collections = ['students', 'teachers', 'bases', 'rotation_schedule', 'attendance_logs'];
                const loadedDb = {};
                let hasData = true;

                // Load all collections concurrently
                const promises = collections.map(col => this.firestore.collection('system_data').doc(col).get());
                const docs = await Promise.all(promises);

                for (let i = 0; i < collections.length; i++) {
                    const doc = docs[i];
                    if (doc.exists) {
                        loadedDb[collections[i]] = doc.data().data || [];
                    } else {
                        hasData = false;
                        break;
                    }
                }

                if (hasData) {
                    this.db = loadedDb;
                    this.updateFirestoreConnectionStatus(true);
                    this.runMigrationChecks();
                    return;
                } else {
                    console.log("No data found in Firestore, seeding demo data...");
                    await this.resetToDemoData(false);
                    return;
                }
            } catch (e) {
                console.error("Failed to load database from Firestore, falling back to LocalStorage:", e);
                this.useFirestore = false;
                this.updateFirestoreConnectionStatus(false);
            }
        }

        const students = localStorage.getItem('school_students');
        const teachers = localStorage.getItem('school_teachers');
        const bases = localStorage.getItem('school_bases');
        const schedule = localStorage.getItem('school_rotation_schedule');
        const logs = localStorage.getItem('school_attendance_logs');

        if (!students || !teachers || !bases || !schedule || !logs) {
            await this.resetToDemoData(false); // Seed without forcing confirmation on first load
        } else {
            this.db.students = JSON.parse(students);
            this.db.teachers = JSON.parse(teachers);
            this.db.bases = JSON.parse(bases);
            this.db.rotation_schedule = JSON.parse(schedule);
            this.db.attendance_logs = JSON.parse(logs);
            this.runMigrationChecks();
        }
    }

    // Save database state to localStorage & Firestore
    async saveDatabase() {
        localStorage.setItem('school_students', JSON.stringify(this.db.students));
        localStorage.setItem('school_teachers', JSON.stringify(this.db.teachers));
        localStorage.setItem('school_bases', JSON.stringify(this.db.bases));
        localStorage.setItem('school_rotation_schedule', JSON.stringify(this.db.rotation_schedule));
        localStorage.setItem('school_attendance_logs', JSON.stringify(this.db.attendance_logs));

        if (this.useFirestore) {
            try {
                const batch = this.firestore.batch();
                const collections = ['students', 'teachers', 'bases', 'rotation_schedule', 'attendance_logs'];
                collections.forEach(col => {
                    const docRef = this.firestore.collection('system_data').doc(col);
                    batch.set(docRef, { data: this.db[col] });
                });
                await batch.commit();
                await this.triggerAutoBackup();
                this.updateFirestoreConnectionStatus(true);
            } catch (e) {
                console.error("Failed to save database to Firestore:", e);
                this.updateFirestoreConnectionStatus(false);
            }
        }
    }

    async triggerAutoBackup(isNightly = false) {
        if (!this.useFirestore) return;
        try {
            const timestamp = new Date();
            const backupId = 'backup_' + timestamp.getTime();
            const backupDoc = {
                id: backupId,
                timestamp: timestamp,
                isNightly: isNightly,
                operatorName: this.currentUser ? this.currentUser.name : "System",
                operatorUsername: this.currentUser ? this.currentUser.username : "system",
                stats: {
                    studentsCount: this.db.students.length,
                    teachersCount: this.db.teachers.length,
                    basesCount: this.db.bases.length,
                    logsCount: this.db.attendance_logs.length
                },
                db: this.db
            };
            await this.firestore.collection('backups').doc(backupId).set(backupDoc);
            console.log("Auto backup completed:", backupId);
            this.loadCloudBackups();
        } catch (e) {
            console.error("Failed to trigger auto backup:", e);
        }
    }

    async checkNightlyBackup() {
        if (!this.useFirestore) return;
        try {
            const query = await this.firestore.collection('backups')
                .where('isNightly', '==', true)
                .orderBy('timestamp', 'desc')
                .limit(1)
                .get();
            
            let needNightly = true;
            if (!query.empty) {
                const latest = query.docs[0].data();
                const latestDate = latest.timestamp.toDate().toDateString();
                const todayString = new Date().toDateString();
                if (latestDate === todayString) {
                    needNightly = false;
                }
            }
            
            if (needNightly) {
                console.log("Triggering nightly cloud backup...");
                await this.triggerAutoBackup(true);
                await this.logAudit("Nightly cloud backup executed automatically");
            }
        } catch (e) {
            console.error("Failed to check nightly backup:", e);
        }
    }

    async loadCloudBackups() {
        if (!this.useFirestore) return;
        try {
            const snapshot = await this.firestore.collection('backups')
                .orderBy('timestamp', 'desc')
                .limit(20)
                .get();
            
            const tbody = document.getElementById('cloud-backups-table-body');
            if (!tbody) return;

            if (snapshot.empty) {
                tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-secondary);">ไม่มีข้อมูลสำรองบนคลาวด์</td></tr>`;
                return;
            }

            let html = '';
            snapshot.forEach(doc => {
                const data = doc.data();
                const ts = data.timestamp ? data.timestamp.toDate() : new Date();
                const timeStr = ts.toLocaleString('th-TH');
                const isNightlyTag = data.isNightly ? ' <span class="status-badge" style="background-color: var(--primary); font-size:10px;">Nightly</span>' : '';
                
                html += `
                    <tr>
                        <td><code>${data.id}</code>${isNightlyTag}</td>
                        <td>${timeStr}</td>
                        <td>${data.stats ? data.stats.teachersCount : 0} คน</td>
                        <td>${data.stats ? data.stats.studentsCount : 0} คน</td>
                        <td>${data.stats ? data.stats.basesCount : 0} ฐาน</td>
                        <td>${data.operatorName || 'System'}</td>
                        <td>
                            <button class="btn btn-outline btn-sm" onclick="app.restoreDatabaseFromCloud('${data.id}')">
                                <i class="fa-solid fa-cloud-arrow-down"></i> กู้คืนข้อมูล
                            </button>
                        </td>
                    </tr>
                `;
            });
            tbody.innerHTML = html;
        } catch (e) {
            console.error("Error loading backups:", e);
        }
    }

    async restoreDatabaseFromCloud(backupId) {
        if (!this.useFirestore) return;
        if (!confirm(`คุณต้องการกู้คืนข้อมูลระบบจากแบ็กอัป ${backupId} ใช่หรือไม่? ข้อมูลปัจจุบันจะถูกแทนที่ทั้งหมด`)) {
            return;
        }

        try {
            const doc = await this.firestore.collection('backups').doc(backupId).get();
            if (!doc.exists) {
                alert("ไม่พบข้อมูลสำรองนี้บนคลาวด์");
                return;
            }

            const backupData = doc.data().db;
            if (backupData) {
                this.db = backupData;
                await this.saveDatabase();
                await this.logAudit(`Restored database from cloud snapshot ${backupId}`);
                alert("กู้คืนข้อมูลระบบเรียบร้อยแล้ว!");
                this.render();
            } else {
                alert("โครงสร้างข้อมูลในแบ็กอัปไม่ถูกต้อง");
            }
        } catch (e) {
            console.error("Failed to restore from backup:", e);
            alert("เกิดข้อผิดพลาดในการกู้คืนข้อมูล: " + e.message);
        }
    }

    async manualCloudBackup() {
        if (!this.useFirestore) {
            alert("ระบบคลาวด์ไม่ได้เชื่อมต่อ ไม่สามารถทำการสำรองข้อมูลได้");
            return;
        }
        try {
            await this.triggerAutoBackup(false);
            await this.logAudit("Manual cloud backup executed");
            alert("สำรองข้อมูลขึ้นคลาวด์เรียบร้อยแล้ว!");
        } catch (e) {
            alert("เกิดข้อผิดพลาดในการสำรองข้อมูล: " + e.message);
        }
    }

    async logAudit(actionDescription) {
        if (!this.useFirestore) return;
        try {
            const logId = 'audit_' + new Date().getTime() + '_' + Math.random().toString(36).substr(2, 5);
            const auditDoc = {
                id: logId,
                timestamp: new Date(),
                operatorName: this.currentUser ? this.currentUser.name : "System",
                operatorUsername: this.currentUser ? this.currentUser.username : "system",
                operatorRole: this.currentUser ? this.currentUser.role : "system",
                action: actionDescription
            };
            await this.firestore.collection('audit_logs').doc(logId).set(auditDoc);
            this.loadAuditLogs();
        } catch (e) {
            console.error("Failed to log audit:", e);
        }
    }

    async loadAuditLogs() {
        if (!this.useFirestore) return;
        try {
            const snapshot = await this.firestore.collection('audit_logs')
                .orderBy('timestamp', 'desc')
                .limit(50)
                .get();
            
            const tbody = document.getElementById('audit-logs-table-body');
            if (!tbody) return;

            if (snapshot.empty) {
                tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-secondary);">ไม่มีบันทึกประวัติ</td></tr>`;
                return;
            }

            let html = '';
            snapshot.forEach(doc => {
                const data = doc.data();
                const ts = data.timestamp ? data.timestamp.toDate() : new Date();
                const timeStr = ts.toLocaleString('th-TH');
                let roleThai = 'ผู้ดูแลระบบ';
                if (data.operatorRole === 'teacher') roleThai = 'ครูประจำฐาน';
                if (data.operatorRole === 'director') roleThai = 'ผู้บริหาร';
                if (data.operatorRole === 'system') roleThai = 'ระบบ';

                html += `
                    <tr>
                        <td style="white-space: nowrap;">${timeStr}</td>
                        <td><strong>${data.operatorName}</strong> <span style="font-size:11px; color:var(--text-secondary);">(@${data.operatorUsername})</span></td>
                        <td>${roleThai}</td>
                        <td>${data.action}</td>
                    </tr>
                `;
            });
            tbody.innerHTML = html;
        } catch (e) {
            console.error("Error loading audit logs:", e);
        }
    }

    runMigrationChecks() {
        // Auto-update teachers with new school executives/admin if missing or incorrect
        const requiredExecutives = [
            { username: "deputy1", name: "นายปุรเชษฐ์ มธุรส", role: "director", password: "081-7646763", phone: "081-7646763" },
            { username: "deputy2", name: "นางสาวกษมา อุดทาเรือน", role: "director", password: "094-4976328", phone: "094-4976328" },
            { username: "deputy3", name: "นางสาวหัสดาภรณ์ พรหมคำติ๊บ", role: "director", password: "091-8521021", phone: "091-8521021" },
            { username: "admin", name: "นางสาวเจนประภา เรือนคำ", role: "admin" }
        ];

        let dbChanged = false;

        // Remove old director username from local database if migrating
        const oldDirectorIndex = this.db.teachers.findIndex(t => t.username === 'director');
        if (oldDirectorIndex !== -1) {
            this.db.teachers.splice(oldDirectorIndex, 1);
            dbChanged = true;
        }

        requiredExecutives.forEach(exec => {
            const found = this.db.teachers.find(t => t.username === exec.username);
            if (!found) {
                this.db.teachers.push(exec);
                dbChanged = true;
            } else {
                // Make sure name and role are up to date
                if (found.role !== exec.role) {
                    found.role = exec.role;
                    dbChanged = true;
                }
                if (found.name !== exec.name) {
                    found.name = exec.name;
                    dbChanged = true;
                }
                if (exec.password && found.password !== exec.password) {
                    found.password = exec.password;
                    dbChanged = true;
                }
                if (exec.phone && found.phone !== exec.phone) {
                    found.phone = exec.phone;
                    dbChanged = true;
                }
            }
        });

        // Migration for Base 5 teachers and name
        const newBase5Teachers = [
            { username: "samrit", name: "ครูสัมฤทธิ์ ไชยทารินทร์", role: "teacher" },
            { username: "pattaya", name: "ครูพัทยา ยะมะโน", role: "teacher" },
            { username: "siwaporn", name: "ครูศิวพร รุ่งเรือง", role: "teacher" },
            { username: "phetcharin", name: "นางสาวเพชรดารินทร์ เดชชลธี", role: "teacher" },
            { username: "duangsuda", name: "นางดวงสุดา เรืองวุฒิ", role: "teacher" },
            { username: "kongphop", name: "นายก้องภพ มูลศรี", role: "teacher" },
            { username: "thanchanok", name: "นางสาวธัญชนก พงษ์ศรี", role: "teacher" },
            { username: "parichart", name: "นางสาวปาริชาติ แก้วศักดิ์", role: "teacher" }
        ];

        newBase5Teachers.forEach(tInfo => {
            const found = this.db.teachers.find(t => t.username === tInfo.username);
            if (!found) {
                this.db.teachers.push(tInfo);
                dbChanged = true;
            } else if (found.name !== tInfo.name) {
                found.name = tInfo.name;
                dbChanged = true;
            }
        });

        const base5 = this.db.bases.find(b => b.id === 'base5');
        if (base5) {
            if (base5.name !== 'หรรษาสุธารสเห็ด') {
                base5.name = 'หรรษาสุธารสเห็ด';
                dbChanged = true;
            }
            const defaultTeacherStr = "ครูสัมฤทธิ์ ไชยทารินทร์, นางดวงสุดา เรืองวุฒิ, ครูพัทยา ยะมะโน, ครูศิวพร รุ่งเรือง, นางสาวเพชรดารินทร์ เดชชลธี, นางสาวปาริชาติ แก้วศักดิ์, นางสาวเจนประภา เรือนคำ, นายก้องภพ มูลศรี, นางสาวธัญชนก พงษ์ศรี";
            const teacherIdStr = "samrit, duangsuda, pattaya, siwaporn, phetcharin, parichart, admin, kongphop, thanchanok";
            if (base5.defaultTeacher !== defaultTeacherStr || base5.teacherId !== teacherIdStr) {
                base5.defaultTeacher = defaultTeacherStr;
                base5.teacherId = teacherIdStr;
                dbChanged = true;
            }
        }

        // Sync rotation schedule Base 5 details
        if (this.db.rotation_schedule) {
            this.db.rotation_schedule.forEach(sch => {
                if (sch.baseId === 'base5') {
                    if (sch.baseName !== 'หรรษาสุธารสเห็ด') {
                        sch.baseName = 'หรรษาสุธารสเห็ด';
                        dbChanged = true;
                    }
                    const defaultTeacherStr = "ครูสัมฤทธิ์ ไชยทารินทร์, นางดวงสุดา เรืองวุฒิ, ครูพัทยา ยะมะโน, ครูศิวพร รุ่งเรือง, นางสาวเพชรดารินทร์ เดชชลธี, นางสาวปาริชาติ แก้วศักดิ์, นางสาวเจนประภา เรือนคำ, นายก้องภพ มูลศรี, นางสาวธัญชนก พงษ์ศรี";
                    const teacherIdStr = "samrit, duangsuda, pattaya, siwaporn, phetcharin, parichart, admin, kongphop, thanchanok";
                    if (sch.teacherName !== defaultTeacherStr || sch.teacherId !== teacherIdStr) {
                        sch.teacherName = defaultTeacherStr;
                        sch.teacherId = teacherIdStr;
                        dbChanged = true;
                    }
                }
            });
        }

        if (dbChanged) {
            this.saveDatabase();
        }
    }

    // Seed realistic database
    resetToDemoData(showConfirm = true) {
        if (showConfirm && !confirm("คุณต้องการลบข้อมูลทั้งหมดและเริ่มฐานข้อมูลทดลองใหม่ใช่หรือไม่? (ประวัติการเช็กชื่อเดิมจะสูญหาย)")) {
            return;
        }

        // 1. Bases
        const bases = [
            { id: "base1", name: "ไฟเบอร์ ทรงพลัง", defaultRoom: "หอประชุมพุทธรักษา", defaultTeacher: "ครูนงนุช รักษ์ดิน, ครูเกื้อกูล ดินดี", teacherId: "teacher1, teacher1_2" },
            { id: "base2", name: "อาณาจักรอักษร", defaultRoom: "ห้อง 2206", defaultTeacher: "ครูวรรณนา ภาษาไทย, ครูรักไทย เขียนดี", teacherId: "teacher2, teacher2_2" },
            { id: "base3", name: "เงาในน้ำ", defaultRoom: "ห้อง 1208", defaultTeacher: "ครูสมชาย เงาดี, ครูเกรียงไกร สอนน้ำ", teacherId: "teacher3, teacher3_2" },
            { id: "base4", name: "ไก่ไข่อารมณ์ดี", defaultRoom: "ห้อง 2101", defaultTeacher: "ครูอนันต์ ใจดี, ครูสุขใจ เลี้ยงไก่", teacherId: "teacher4, teacher4_2" },
            { id: "base5", name: "หรรษาสุธารสเห็ด", defaultRoom: "ห้อง 1103, ห้อง 1105, ห้องคหกรรม", defaultTeacher: "ครูสัมฤทธิ์ ไชยทารินทร์, นางดวงสุดา เรืองวุฒิ, ครูพัทยา ยะมะโน, ครูศิวพร รุ่งเรือง, นางสาวเพชรดารินทร์ เดชชลธี, นางสาวปาริชาติ แก้วศักดิ์, นางสาวเจนประภา เรือนคำ, นายก้องภพ มูลศรี, นางสาวธัญชนก พงษ์ศรี", teacherId: "samrit, duangsuda, pattaya, siwaporn, phetcharin, parichart, admin, kongphop, thanchanok" },
            { id: "base6", name: "ต้นกล้าประชาธิปไตย", defaultRoom: "ห้อง 2301", defaultTeacher: "ครูประยุทธ์ กล้าหาญ, ครูรักชาติ ยิ่งชีพ", teacherId: "teacher6, teacher6_2" },
            { id: "base7", name: "หลู่ล่างกานเครือ เกื้อบุญ", defaultRoom: "หอประชุมศุภเมธี", defaultTeacher: "ครูวิไล เกื้อกูล, ครูใจดี มีธรรม", teacherId: "teacher7, teacher7_2" }
        ];

        // 2. Teachers
        const teachers = [
            { username: "teacher1", name: "ครูนงนุช รักษ์ดิน", role: "teacher" },
            { username: "teacher1_2", name: "ครูเกื้อกูล ดินดี", role: "teacher" },
            { username: "teacher2", name: "ครูวรรณนา ภาษาไทย", role: "teacher" },
            { username: "teacher2_2", name: "ครูรักไทย เขียนดี", role: "teacher" },
            { username: "teacher3", name: "ครูสมชาย เงาดี", role: "teacher" },
            { username: "teacher3_2", name: "ครูเกรียงไกร สอนน้ำ", role: "teacher" },
            { username: "teacher4", name: "ครูอนันต์ ใจดี", role: "teacher" },
            { username: "teacher4_2", name: "ครูสุขใจ เลี้ยงไก่", role: "teacher" },
            { username: "samrit", name: "ครูสัมฤทธิ์ ไชยทารินทร์", role: "teacher" },
            { username: "pattaya", name: "ครูพัทยา ยะมะโน", role: "teacher" },
            { username: "siwaporn", name: "ครูศิวพร รุ่งเรือง", role: "teacher" },
            { username: "phetcharin", name: "นางสาวเพชรดารินทร์ เดชชลธี", role: "teacher" },
            { username: "duangsuda", name: "นางดวงสุดา เรืองวุฒิ", role: "teacher" },
            { username: "kongphop", name: "นายก้องภพ มูลศรี", role: "teacher" },
            { username: "thanchanok", name: "นางสาวธัญชนก พงษ์ศรี", role: "teacher" },
            { username: "parichart", name: "นางสาวปาริชาติ แก้วศักดิ์", role: "teacher" },
            { username: "teacher6", name: "ครูประยุทธ์ กล้าหาญ", role: "teacher" },
            { username: "teacher6_2", name: "ครูรักชาติ ยิ่งชีพ", role: "teacher" },
            { username: "teacher7", name: "ครูวิไล เกื้อกูล", role: "teacher" },
            { username: "teacher7_2", name: "ครูใจดี มีธรรม", role: "teacher" },
            { username: "deputy1", name: "นายปุรเชษฐ์ มธุรส", role: "director", password: "081-7646763", phone: "081-7646763" },
            { username: "deputy2", name: "นางสาวกษมา อุดทาเรือน", role: "director", password: "094-4976328", phone: "094-4976328" },
            { username: "deputy3", name: "นางสาวหัสดาภรณ์ พรหมคำติ๊บ", role: "director", password: "091-8521021", phone: "091-8521021" },
            { username: "admin", name: "นางสาวเจนประภา เรือนคำ", role: "admin" }
        ];

        // 3. Students Generator (realistic Thai names and classrooms)
        const firstNames = ["สมชาย", "วิชัย", "กิตติ", "พงศ์ธร", "ธีรพงษ์", "อภิสิทธิ์", "ณัฐพล", "เกียรติศักดิ์", "สิทธิพล", "จิรายุ", "วรรณนา", "นงนุช", "วิไล", "สุภาภรณ์", "นภา", "สิริพร", "รัตนา", "จิราภรณ์", "พัชรา", "ยลดา", "มาลี", "กัญญารัตน์", "ธัญญารัตน์", "เปรมิกา", "สุจิตรา", "วรัญญา", "ชลลดา", "ศิริวรรณ", "นันทนา", "ลัดดา"];
        const lastNames = ["ใจดี", "รักชาติ", "มั่งคั่ง", "รุ่งเรือง", "ดีเลิศ", "แก้วมณี", "ยิ้มแย้ม", "สุขใจ", "เกื้อกูล", "เงาดี", "ประเสริฐ", "ชูใจ", "แสนดี", "โชคดี", "วงศ์วิริยะ", "ศรีสุข", "เลิศอนันต์", "ดวงแก้ว", "สุขแสน", "ทองคำ", "เจริญศรี", "พัฒนา", "ภักดี", "สิงห์โต", "พิทักษ์", "บำรุง", "จิตรดี", "มั่นเหมาะ", "ชื่นบาน", "ธรรมรักษา"];
        
        const studentClasses = [
            { grade: "ม.1", rooms: [1, 2, 3, 4, 5, 6, 7, 8, 9] },
            { grade: "ม.2", rooms: [1, 2, 3, 4, 5, 6, 7, 8, 9] },
            { grade: "ม.3", rooms: [1, 2, 3, 4, 5, 6, 7, 8] },
            { grade: "ม.4", rooms: [1, 2, 3, 4, 5, 6, 7] },
            { grade: "ม.5", rooms: [1, 2, 3, 4, 5, 6] },
            { grade: "ม.6", rooms: [1, 2, 3, 4, 5, 6] }
        ];

        const students = [];
        let idCounter = 25001;

        studentClasses.forEach(g => {
            g.rooms.forEach(room => {
                // Generate 5 students per classroom
                for (let i = 1; i <= 5; i++) {
                    const fn = firstNames[Math.floor(Math.random() * firstNames.length)];
                    const ln = lastNames[Math.floor(Math.random() * lastNames.length)];
                    
                    // Boy/Girl prefix for lower grades, Mr/Miss for higher grades
                    let prefix = "";
                    const isJunior = (g.grade === "ม.1" || g.grade === "ม.2" || g.grade === "ม.3");
                    if (isJunior) {
                        prefix = (Math.random() > 0.5) ? "เด็กชาย" : "เด็กหญิง";
                    } else {
                        prefix = (Math.random() > 0.5) ? "นาย" : "นางสาว";
                    }

                    // Pre-calculate group index for backwards compatibility
                    let groupIndex = 0;
                    if (g.grade === 'ม.1' && (room === 1 || room === 2 || room === 9)) groupIndex = 0;
                    else if (g.grade === 'ม.2' && (room === 1 || room === 2 || room === 9)) groupIndex = 1;
                    else if (g.grade === 'ม.3' && (room === 1 || room === 2 || room === 8)) groupIndex = 2;
                    else if (g.grade === 'ม.4' && (room === 1 || room === 6 || room === 7)) groupIndex = 3;
                    else if (g.grade === 'ม.5' && (room === 1 || room === 6)) groupIndex = 4;
                    else if (g.grade === 'ม.6' && (room === 1 || room === 6)) groupIndex = 5;
                    else groupIndex = 6;

                    students.push({
                        studentId: String(idCounter++),
                        name: `${prefix}${fn} ${ln}`,
                        grade: g.grade,
                        room: room,
                        no: i,
                        groupIndex: groupIndex
                    });
                }
            });
        });

        // 4. Real Rotation Schedule (20 weeks)
        const rotation_schedule = this.generateDefaultRotationSchedule(bases);

        // 5. Pre-seed logs (Weeks 4 and 5 active, Week 6 partially checked)
        const attendance_logs = [];
        const statuses = ['present', 'present', 'present', 'present', 'present', 'present', 'present', 'present', 'present', 'absent', 'leave', 'late'];
        
        for (let wk = 4; wk <= 5; wk++) {
            const wSchedule = rotation_schedule.filter(s => s.week === wk && !s.isSpecial && !s.isEmpty);
            wSchedule.forEach(sch => {
                const dateKey = sch.startDate;
                const schedStudents = students.filter(st => sch.attendingClasses.includes(`${st.grade}/${st.room}`));
                
                schedStudents.forEach(st => {
                    attendance_logs.push({
                        date: dateKey,
                        week: wk,
                        baseId: sch.baseId,
                        studentId: st.studentId,
                        status: statuses[Math.floor(Math.random() * statuses.length)],
                        checkedBy: (sch.teacherId || "").split(',')[0].trim() || "admin",
                        timestamp: `${dateKey}T09:15:00`
                    });
                });
            });
        }

        // Today is June 20, 2026 (Week 6). Let's pre-check Base 1 (ไฟเบอร์ ทรงพลัง) and Base 2 (อาณาจักรอักษร)
        const w6Schedule = rotation_schedule.filter(s => s.week === 6 && !s.isSpecial && !s.isEmpty);
        
        // Base 1 pre-checked
        const schB1 = w6Schedule.find(s => s.baseId === 'base1');
        if (schB1) {
            const stB1 = students.filter(st => schB1.attendingClasses.includes(`${st.grade}/${st.room}`));
            stB1.forEach(st => {
                attendance_logs.push({
                    date: '2026-06-20',
                    week: 6,
                    baseId: 'base1',
                    studentId: st.studentId,
                    status: 'present',
                    checkedBy: 'teacher1',
                    timestamp: '2026-06-20T09:02:15'
                });
            });
        }

        // Base 2 pre-checked
        const schB2 = w6Schedule.find(s => s.baseId === 'base2');
        if (schB2) {
            const stB2 = students.filter(st => schB2.attendingClasses.includes(`${st.grade}/${st.room}`));
            stB2.forEach((st, idx) => {
                let status = 'present';
                if (idx % 12 === 2) status = 'absent';
                else if (idx % 12 === 5) status = 'late';
                else if (idx % 12 === 8) status = 'leave';
                attendance_logs.push({
                    date: '2026-06-20',
                    week: 6,
                    baseId: 'base2',
                    studentId: st.studentId,
                    status: status,
                    checkedBy: 'teacher2',
                    timestamp: '2026-06-20T08:55:00'
                });
            });
        }

        // Save DB
        this.db = { students, teachers, bases, rotation_schedule, attendance_logs };
        this.saveDatabase();

        // Show UI Notification
        const notification = document.getElementById('demo-notification');
        if (notification) {
            notification.style.display = 'flex';
        }

        if (showConfirm) {
            this.showStatusModal('success', 'รีเซ็ตระบบสำเร็จ', 'ระบบได้กลับเข้าสู่สภาวะเริ่มต้นการสาธิตเรียบร้อยแล้ว');
            this.render();
        }
    }

    // Reset to empty database for actual production use
    resetToEmptyData(showConfirm = true) {
        if (showConfirm && !confirm("คุณต้องการล้างข้อมูลนักเรียน ตารางสอน และประวัติเช็กชื่อทั้งหมดเพื่อเริ่มต้นใช้งานจริงใช่หรือไม่? (ข้อมูลบัญชีแอดมินและผู้บริหารจะยังคงอยู่)")) {
            return;
        }

        // Keep only system accounts (Admin and Directors)
        const systemTeachers = [
            { username: "deputy1", name: "นายปุรเชษฐ์ มธุรส", role: "director", password: "081-7646763", phone: "081-7646763" },
            { username: "deputy2", name: "นางสาวกษมา อุดทาเรือน", role: "director", password: "094-4976328", phone: "094-4976328" },
            { username: "deputy3", name: "นางสาวหัสดาภรณ์ พรหมคำติ๊บ", role: "director", password: "091-8521021", phone: "091-8521021" },
            { username: "admin", name: "นางสาวเจนประภา เรือนคำ", role: "admin" }
        ];

        // Default 7 bases with empty teacher assignment
        const bases = [
            { id: "base1", name: "ไฟเบอร์ ทรงพลัง", defaultRoom: "หอประชุมพุทธรักษา", defaultTeacher: "", teacherId: "" },
            { id: "base2", name: "อาณาจักรอักษร", defaultRoom: "ห้อง 2206", defaultTeacher: "", teacherId: "" },
            { id: "base3", name: "เงาในน้ำ", defaultRoom: "ห้อง 1208", defaultTeacher: "", teacherId: "" },
            { id: "base4", name: "ไก่ไข่อารมณ์ดี", defaultRoom: "ห้อง 2101", defaultTeacher: "", teacherId: "" },
            { id: "base5", name: "หรรษาสุธารสเห็ด", defaultRoom: "ห้อง 1103", defaultTeacher: "", teacherId: "" },
            { id: "base6", name: "ต้นกล้าประชาธิปไตย", defaultRoom: "ห้อง 2301", defaultTeacher: "", teacherId: "" },
            { id: "base7", name: "หลู่ล่างกานเครือ เกื้อบุญ", defaultRoom: "หอประชุมศุภเมธี", defaultTeacher: "", teacherId: "" }
        ];

        this.db.students = [];
        this.db.teachers = systemTeachers;
        this.db.bases = bases;
        this.db.rotation_schedule = this.generateDefaultRotationSchedule();
        this.db.attendance_logs = [];

        this.saveDatabase();

        // Clear active session to force login again
        this.currentUser = null;
        sessionStorage.removeItem('school_current_user');
        this.updateUserUI();

        this.showStatusModal('success', 'ล้างข้อมูลระบบสำเร็จ', 'ระบบอยู่ในสภาวะว่างสำหรับการกรอกข้อมูลจริงเรียบร้อยแล้ว<br><small style="color:var(--text-secondary);">กรุณาเข้าสู่ระบบด้วยบัญชีแอดมินเพื่อนำเข้าข้อมูลนักเรียนและตารางสอน</small>');
        this.switchView('dashboard');
        
        // Hide demo notification banner if visible
        const notification = document.getElementById('demo-notification');
        if (notification) {
            notification.style.display = 'none';
        }
    }

    // Bind UI actions and navigation
    bindEvents() {
        // Top Nav Bar View Router
        const menuItems = document.querySelectorAll('.nav-menu .nav-item');
        menuItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const view = item.getAttribute('data-view');
                this.switchView(view);
            });
        });

        // Date Simulator Changer
        document.getElementById('system-date-input').addEventListener('change', (e) => {
            this.systemDate = e.target.value;
            this.render();
        });

        // Login Actions
        document.getElementById('auth-action-btn').addEventListener('click', () => {
            if (this.currentUser) {
                this.logout();
            } else {
                this.openModal('login-modal');
            }
        });

        document.getElementById('btn-login-submit').addEventListener('click', () => {
            this.login();
        });

        // Checkin Controls
        document.getElementById('btn-check-all-present').addEventListener('click', () => {
            this.checkAllPresent();
        });

        document.getElementById('btn-reset-checkin').addEventListener('click', () => {
            this.resetCurrentCheckin();
        });

        document.getElementById('btn-save-attendance').addEventListener('click', () => {
            this.saveCurrentAttendance();
        });

        // Checkin Search input
        document.getElementById('checkin-student-search').addEventListener('input', (e) => {
            this.filterCheckinList(e.target.value);
        });

        // CRUD Student pagination
        document.getElementById('btn-student-prev').addEventListener('click', () => {
            if (this.studentPage > 1) {
                this.studentPage--;
                this.renderManageStudents();
            }
        });
        document.getElementById('btn-student-next').addEventListener('click', () => {
            const totalStudents = this.getFilteredStudents().length;
            if (this.studentPage * this.pageSize < totalStudents) {
                this.studentPage++;
                this.renderManageStudents();
            }
        });
        document.getElementById('manage-student-search').addEventListener('input', () => {
            this.studentPage = 1;
            this.renderManageStudents();
        });

        // Schedule Week Filter
        document.getElementById('manage-schedule-week-filter').addEventListener('change', () => {
            this.renderManageSchedule();
        });

        // Report Selectors
        document.getElementById('report-type-select').addEventListener('change', (e) => {
            this.toggleReportFilters(e.target.value);
            this.generateReport();
        });
        document.getElementById('report-week-select').addEventListener('change', () => this.generateReport());
        document.getElementById('report-base-select').addEventListener('change', () => this.generateReport());
        document.getElementById('report-class-select').addEventListener('change', () => this.generateReport());

        // Report Exports
        document.getElementById('btn-export-pdf').addEventListener('click', () => {
            window.print();
        });
        document.getElementById('btn-export-excel').addEventListener('click', () => {
            this.exportReportToExcel();
        });

        // Rotation Toggles
        document.getElementById('btn-rotation-mode-simple').addEventListener('click', () => {
            this.rotationViewMode = 'simple';
            document.getElementById('btn-rotation-mode-simple').className = 'btn btn-primary btn-sm';
            document.getElementById('btn-rotation-mode-detail').className = 'btn btn-outline btn-sm';
            this.renderRotation();
        });

        document.getElementById('btn-rotation-mode-detail').addEventListener('click', () => {
            this.rotationViewMode = 'detail';
            document.getElementById('btn-rotation-mode-simple').className = 'btn btn-outline btn-sm';
            document.getElementById('btn-rotation-mode-detail').className = 'btn btn-primary btn-sm';
            this.renderRotation();
        });

        // Rotation Print & Excel Export
        document.getElementById('btn-print-rotation').addEventListener('click', () => {
            window.print();
        });

        document.getElementById('btn-export-rotation-excel').addEventListener('click', () => {
            this.exportRotationToExcel();
        });

        // Hamburger Menu Toggle
        const hamburgerBtn = document.getElementById('hamburger-toggle-btn');
        if (hamburgerBtn) {
            hamburgerBtn.addEventListener('click', () => {
                const navBar = document.querySelector('.top-nav-bar');
                if (navBar) navBar.classList.toggle('menu-open');
            });
        }
    }

    // Change views (SPA router)
    switchView(viewId) {
        this.currentView = viewId;

        // Close hamburger menu on view switch
        const navBar = document.querySelector('.top-nav-bar');
        if (navBar) navBar.classList.remove('menu-open');
        
        // Update active class on Top Bar menu items
        const menuItems = document.querySelectorAll('.nav-menu .nav-item');
        menuItems.forEach(item => {
            if (item.getAttribute('data-view') === viewId) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        // Update top title if element exists
        const viewTitleEl = document.getElementById('current-view-title');
        if (viewTitleEl) {
            const titles = {
                dashboard: 'แผงควบคุม (Dashboard)',
                rotation: 'ตารางการหมุนฐาน (Rotation Calendar)',
                checkin: 'เช็กชื่อนักเรียนประจำฐาน',
                admin: 'ผู้บริหารโรงเรียน (Director Overview)',
                reports: 'รายงานและการส่งออกข้อมูล',
                manage: 'ระบบจัดการข้อมูล (Admin Console)'
            };
            viewTitleEl.textContent = titles[viewId] || 'ระบบเช็กชื่อ';
        }

        // Toggle container classes
        const viewContainers = document.querySelectorAll('.view-container');
        viewContainers.forEach(container => {
            if (container.id === `view-${viewId}`) {
                container.classList.add('active');
            } else {
                container.classList.remove('active');
            }
        });

        this.render();
    }

    // Modal Control
    openModal(modalId) {
        document.getElementById(modalId).classList.add('active');
        
        // Specific modal preparations
        if (modalId === 'login-modal') {
            const pwdInput = document.getElementById('login-password');
            if (pwdInput) pwdInput.value = '';
            const select = document.getElementById('login-user-select');
            if (select) {
                const teachersList = this.db.teachers.filter(t => t.role === 'teacher');
                const directorsList = this.db.teachers.filter(t => t.role === 'director');
                const adminsList = this.db.teachers.filter(t => t.role === 'admin');
                
                let html = '<option value="" disabled selected>-- เลือกสิทธิ์การใช้งาน --</option>';
                
                html += '<optgroup label="ครูประจำฐานการเรียนรู้">';
                teachersList.forEach(t => {
                      const bases = this.db.bases.filter(b => {
                          const ids = (b.teacherId || "").split(',').map(x => x.trim());
                          return ids.includes(t.username);
                      });
                      const baseName = bases.length > 0 ? ` (ฐาน ${bases.map(b => b.name).join(', ')})` : '';
                      html += `<option value="${t.username}">${t.name}${baseName}</option>`;
                  });
                html += '</optgroup>';
                
                html += '<optgroup label="ผู้ดูแลระบบ (Admin)">';
                adminsList.forEach(t => {
                    html += `<option value="${t.username}">${t.name} (แอดมิน)</option>`;
                });
                html += '</optgroup>';
                
                html += '<optgroup label="ผู้บริหารโรงเรียน (Executive)">';
                directorsList.forEach(t => {
                    let roleTitle = 'ผู้บริหาร';
                    if (t.username === 'deputy1') roleTitle = 'รองผู้อำนวยการ 1';
                    else if (t.username === 'deputy2') roleTitle = 'รองผู้อำนวยการ 2';
                    else if (t.username === 'deputy3') roleTitle = 'รองผู้อำนวยการ 3';
                    else if (t.username === 'director') roleTitle = 'ผู้อำนวยการ';
                    html += `<option value="${t.username}">${t.name} (${roleTitle})</option>`;
                });
                html += '</optgroup>';
                
                select.innerHTML = html;
            }
        }
        if (modalId === 'base-modal') {
            // Populate teacher select dropdown in form
            const container = document.getElementById('base-form-teachers-container');
              if (container) {
                  container.innerHTML = this.db.teachers
                      .filter(t => t.role === 'teacher' || t.role === 'admin')
                      .map(t => `
                          <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-weight: normal; margin: 0; padding: 4px 0;">
                              <input type="checkbox" name="base-teachers" value="${t.username}">
                              <span>${t.name}</span>
                          </label>
                      `)
                      .join('');
              }
        }
        if (modalId === 'schedule-modal') {
            // Populate bases dropdown
            const baseSelect = document.getElementById('schedule-form-base');
            baseSelect.innerHTML = this.db.bases.map(b => `<option value="${b.id}">${b.name}</option>`).join('');
            
            // Populate teachers dropdown
            const teacherSelect = document.getElementById('schedule-form-teacher');
            teacherSelect.innerHTML = this.db.teachers.map(t => `<option value="${t.name}">${t.name}</option>`).join('');
        }
    }

    closeModal(modalId) {
        document.getElementById(modalId).classList.remove('active');
    }

    // Load auth session
    loadSession() {
        const savedUser = sessionStorage.getItem('school_current_user');
        if (savedUser) {
            this.currentUser = JSON.parse(savedUser);
            
            // Sync session user state with updated database values
            const dbUser = this.db.teachers.find(t => t.username === this.currentUser.username);
            if (dbUser && (dbUser.name !== this.currentUser.name || dbUser.role !== this.currentUser.role)) {
                this.currentUser = dbUser;
                sessionStorage.setItem('school_current_user', JSON.stringify(dbUser));
            }
            
            this.updateUserUI();
        } else {
            // Auto show login modal if not logged in to guide users
            setTimeout(() => {
                this.openModal('login-modal');
            }, 800);
        }
    }

    // Login logic
    login() {
        const userSelect = document.getElementById('login-user-select');
        const selectedId = userSelect.value;
        if (!selectedId) {
            alert("กรุณาเลือกชื่อผู้ใช้งาน/คุณครู!");
            return;
        }

        const userObj = this.db.teachers.find(t => t.username === selectedId);

        if (userObj) {
            const passwordInput = document.getElementById('login-password').value;
            const expectedPassword = userObj.role === 'admin' ? '20June2026' : (userObj.password || userObj.username);
            
            if (passwordInput !== expectedPassword) {
                this.showStatusModal('error', 'เข้าสู่ระบบไม่สำเร็จ', 'รหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง!');
                return;
            }

            this.currentUser = userObj;
            sessionStorage.setItem('school_current_user', JSON.stringify(userObj));
            this.updateUserUI();
            this.closeModal('login-modal');
            
            // Auto redirect depending on role
            if (userObj.role === 'admin') {
                this.switchView('manage'); // Admin goes straight to Database Settings
            } else if (userObj.role === 'director') {
                this.switchView('admin'); // Directors go straight to Executive Overview
            } else {
                this.switchView('checkin'); // Teachers go straight to Attendance Sheet
            }
        }
    }

    // Logout logic
    logout() {
        this.currentUser = null;
        sessionStorage.removeItem('school_current_user');
        this.updateUserUI();
        this.switchView('dashboard');
    }

    // Update UI headers / profile sidebar
    updateUserUI() {
        const nameLabel = document.getElementById('profile-name');
        const roleLabel = document.getElementById('profile-role');
        const avatarLabel = document.getElementById('profile-avatar');
        const authBtnText = document.getElementById('auth-btn-text');
        const authIcon = document.querySelector('#auth-action-btn i');
        
        // Menu item permissions references
        const menuCheckin = document.getElementById('menu-checkin');
        const menuAdmin = document.getElementById('menu-admin');
        const menuManage = document.getElementById('menu-manage');

        if (this.currentUser) {
            nameLabel.textContent = this.currentUser.name;
            
            // Extract a cleaner avatar character
            let avatarChar = this.currentUser.name.charAt(0);
            if (this.currentUser.name.startsWith('ครู')) {
                avatarChar = this.currentUser.name.substring(3).charAt(0);
            } else if (this.currentUser.name.startsWith('นาย')) {
                avatarChar = this.currentUser.name.substring(3).charAt(0);
            } else if (this.currentUser.name.startsWith('นางสาว')) {
                avatarChar = this.currentUser.name.substring(6).charAt(0);
            }
            avatarLabel.textContent = avatarChar;

            authBtnText.textContent = "ออกจากระบบ";
            authIcon.className = "fa-solid fa-right-from-bracket";
            
            if (this.currentUser.role === 'admin') {
                roleLabel.textContent = "ผู้ดูแลระบบ (Admin)";
                menuCheckin.style.display = 'none';
                menuAdmin.style.display = 'block';
                menuManage.style.display = 'block';
            } else if (this.currentUser.role === 'director') {
                roleLabel.textContent = "ผู้บริหารโรงเรียน";
                menuCheckin.style.display = 'none';
                menuAdmin.style.display = 'block';
                menuManage.style.display = 'none'; // Hidden for directors
            } else {
                roleLabel.textContent = "ครูประจำฐานการเรียนรู้";
                menuCheckin.style.display = 'block';
                menuAdmin.style.display = 'none';
                menuManage.style.display = 'none';
            }
        } else {
            nameLabel.textContent = "ไม่ได้เข้าสู่ระบบ";
            roleLabel.textContent = "กรุณาเข้าสู่ระบบ";
            avatarLabel.textContent = "?";
            authBtnText.textContent = "เข้าสู่ระบบ";
            authIcon.className = "fa-solid fa-right-to-bracket";
            
            // Guest mode
            menuCheckin.style.display = 'none';
            menuAdmin.style.display = 'none';
            menuManage.style.display = 'none';
        }

        const changePwdBtn = document.getElementById('btn-change-password');
        if (this.currentUser && this.currentUser.role !== 'admin') {
            if (changePwdBtn) changePwdBtn.style.display = 'flex';
        } else {
            if (changePwdBtn) changePwdBtn.style.display = 'none';
        }
    }

    openChangePasswordModal() {
        document.getElementById('change-pwd-current').value = '';
        document.getElementById('change-pwd-new').value = '';
        document.getElementById('change-pwd-confirm').value = '';
        this.openModal('change-password-modal');
    }

    changePasswordSubmit() {
        const current = document.getElementById('change-pwd-current').value;
        const newPwd = document.getElementById('change-pwd-new').value;
        const confirmPwd = document.getElementById('change-pwd-confirm').value;

        if (!current || !newPwd || !confirmPwd) {
            this.showStatusModal('error', 'กรอกข้อมูลไม่ครบ', 'กรุณากรอกรหัสผ่านให้ครบทุกช่อง!');
            return;
        }

        const expectedCurrent = this.currentUser.password || this.currentUser.username;
        if (current !== expectedCurrent) {
            this.showStatusModal('error', 'ข้อผิดพลาด', 'รหัสผ่านปัจจุบันไม่ถูกต้อง!');
            return;
        }

        if (newPwd !== confirmPwd) {
            this.showStatusModal('error', 'ข้อผิดพลาด', 'รหัสผ่านใหม่และรหัสผ่านยืนยันไม่ตรงกัน!');
            return;
        }

        if (newPwd.length < 4) {
            this.showStatusModal('error', 'ข้อผิดพลาด', 'รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 4 ตัวอักษร!');
            return;
        }

        const t = this.db.teachers.find(x => x.username === this.currentUser.username);
        if (t) {
            t.password = newPwd;
            this.currentUser.password = newPwd;
            sessionStorage.setItem('school_current_user', JSON.stringify(this.currentUser));
            this.saveDatabase();
            this.closeModal('change-password-modal');
            this.showStatusModal('success', 'เปลี่ยนรหัสผ่านสำเร็จ', 'เปลี่ยนรหัสผ่านผู้ใช้งานเรียบร้อยแล้ว!');
        }
    }

    // Main Renderer
    render() {
        // Find current week number based on systemDate simulator
        this.currentWeekInfo = this.getWeekByDate(this.systemDate);

        // Update week texts in Views
        const weekNum = this.currentWeekInfo ? this.currentWeekInfo.week : '-';
        const weekDates = this.currentWeekInfo ? this.currentWeekInfo.dates : 'อยู่นอกช่วงภาคเรียน';
        
        const weekNumEl = document.getElementById('dash-week-num');
        if (weekNumEl) {
            weekNumEl.textContent = `Week ${weekNum}`;
        }

        // Update header badges
        const badgeWeekEl = document.getElementById('header-badge-week');
        if (badgeWeekEl) {
            badgeWeekEl.textContent = `Week ${weekNum}`;
        }
        const badgeDateEl = document.getElementById('header-badge-date');
        if (badgeDateEl) {
            badgeDateEl.textContent = this.formatThaiDateShort(this.systemDate);
        }
        
        if (this.currentView === 'dashboard') {
            this.renderDashboard();
        } else if (this.currentView === 'rotation') {
            this.renderRotation();
        } else if (this.currentView === 'checkin') {
            this.renderCheckin();
        } else if (this.currentView === 'admin') {
            this.renderAdmin();
        } else if (this.currentView === 'reports') {
            this.renderReports();
        } else if (this.currentView === 'manage') {
            this.renderManage();
        }
    }

    // Helper: format date to Thai style (e.g. 20 มิ.ย. 69)
    formatThaiDateShort(dateStr) {
        if (!dateStr) return '';
        const parts = dateStr.split('-');
        if (parts.length !== 3) return dateStr;
        const year = parseInt(parts[0]);
        const month = parseInt(parts[1]);
        const day = parseInt(parts[2]);
        
        const thaiMonths = [
            'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
            'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
        ];
        
        const thaiYearShort = (year + 543) % 100;
        const thaiMonthStr = thaiMonths[month - 1] || '';
        
        return `${day} ${thaiMonthStr} ${thaiYearShort}`;
    }

    // Helper: find week object from date YYYY-MM-DD
    getWeekByDate(dateStr) {
        const date = new Date(dateStr);
        const match = this.db.rotation_schedule.find(s => {
            const start = new Date(s.startDate);
            const end = new Date(s.endDate);
            return date >= start && date <= end;
        });

        if (match) {
            return { week: match.week, dates: match.dates };
        }
        
        // Fallback or default to Week 6 if not matching
        return { week: 6, dates: "15 มิ.ย. - 21 มิ.ย. 69" };
    }

    // RENDER: Dashboard view
    renderDashboard() {
        const week = this.currentWeekInfo.week;
        const todayDate = this.systemDate;

        // Get schedule rows for current week
        const todaySchedule = this.db.rotation_schedule.filter(s => s.week === week);
        
        // Calculate counts
        let checkedCount = 0;
        let totalStudentsCount = 0;
        let activeBasesCount = 0;
        
        const baseStatuses = [];

        // Check each of the 7 bases
        todaySchedule.forEach(sch => {
            let groupStudents = [];
            if (!sch.isSpecial && !sch.isEmpty) {
                groupStudents = this.db.students.filter(st => sch.attendingClasses && sch.attendingClasses.includes(`${st.grade}/${st.room}`));
                totalStudentsCount += groupStudents.length;
                activeBasesCount++;
            }

            // Check if checked in today
            const baseLogs = this.db.attendance_logs.filter(
                log => log.date === todayDate && log.baseId === sch.baseId
            );
            
            const isChecked = baseLogs.length > 0;
            if (isChecked && !sch.isSpecial && !sch.isEmpty) checkedCount++;

            baseStatuses.push({
                schedule: sch,
                checked: isChecked,
                studentCount: groupStudents.length,
                logs: baseLogs
            });
        });

        // Update stats card UI
        const totalStudEl = document.getElementById('dash-total-students');
        if (totalStudEl) totalStudEl.textContent = `${this.db.students.length}`;

        const totalTeachEl = document.getElementById('dash-total-teachers');
        if (totalTeachEl) totalTeachEl.textContent = `${this.db.teachers.filter(t => t.role === 'teacher').length}`;

        const totalBasesEl = document.getElementById('dash-total-bases');
        if (totalBasesEl) totalBasesEl.textContent = `${this.db.bases.length}`;

        const weekTextEl = document.getElementById('dash-banner-week-text');
        if (weekTextEl) {
            weekTextEl.textContent = `สัปดาห์เรียนที่ ${week} | ${this.currentWeekInfo.dates}`;
        }

        // Render bases table
        const tbody = document.getElementById('dash-bases-table-body');
        tbody.innerHTML = '';

        baseStatuses.forEach(item => {
            const sch = item.schedule;
            let statusBadge = '';
            
            if (sch.isSpecial) {
                statusBadge = `<span class="status-badge activity"><i class="fa-solid fa-star"></i> ${sch.classes}</span>`;
            } else if (sch.isEmpty) {
                statusBadge = `<span class="status-badge pending"><i class="fa-solid fa-ban"></i> ว่าง (ไม่มีเรียน)</span>`;
            } else {
                statusBadge = item.checked 
                    ? '<span class="status-badge present"><i class="fa-solid fa-check"></i> เช็กแล้ว</span>'
                    : '<span class="status-badge pending"><i class="fa-solid fa-clock"></i> ยังไม่ได้เช็ก</span>';
            }

            const baseObj = this.db.bases.find(b => b.id === sch.baseId);
            const displayTeacherName = baseObj ? baseObj.defaultTeacher : sch.teacherName;

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="font-weight: 700; color: var(--primary-dark);">${sch.baseName}</td>
                <td><span class="status-badge info">${sch.isSpecial ? 'ทุกระดับชั้น' : sch.classes}</span></td>
                <td><i class="fa-solid fa-location-dot text-light"></i> ${sch.room}</td>
                <td><i class="fa-solid fa-chalkboard-user text-light"></i> ${displayTeacherName}</td>
                <td>${statusBadge}</td>
            `;
            tbody.appendChild(tr);
        });

        // Chart calculations
        // Get all logs of today
        const todayLogs = this.db.attendance_logs.filter(log => log.date === todayDate);
        let present = 0, absent = 0, leave = 0, late = 0, activity = 0;

        todayLogs.forEach(log => {
            if (log.status === 'present') present++;
            else if (log.status === 'absent') absent++;
            else if (log.status === 'leave') leave++;
            else if (log.status === 'late') late++;
            else if (log.status === 'activity') activity++;
        });

        const totalChecked = present + absent + leave + late + activity;
        const presentRate = totalChecked > 0 ? Math.round((present / totalChecked) * 100) : 0;
        const presentRateEl = document.getElementById('dash-present-rate');
        if (presentRateEl) presentRateEl.textContent = `${presentRate}%`;

        // Initialize or Update Chart.js Doughnut
        if (this.dashChart) this.dashChart.destroy();
        
        const ctx = document.getElementById('dashboard-attendance-chart').getContext('2d');
        
        if (totalChecked === 0) {
            // Draw placeholder if no logs checked yet
            this.dashChart = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: ['ยังไม่มีข้อมูลเช็กชื่อ'],
                    datasets: [{
                        data: [1],
                        backgroundColor: ['#E5E7EB']
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: 'bottom' } }
                }
            });
        } else {
            this.dashChart = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: ['มาเรียน', 'ขาดเรียน', 'ลา', 'สาย', 'กิจกรรม'],
                    datasets: [{
                        data: [present, absent, leave, late, activity],
                        backgroundColor: ['#6F8F3D', '#B22222', '#EAB308', '#8C6A2B', '#A89B8D'],
                        borderWidth: 2,
                        borderColor: '#ffffff'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                font: { family: 'Sarabun', size: 12 }
                            }
                        }
                    },
                    cutout: '65%'
                }
            });
        }
    }

    // RENDER: Check-in page
    renderCheckin() {
        const checkinView = document.getElementById('view-checkin');
        
        // Hide class selector by default
        const selectorCard = document.getElementById('checkin-class-selector-card');
        const buttonsContainer = document.getElementById('checkin-class-buttons-container');
        if (selectorCard) selectorCard.style.display = 'none';

        // Permissions Guard: Must be teacher
        if (!this.currentUser || this.currentUser.role !== 'teacher') {
            checkinView.innerHTML = `
                <div class="alert-banner" style="background-color: var(--danger-bg); border-color: var(--danger); color: var(--danger); margin: 0 0 24px 0;">
                    <i class="fa-solid fa-triangle-exclamation"></i>
                    <div>
                        <strong>ปฏิเสธการเข้าถึง!</strong> เฉพาะคุณครูผู้สอนประจำฐานการเรียนรู้เท่านั้นที่สามารถเข้าใช้งานหน้าเช็กชื่อนี้ได้ กรุณาเข้าสู่ระบบด้วยบัญชีของคุณครู
                    </div>
                </div>
                <div style="text-align: center; padding: 48px 0;">
                    <button class="btn btn-primary" onclick="app.openModal('login-modal')">
                        <i class="fa-solid fa-right-to-bracket"></i> เลือกบัญชีคุณครูเพื่อเข้าใช้หน้าเช็กชื่อ
                    </button>
                </div>
            `;
            return;
        }

        // Restore original page template if it was overwritten by guard
        if (!document.getElementById('checkin-base-title')) {
            // Simple refresh page element
            location.reload();
            return;
        }

        const week = this.currentWeekInfo.week;
        const todayDate = this.systemDate;

        // Find schedule for this teacher today
        const scheduleRow = this.db.rotation_schedule.find(
            s => {
                if (s.week !== week) return false;
                const ids = (s.teacherId || "").split(',').map(x => x.trim());
                return ids.includes(this.currentUser.username);
            }
        );

        if (!scheduleRow) {
            document.getElementById('checkin-base-title').textContent = "สัปดาห์นี้ท่านไม่มีการสอนประจำฐาน";
            document.getElementById('checkin-base-info').innerHTML = "<i class='fa-solid fa-ban'></i> ไม่มีข้อมูลการจัดหมุนฐานในระบบสัปดาห์นี้";
            document.getElementById('checkin-classes-label').textContent = "-";
            document.getElementById('checkin-target-classes').textContent = "-";
            document.getElementById('student-attendance-list-container').innerHTML = `
                <div style="text-align: center; padding: 48px; color: var(--text-light);">
                    <i class="fa-solid fa-calendar-xmark" style="font-size: 48px; margin-bottom: 12px;"></i>
                    <p>ไม่พบตารางการหมุนฐานที่จับคู่กับครูผู้สอนท่านนี้ในสัปดาห์ปัจจุบัน</p>
                </div>
            `;
            return;
        }

        // Handle Special Weeks (prep, midterm, final, holiday)
        if (scheduleRow.isSpecial) {
            document.getElementById('checkin-week-label').innerHTML = `สัปดาห์เรียนที่ ${week} (${this.formatThaiDate(todayDate)})`;
            document.getElementById('checkin-base-title').textContent = scheduleRow.classes;
            document.getElementById('checkin-base-info').innerHTML = `<i class="fa-solid fa-circle-info"></i> ${scheduleRow.classes}`;
            document.getElementById('checkin-classes-label').textContent = "-";
            document.getElementById('checkin-target-classes').textContent = "-";
            document.getElementById('student-attendance-list-container').innerHTML = `
                <div style="text-align: center; padding: 64px; color: var(--text-light);">
                    <i class="fa-solid fa-mug-hot" style="font-size: 56px; margin-bottom: 16px; color: var(--primary);"></i>
                    <h4 style="font-weight: 700; color: var(--text-primary); margin-bottom: 8px;">สัปดาห์กิจกรรมพิเศษ/การวัดผล</h4>
                    <p>${scheduleRow.classes} - ไม่มีการจัดการเรียนการสอนและการเช็กชื่อตามฐานประจำสัปดาห์นี้</p>
                </div>
            `;
            return;
        }

        // Handle Empty Weeks
        if (scheduleRow.isEmpty) {
            document.getElementById('checkin-week-label').innerHTML = `สัปดาห์เรียนที่ ${week} (${this.formatThaiDate(todayDate)})`;
            document.getElementById('checkin-base-title').textContent = "ไม่มีการจัดเรียนการสอน";
            document.getElementById('checkin-base-info').innerHTML = `<i class="fa-solid fa-ban"></i> สัปดาห์นี้ฐาน ${scheduleRow.baseName} ว่าง`;
            document.getElementById('checkin-classes-label').textContent = "-";
            document.getElementById('checkin-target-classes').textContent = "-";
            document.getElementById('student-attendance-list-container').innerHTML = `
                <div style="text-align: center; padding: 64px; color: var(--text-light);">
                    <i class="fa-solid fa-ban" style="font-size: 56px; margin-bottom: 16px;"></i>
                    <h4 style="font-weight: 700; color: var(--text-primary); margin-bottom: 8px;">ไม่มีระดับชั้นจัดเรียนประจำฐานนี้</h4>
                    <p>สัปดาห์นี้ฐาน ${scheduleRow.baseName} ไม่มีนักเรียนหมุนเวียนเข้ามาจัดเรียนตามปฏิทิน</p>
                </div>
            `;
            return;
        }

        // Display Base Header info
        document.getElementById('checkin-week-label').innerHTML = `สัปดาห์เรียนที่ ${week} (${this.formatThaiDate(todayDate)})`;
        document.getElementById('checkin-base-title').textContent = `ฐาน: ${scheduleRow.baseName}`;
        document.getElementById('checkin-base-info').innerHTML = `<i class="fa-solid fa-user"></i> ครูผู้สอน: ${scheduleRow.teacherName} | <i class="fa-solid fa-location-dot"></i> สถานที่สอน: ${scheduleRow.room}`;
        document.getElementById('checkin-classes-label').textContent = scheduleRow.classes;

        this.currentCheckinSchedule = scheduleRow;

        // Load all students under this rotation group
        this.allRotationStudents = this.db.students.filter(
            st => scheduleRow.attendingClasses && scheduleRow.attendingClasses.includes(`${st.grade}/${st.room}`)
        );

        // Sorting all students by Class room and then by Number
        this.allRotationStudents.sort((a, b) => {
            if (a.grade !== b.grade) return a.grade.localeCompare(b.grade);
            if (a.room !== b.room) return a.room - b.room;
            return a.no - b.no;
        });

        // Initialize local state of attendance status once for all base students
        this.attendanceState = {};
        const existingLogs = this.db.attendance_logs.filter(
            log => log.date === todayDate && log.baseId === scheduleRow.baseId
        );
        this.allRotationStudents.forEach(st => {
            const log = existingLogs.find(l => l.studentId === st.studentId);
            this.attendanceState[st.studentId] = log ? log.status : ''; // Empty if not checked
        });

        // Show class selector container and render buttons
        if (selectorCard && buttonsContainer) {
            selectorCard.style.display = 'block';
            buttonsContainer.innerHTML = '';

            if (scheduleRow.attendingClasses && scheduleRow.attendingClasses.length > 0) {
                scheduleRow.attendingClasses.forEach(clsName => {
                    const roomName = (scheduleRow.classRooms && scheduleRow.classRooms[clsName]) 
                        ? scheduleRow.classRooms[clsName] 
                        : scheduleRow.room;

                    const btn = document.createElement('button');
                    btn.className = 'btn btn-outline btn-lg';
                    btn.style.padding = '12px 20px';
                    btn.style.fontWeight = '700';
                    btn.innerHTML = `<i class="fa-solid fa-school text-primary"></i> ${clsName} <span style="font-size:13px; font-weight:normal; opacity:0.85; margin-left:4px;">(${roomName})</span>`;
                    
                    btn.onclick = () => {
                        this.selectCheckinClass(clsName, btn);
                    };
                    buttonsContainer.appendChild(btn);
                });
            }
        }

        // Set selected class to null initially (forces user to choose first)
        this.selectedCheckinClass = null;
        this.currentCheckinStudents = [];
        
        // Show placeholder message asking to choose class
        document.getElementById('checkin-target-classes').textContent = "กรุณาเลือกห้องเรียน";
        document.getElementById('student-attendance-list-container').innerHTML = `
            <div style="text-align: center; padding: 64px 24px; color: var(--text-light);">
                <i class="fa-solid fa-hand-point-up" style="font-size: 56px; margin-bottom: 16px; color: var(--primary);"></i>
                <h3 style="font-weight: 700; color: var(--text-primary); margin-bottom: 8px;">กรุณาเลือกชั้นเรียนที่จะทำการสอน</h3>
                <p style="font-size: 15px; max-width: 500px; margin: 0 auto;">กรุณาคลิกเลือกห้องเรียน/สถานที่ที่คุณครูจะเข้าสอนด้านบน เพื่อแสดงรายชื่อนักเรียนและเริ่มต้นเช็กชื่อเข้าเรียน</p>
            </div>
        `;
        
        // Disable search input and filter buttons initially
        document.getElementById('checkin-student-search').disabled = true;
        document.getElementById('btn-check-all-present').disabled = true;
        document.getElementById('btn-reset-checkin').disabled = true;
        document.getElementById('btn-save-attendance').disabled = true;

        this.updateCheckinCounters();
    }

    // Build the attendance table rows
    renderCheckinStudentList(searchQuery = '') {
        const container = document.getElementById('student-attendance-list-container');
        container.innerHTML = '';

        const query = searchQuery.trim().toLowerCase();
        const filtered = this.currentCheckinStudents.filter(st => {
            return st.name.toLowerCase().includes(query) || st.studentId.includes(query);
        });

        if (filtered.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 48px; color: var(--text-light);">
                    <i class="fa-solid fa-users-slash" style="font-size: 32px; margin-bottom: 8px;"></i>
                    <p>ไม่พบรายชื่อนักเรียนตามคำค้นหา</p>
                </div>
            `;
            this.updateCheckinCounters();
            return;
        }

        filtered.forEach(st => {
            const currentStatus = this.attendanceState[st.studentId];
            const classKey = `${st.grade}/${st.room}`;
            
            // Resolve student-specific room location mapping
            const roomLabel = (this.currentCheckinSchedule && this.currentCheckinSchedule.classRooms && this.currentCheckinSchedule.classRooms[classKey])
                ? `${classKey} (${this.currentCheckinSchedule.classRooms[classKey]})`
                : classKey;

            const card = document.createElement('div');
            card.className = 'student-row-card';
            card.innerHTML = `
                <div class="student-no">เลขที่ ${st.no}</div>
                <div class="student-id">${st.studentId}</div>
                <div class="student-name">${st.name}</div>
                <div class="student-class">${roomLabel}</div>
                <div class="attendance-actions">
                    <button class="btn-status-option ${currentStatus === 'present' ? 'active-present' : ''}" onclick="app.setStudentStatus('${st.studentId}', 'present')">
                        <span>✅</span>มา
                    </button>
                    <button class="btn-status-option ${currentStatus === 'absent' ? 'active-absent' : ''}" onclick="app.setStudentStatus('${st.studentId}', 'absent')">
                        <span>❌</span>ขาด
                    </button>
                    <button class="btn-status-option ${currentStatus === 'leave' ? 'active-leave' : ''}" onclick="app.setStudentStatus('${st.studentId}', 'leave')">
                        <span>🟡</span>ลา
                    </button>
                    <button class="btn-status-option ${currentStatus === 'late' ? 'active-late' : ''}" onclick="app.setStudentStatus('${st.studentId}', 'late')">
                        <span>🟠</span>สาย
                    </button>
                    <button class="btn-status-option ${currentStatus === 'activity' ? 'active-activity' : ''}" onclick="app.setStudentStatus('${st.studentId}', 'activity')">
                        <span>🟣</span>กิจ
                    </button>
                </div>
            `;
            container.appendChild(card);
        });

        this.updateCheckinCounters();
    }

    // Toggle button state
    setStudentStatus(studentId, status) {
        this.attendanceState[studentId] = status;
        
        // Update checkin UI without full re-render to make it fast
        this.renderCheckinStudentList(document.getElementById('checkin-student-search').value);
    }

    // Check all present
    checkAllPresent() {
        this.currentCheckinStudents.forEach(st => {
            this.attendanceState[st.studentId] = 'present';
        });
        this.renderCheckinStudentList(document.getElementById('checkin-student-search').value);
    }

    // Reset checkin
    resetCurrentCheckin() {
        if (confirm("ล้างข้อมูลการเช็กชื่อในหน้าปัจจุบันทั้งหมด?")) {
            this.currentCheckinStudents.forEach(st => {
                this.attendanceState[st.studentId] = '';
            });
            this.renderCheckinStudentList(document.getElementById('checkin-student-search').value);
        }
    }

    // Update counters in check-in bar
    // Select specific class room to teach and check-in
    selectCheckinClass(clsName, clickedBtn) {
        this.selectedCheckinClass = clsName;
        
        // Update active class button styles
        const buttonsContainer = document.getElementById('checkin-class-buttons-container');
        if (buttonsContainer) {
            const buttons = buttonsContainer.querySelectorAll('button');
            buttons.forEach(btn => {
                btn.className = 'btn btn-outline btn-lg';
            });
        }
        if (clickedBtn) {
            clickedBtn.className = 'btn btn-primary btn-lg';
        }

        // Filter students for the selected class room
        const parts = clsName.split('/');
        const grade = parts[0];
        const room = parseInt(parts[1]);

        this.currentCheckinStudents = this.allRotationStudents.filter(
            st => st.grade === grade && st.room === room
        );

        // Update target classes labels
        const roomName = (this.currentCheckinSchedule.classRooms && this.currentCheckinSchedule.classRooms[clsName]) 
            ? this.currentCheckinSchedule.classRooms[clsName] 
            : this.currentCheckinSchedule.room;

        document.getElementById('checkin-target-classes').textContent = `${clsName} (${roomName})`;

        // Update teachers and location dynamically if Base 5
        let teachersStr = this.currentCheckinSchedule.teacherName;
        if (this.currentCheckinSchedule.baseId === 'base5') {
            const specificTeachers = this.getRoomTeachers(roomName);
            if (specificTeachers) {
                teachersStr = specificTeachers;
            }
        }
        document.getElementById('checkin-base-info').innerHTML = `<i class="fa-solid fa-user"></i> ครูผู้สอน: ${teachersStr} | <i class="fa-solid fa-location-dot"></i> สถานที่สอน: ${roomName}`;
        
        // Enable search input and filter buttons
        document.getElementById('checkin-student-search').disabled = false;
        document.getElementById('btn-check-all-present').disabled = false;
        document.getElementById('btn-reset-checkin').disabled = false;
        document.getElementById('btn-save-attendance').disabled = false;

        // Reset search input value
        document.getElementById('checkin-student-search').value = '';

        // Build list
        this.renderCheckinStudentList();
    }

    updateCheckinCounters() {
        let present = 0, absent = 0, leave = 0, late = 0, activity = 0;
        
        // Filter student ids of the current checkin class to count correctly
        const studentIds = this.currentCheckinStudents ? this.currentCheckinStudents.map(st => st.studentId) : [];

        Object.keys(this.attendanceState).forEach(id => {
            if (studentIds.includes(id)) {
                const status = this.attendanceState[id];
                if (status === 'present') present++;
                else if (status === 'absent') absent++;
                else if (status === 'leave') leave++;
                else if (status === 'late') late++;
                else if (status === 'activity') activity++;
            }
        });

        const total = this.currentCheckinStudents ? this.currentCheckinStudents.length : 0;
        const checked = present + absent + leave + late + activity;

        document.getElementById('checkin-counter-label').innerHTML = `
            เช็กแล้ว ${checked}/${total} คน | มา <strong>${present}</strong> / ขาด <strong style="color:var(--danger)">${absent}</strong> / ลา <strong style="color:#D97706">${leave}</strong> / สาย <strong>${late}</strong> / กิจกรรม <strong>${activity}</strong>
        `;
    }

    // Filter check-in list
    filterCheckinList(value) {
        this.renderCheckinStudentList(value);
    }

    // Save attendance to localStorage
    saveCurrentAttendance() {
        const week = this.currentWeekInfo.week;
        const todayDate = this.systemDate;

        // Find teacher's schedule to get baseId
        const scheduleRow = this.db.rotation_schedule.find(
            s => {
                if (s.week !== week) return false;
                const ids = (s.teacherId || "").split(',').map(x => x.trim());
                return ids.includes(this.currentUser.username);
            }
        );

        if (!scheduleRow) return;

        if (!this.selectedCheckinClass) {
            alert("กรุณาเลือกชั้นเรียนที่จะทำการสอนก่อนบันทึก!");
            return;
        }

        // Check if all students checked
        let uncheckedCount = 0;
        this.currentCheckinStudents.forEach(st => {
            if (!this.attendanceState[st.studentId]) uncheckedCount++;
        });

        if (uncheckedCount > 0) {
            if (!confirm(`ยังไม่ได้เช็กชื่อนักเรียนของห้อง ${this.selectedCheckinClass} อีก ${uncheckedCount} คน คุณแน่ใจว่าต้องการบันทึกการเช็กชื่อที่มีอยู่แล้วหรือไม่?`)) {
                return;
            }
        }

        // Get list of student IDs being saved (only the selected class students!)
        const studentIdsToSave = this.currentCheckinStudents.map(st => st.studentId);

        // Delete old logs of today for this base and for these student IDs
        this.db.attendance_logs = this.db.attendance_logs.filter(
            log => !(log.date === todayDate && log.baseId === scheduleRow.baseId && studentIdsToSave.includes(log.studentId))
        );

        // Add new logs
        const timestamp = new Date().toISOString();
        this.currentCheckinStudents.forEach(st => {
            const status = this.attendanceState[st.studentId];
            if (status) { // Only log if status is selected
                this.db.attendance_logs.push({
                    date: todayDate,
                    week: week,
                    baseId: scheduleRow.baseId,
                    studentId: st.studentId,
                    status: status,
                    checkedBy: this.currentUser.username,
                    timestamp: timestamp
                });
            }
        });

        this.saveDatabase();
        this.showStatusModal('success', 'บันทึกการเข้าเรียนสำเร็จ', `บันทึกการเช็กชื่อชั้นเรียน <strong>${this.selectedCheckinClass}</strong> เรียบร้อยแล้ว!`);
        this.switchView('dashboard');
    }

    // RENDER: Executive/Director dashboard view
    renderAdmin() {
        const todayDate = this.systemDate;
        const week = this.currentWeekInfo.week;

        const todaySchedule = this.db.rotation_schedule.filter(s => s.week === week);

        let overallPresent = 0;
        let overallTotalChecked = 0;
        let overallAbsent = 0;
        let lateCheckinBases = 0;

        const tableBody = document.getElementById('admin-bases-status-table');
        tableBody.innerHTML = '';

        const gradePresentCount = { 'ม.1': 0, 'ม.2': 0, 'ม.3': 0, 'ม.4': 0, 'ม.5': 0, 'ม.6': 0 };
        const gradeTotalChecked = { 'ม.1': 0, 'ม.2': 0, 'ม.3': 0, 'ม.4': 0, 'ม.5': 0, 'ม.6': 0 };

        todaySchedule.forEach(sch => {
            const baseLogs = this.db.attendance_logs.filter(
                l => l.date === todayDate && l.baseId === sch.baseId
            );
            
            const isChecked = baseLogs.length > 0;
            
            let groupStudents = [];
            if (!sch.isSpecial && !sch.isEmpty) {
                groupStudents = this.db.students.filter(st => sch.attendingClasses && sch.attendingClasses.includes(`${st.grade}/${st.room}`));
            }
            
            let presentCount = 0;
            let absentCount = 0;
            let timeChecked = '-';

            if (isChecked && !sch.isSpecial && !sch.isEmpty) {
                baseLogs.forEach(l => {
                    const st = groupStudents.find(s => s.studentId === l.studentId);
                    if (st) {
                        gradeTotalChecked[st.grade]++;
                        if (l.status === 'present') {
                            presentCount++;
                            gradePresentCount[st.grade]++;
                        } else if (l.status === 'absent') {
                            absentCount++;
                        }
                    }
                });

                overallPresent += presentCount;
                overallAbsent += absentCount;
                overallTotalChecked += baseLogs.length;
                
                // Get checked time from log timestamp
                const logTime = new Date(baseLogs[0].timestamp);
                timeChecked = logTime.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.';
            } else if (!isChecked && !sch.isSpecial && !sch.isEmpty) {
                lateCheckinBases++;
            }

            // Status design
            let statusLabel = '';
            if (sch.isSpecial) {
                statusLabel = `<span class="status-badge activity"><i class="fa-solid fa-star"></i> ${sch.classes}</span>`;
            } else if (sch.isEmpty) {
                statusLabel = `<span class="status-badge pending"><i class="fa-solid fa-ban"></i> ว่าง</span>`;
            } else {
                statusLabel = isChecked
                    ? '<span class="status-badge present"><i class="fa-solid fa-circle-check"></i> เช็กแล้ว</span>'
                    : '<span class="status-badge pending"><i class="fa-solid fa-hourglass"></i> ยังไม่ได้เช็ก</span>';
            }

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="font-weight: 700; color: var(--primary-dark);">${sch.baseName}</td>
                <td>${sch.teacherName}</td>
                <td>${sch.room}</td>
                <td><span class="status-badge info">${sch.isSpecial ? 'ทุกระดับชั้น' : sch.classes}</span></td>
                <td>${statusLabel}</td>
                <td>${timeChecked}</td>
                <td><strong>${sch.isSpecial || sch.isEmpty ? '-' : (isChecked ? `${presentCount}/${groupStudents.length}` : `- / ${groupStudents.length}`)}</strong></td>
            `;
            tableBody.appendChild(tr);
        });

        // Calculate rates
        const overallRate = overallTotalChecked > 0 ? Math.round((overallPresent / overallTotalChecked) * 100) : 0;
        document.getElementById('admin-overall-rate').textContent = `${overallRate}%`;
        document.getElementById('admin-absent-count').textContent = `${overallAbsent}`;
        document.getElementById('admin-late-bases-count').textContent = `${lateCheckinBases}`;

        // Render Bar Chart: Grade attendance percentage
        const grades = ['ม.1', 'ม.2', 'ม.3', 'ม.4', 'ม.5', 'ม.6'];
        const gradeRates = grades.map(g => {
            const checked = gradeTotalChecked[g];
            const present = gradePresentCount[g];
            return checked > 0 ? Math.round((present / checked) * 100) : 0;
        });

        if (this.adminChart) this.adminChart.destroy();
        
        const chartBackgroundColors = gradeRates.map(rate => {
            if (rate < 50) return '#B22222'; // Red
            if (rate < 75) return '#F97316'; // Orange
            if (rate < 95) return '#EAB308'; // Yellow
            return '#6F8F3D'; // Green
        });
        
        const chartBorderColors = gradeRates.map(rate => {
            if (rate < 50) return '#8C1111';
            if (rate < 75) return '#C2410C';
            if (rate < 95) return '#A16207';
            return '#4D6B24';
        });

        const ctx = document.getElementById('admin-grade-chart').getContext('2d');
        this.adminChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: grades,
                datasets: [{
                    label: 'อัตราการเข้าเรียน (%)',
                    data: gradeRates,
                    backgroundColor: chartBackgroundColors,
                    borderColor: chartBorderColors,
                    borderWidth: 1.5,
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                            callback: value => value + '%'
                        }
                    }
                }
            }
        });
    }

    // RENDER: Reports view
    renderReports() {
        // Populate week selector if not already done
        const weekSelect = document.getElementById('report-week-select');
        if (weekSelect.children.length === 0) {
            // Distinct weeks from rotation schedule
            const weeks = [...new Set(this.db.rotation_schedule.map(s => s.week))].sort((a,b) => a-b);
            weeks.forEach(w => {
                const opt = document.createElement('option');
                opt.value = w;
                opt.textContent = `สัปดาห์ที่ ${w}`;
                weekSelect.appendChild(opt);
            });
            // Default select current week
            weekSelect.value = this.currentWeekInfo.week;
        }

        // Populate base selector if not already done
        const baseSelect = document.getElementById('report-base-select');
        if (baseSelect.children.length <= 1) { // 1 is 'all'
            this.db.bases.forEach(b => {
                const opt = document.createElement('option');
                opt.value = b.id;
                opt.textContent = b.name;
                baseSelect.appendChild(opt);
            });
        }

        // Populate class selector if not already done
        const classSelect = document.getElementById('report-class-select');
        if (classSelect.children.length === 0) {
            // Get unique classes sorted
            const classrooms = [...new Set(this.db.students.map(s => `${s.grade}/${s.room}`))].sort();
            classrooms.forEach(c => {
                const opt = document.createElement('option');
                opt.value = c;
                opt.textContent = c;
                classSelect.appendChild(opt);
            });
        }

        this.generateReport();
    }

    // Toggle filter inputs depending on report type selection
    toggleReportFilters(type) {
        const weekGroup = document.getElementById('report-week-group');
        const baseGroup = document.getElementById('report-base-group');
        const classGroup = document.getElementById('report-class-group');

        // Hide all
        weekGroup.style.display = 'none';
        baseGroup.style.display = 'none';
        classGroup.style.display = 'none';

        if (type === 'daily') {
            // Uses systemDate simulator automatically
        } else if (type === 'weekly') {
            weekGroup.style.display = 'flex';
        } else if (type === 'base') {
            baseGroup.style.display = 'flex';
        } else if (type === 'grade') {
            // General school grade breakdown
        } else if (type === 'class') {
            classGroup.style.display = 'flex';
        }
    }

    // Main Report calculations & rendering
    generateReport() {
        const type = document.getElementById('report-type-select').value;
        const selectedWeek = parseInt(document.getElementById('report-week-select').value) || 6;
        const selectedBase = document.getElementById('report-base-select').value;
        const selectedClass = document.getElementById('report-class-select').value;
        
        const headerTitle = document.getElementById('report-header-title');
        const headerSubtitle = document.getElementById('report-header-subtitle');
        const datePrint = document.getElementById('report-header-date');
        const summaryStatsDiv = document.getElementById('report-summary-stats');
        
        datePrint.textContent = `พิมพ์ ณ วันที่: ${this.formatThaiDate(new Date().toISOString().split('T')[0])} เวลา ${new Date().toLocaleTimeString('th-TH')}`;

        const tableHeader = document.getElementById('report-table-header');
        const tableBody = document.getElementById('reports-table-body');
        tableBody.innerHTML = '';
        tableHeader.innerHTML = '';

        if (type === 'daily') {
            headerTitle.textContent = "รายงานผลการเช็กชื่อเข้าเรียน รายวัน";
            headerSubtitle.textContent = `ประจำวันที่ ${this.formatThaiDate(this.systemDate)} | สัปดาห์เรียนที่ ${this.currentWeekInfo.week}`;

            // Header columns
            tableHeader.innerHTML = `
                <th>ฐานการเรียนรู้</th>
                <th>คุณครูผู้เช็ก</th>
                <th>ระดับชั้นที่เข้าเรียน</th>
                <th>มา</th>
                <th>ขาด</th>
                <th>ลา</th>
                <th>สาย</th>
                <th>กิจกรรม</th>
                <th>คิดเป็น % มาเรียน</th>
            `;

            // Row calculation
            let sumP = 0, sumA = 0, sumL = 0, sumLt = 0, sumAct = 0;
            const weekSched = this.db.rotation_schedule.filter(s => s.week === this.currentWeekInfo.week);

            weekSched.forEach(sch => {
                const logs = this.db.attendance_logs.filter(l => l.date === this.systemDate && l.baseId === sch.baseId);
                const isChecked = logs.length > 0;
                
                let p = 0, a = 0, le = 0, la = 0, act = 0;
                if (isChecked) {
                    logs.forEach(l => {
                        if (l.status === 'present') p++;
                        else if (l.status === 'absent') a++;
                        else if (l.status === 'leave') le++;
                        else if (l.status === 'late') la++;
                        else if (l.status === 'activity') act++;
                    });
                }

                sumP += p; sumA += a; sumL += le; sumLt += la; sumAct += act;
                const total = p + a + le + la + act;
                const rate = total > 0 ? Math.round((p / total) * 100) + '%' : 'ยังไม่เช็ก';

                const baseObj = this.db.bases.find(b => b.id === sch.baseId);
                const displayTeacherName = baseObj ? baseObj.defaultTeacher : sch.teacherName;

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td style="font-weight:700;">${sch.baseName}</td>
                    <td>${displayTeacherName}</td>
                    <td><span class="status-badge info">${sch.classes}</span></td>
                    <td>${isChecked ? p : '-'}</td>
                    <td>${isChecked ? a : '-'}</td>
                    <td>${isChecked ? le : '-'}</td>
                    <td>${isChecked ? la : '-'}</td>
                    <td>${isChecked ? act : '-'}</td>
                    <td style="font-weight:700; color:var(--primary-dark);">${rate}</td>
                `;
                tableBody.appendChild(tr);
            });

            // Update Summary Stats
            const totalStudentsToday = this.db.students.length; // Approximate total scheduled today
            const totalChecked = sumP + sumA + sumL + sumLt + sumAct;
            const percent = totalChecked > 0 ? Math.round((sumP / totalChecked) * 100) : 0;

            summaryStatsDiv.innerHTML = `
                <div class="card stat-card" style="padding:16px;"><div class="stat-info"><h3>จำนวนรวมผู้มา</h3><p style="color:var(--success)">${sumP} คน</p></div></div>
                <div class="card stat-card" style="padding:16px;"><div class="stat-info"><h3>จำนวนรวมผู้ขาด</h3><p style="color:var(--danger)">${sumA} คน</p></div></div>
                <div class="card stat-card" style="padding:16px;"><div class="stat-info"><h3>ลา/สาย/กิจกรรม</h3><p style="color:var(--warning)">${sumL} / ${sumLt} / ${sumAct}</p></div></div>
                <div class="card stat-card" style="padding:16px;"><div class="stat-info"><h3>อัตราการเข้าเรียนรวม</h3><p style="color:var(--primary)">${percent}%</p></div></div>
            `;

        } else if (type === 'weekly') {
            headerTitle.textContent = "รายงานผลการเช็กชื่อเข้าเรียน รายสัปดาห์";
            headerSubtitle.textContent = `สัปดาห์เรียนที่ ${selectedWeek}`;

            tableHeader.innerHTML = `
                <th>ฐานการเรียนรู้</th>
                <th>คุณครูผู้เช็ก</th>
                <th>ระดับชั้นเรียน</th>
                <th>มา</th>
                <th>ขาด</th>
                <th>ลา</th>
                <th>สาย</th>
                <th>กิจกรรม</th>
                <th>อัตราการเข้าเรียน</th>
            `;

            // Calculate weekly aggregate
            const weekSched = this.db.rotation_schedule.filter(s => s.week === selectedWeek);
            let sumP = 0, sumA = 0, sumL = 0, sumLt = 0, sumAct = 0;

            weekSched.forEach(sch => {
                const logs = this.db.attendance_logs.filter(l => l.week === selectedWeek && l.baseId === sch.baseId);
                
                let p = 0, a = 0, le = 0, la = 0, act = 0;
                logs.forEach(l => {
                    if (l.status === 'present') p++;
                    else if (l.status === 'absent') a++;
                    else if (l.status === 'leave') le++;
                    else if (l.status === 'late') la++;
                    else if (l.status === 'activity') act++;
                });

                sumP += p; sumA += a; sumL += le; sumLt += la; sumAct += act;
                const total = p + a + le + la + act;
                const rate = total > 0 ? Math.round((p / total) * 100) + '%' : '-';

                const baseObj = this.db.bases.find(b => b.id === sch.baseId);
                const displayTeacherName = baseObj ? baseObj.defaultTeacher : sch.teacherName;

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td style="font-weight:700;">${sch.baseName}</td>
                    <td>${displayTeacherName}</td>
                    <td><span class="status-badge info">${sch.classes}</span></td>
                    <td>${total > 0 ? p : '-'}</td>
                    <td>${total > 0 ? a : '-'}</td>
                    <td>${total > 0 ? le : '-'}</td>
                    <td>${total > 0 ? la : '-'}</td>
                    <td>${total > 0 ? act : '-'}</td>
                    <td style="font-weight:700; color:var(--primary-dark);">${rate}</td>
                `;
                tableBody.appendChild(tr);
            });

            const total = sumP + sumA + sumL + sumLt + sumAct;
            const percent = total > 0 ? Math.round((sumP / total) * 100) : 0;
            summaryStatsDiv.innerHTML = `
                <div class="card stat-card" style="padding:16px;"><div class="stat-info"><h3>จำนวนนักเรียนมา</h3><p style="color:var(--success)">${sumP} คน</p></div></div>
                <div class="card stat-card" style="padding:16px;"><div class="stat-info"><h3>จำนวนนักเรียนขาด</h3><p style="color:var(--danger)">${sumA} คน</p></div></div>
                <div class="card stat-card" style="padding:16px;"><div class="stat-info"><h3>อัตราเข้าเรียนสัปดาห์</h3><p style="color:var(--primary)">${percent}%</p></div></div>
            `;

        } else if (type === 'base') {
            const baseObj = this.db.bases.find(b => b.id === selectedBase);
            const baseName = baseObj ? baseObj.name : 'ทุกฐาน';
            headerTitle.textContent = `รายงานการเข้าเรียน รายฐานการเรียนรู้ (${baseName})`;
            headerSubtitle.textContent = `สถิติรายสัปดาห์ (Week 1 - 20)`;

            tableHeader.innerHTML = `
                <th>สัปดาห์</th>
                <th>ช่วงวันที่</th>
                <th>ระดับชั้นเข้าเรียน</th>
                <th>มาเรียน</th>
                <th>ขาดเรียน</th>
                <th>ลา</th>
                <th>สาย</th>
                <th>กิจกรรม</th>
                <th>ร้อยละการเข้าเรียน</th>
            `;

            // Loop 20 weeks
            let sumP = 0, sumA = 0, sumL = 0, sumLt = 0, sumAct = 0;
            for (let wk = 1; wk <= 20; wk++) {
                // Find schedule row for base in week wk
                const sch = this.db.rotation_schedule.find(s => s.week === wk && (selectedBase === 'all' ? true : s.baseId === selectedBase));
                if (!sch) continue;

                const logs = this.db.attendance_logs.filter(l => l.week === wk && l.baseId === sch.baseId);
                let p = 0, a = 0, le = 0, la = 0, act = 0;
                logs.forEach(l => {
                    if (l.status === 'present') p++;
                    else if (l.status === 'absent') a++;
                    else if (l.status === 'leave') le++;
                    else if (l.status === 'late') la++;
                    else if (l.status === 'activity') act++;
                });

                sumP += p; sumA += a; sumL += le; sumLt += la; sumAct += act;
                const total = p + a + le + la + act;
                const rate = total > 0 ? Math.round((p / total) * 100) + '%' : (sch.isSpecial ? sch.classes : '-');

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>สัปดาห์ที่ ${wk}</td>
                    <td>${sch.dates}</td>
                    <td><span class="status-badge info">${sch.isSpecial ? 'ทุกระดับชั้น' : sch.classes}</span></td>
                    <td>${total > 0 ? p : '-'}</td>
                    <td>${total > 0 ? a : '-'}</td>
                    <td>${total > 0 ? le : '-'}</td>
                    <td>${total > 0 ? la : '-'}</td>
                    <td>${total > 0 ? act : '-'}</td>
                    <td style="font-weight:700; color:var(--primary-dark);">${rate}</td>
                `;
                tableBody.appendChild(tr);
            }

            const total = sumP + sumA + sumL + sumLt + sumAct;
            const percent = total > 0 ? Math.round((sumP / total) * 100) : 0;
            summaryStatsDiv.innerHTML = `
                <div class="card stat-card" style="padding:16px;"><div class="stat-info"><h3>สะสมมาเรียน</h3><p style="color:var(--success)">${sumP} คน-ครั้ง</p></div></div>
                <div class="card stat-card" style="padding:16px;"><div class="stat-info"><h3>สะสมขาดเรียน</h3><p style="color:var(--danger)">${sumA} คน-ครั้ง</p></div></div>
                <div class="card stat-card" style="padding:16px;"><div class="stat-info"><h3>ร้อยละมาเรียนสะสม</h3><p style="color:var(--primary)">${percent}%</p></div></div>
            `;

        } else if (type === 'grade') {
            headerTitle.textContent = "รายงานสัดส่วนการเข้าเรียนตามระดับชั้น";
            headerSubtitle.textContent = `ภาพรวมสะสมระดับชั้น ม.1 - ม.6`;

            tableHeader.innerHTML = `
                <th>ระดับชั้นเรียน</th>
                <th>จำนวนนักเรียนทั้งหมด</th>
                <th>มาเรียนสะสม</th>
                <th>ขาดเรียนสะสม</th>
                <th>ลาสะสม</th>
                <th>สายสะสม</th>
                <th>กิจกรรมสะสม</th>
                <th>ร้อยละเข้าเรียนสะสม</th>
            `;

            const grades = ['ม.1', 'ม.2', 'ม.3', 'ม.4', 'ม.5', 'ม.6'];
            let totalOverallP = 0, totalOverallA = 0;

            grades.forEach(g => {
                const classStudents = this.db.students.filter(s => s.grade === g);
                const studentIds = classStudents.map(s => s.studentId);
                
                const logs = this.db.attendance_logs.filter(l => studentIds.includes(l.studentId));
                let p = 0, a = 0, le = 0, la = 0, act = 0;
                logs.forEach(l => {
                    if (l.status === 'present') p++;
                    else if (l.status === 'absent') a++;
                    else if (l.status === 'leave') le++;
                    else if (l.status === 'late') la++;
                    else if (l.status === 'activity') act++;
                });

                totalOverallP += p;
                totalOverallA += a;
                const total = p + a + le + la + act;
                const rate = total > 0 ? Math.round((p / total) * 100) + '%' : 'ไม่มีข้อมูล';

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td style="font-weight:700;">ระดับชั้น ${g}</td>
                    <td>${classStudents.length} คน</td>
                    <td>${p}</td>
                    <td>${a}</td>
                    <td>${le}</td>
                    <td>${la}</td>
                    <td>${act}</td>
                    <td style="font-weight:700; color:var(--primary-dark);">${rate}</td>
                `;
                tableBody.appendChild(tr);
            });

            summaryStatsDiv.innerHTML = `
                <div class="card stat-card" style="padding:16px;"><div class="stat-info"><h3>จำนวนสะสมมาเรียน</h3><p style="color:var(--success)">${totalOverallP} คน</p></div></div>
                <div class="card stat-card" style="padding:16px;"><div class="stat-info"><h3>จำนวนสะสมขาดเรียน</h3><p style="color:var(--danger)">${totalOverallA} คน</p></div></div>
            `;

        } else if (type === 'class') {
            headerTitle.textContent = `รายงานการเช็กชื่อรายบุคคล ห้อง ${selectedClass}`;
            headerSubtitle.textContent = `ประวัติสถิติการเช็กชื่อสะสม`;

            tableHeader.innerHTML = `
                <th>เลขที่</th>
                <th>เลขประจำตัว</th>
                <th>ชื่อ-นามสกุล</th>
                <th>มา (ครั้ง)</th>
                <th>ขาด (ครั้ง)</th>
                <th>ลา (ครั้ง)</th>
                <th>สาย (ครั้ง)</th>
                <th>กิจกรรม (ครั้ง)</th>
                <th>คิดเป็น % มาเรียน</th>
            `;

            // Find students of selectedClass
            const [selectedGrade, selectedRoomStr] = selectedClass.split('/');
            const selectedRoom = parseInt(selectedRoomStr);
            
            const classStudents = this.db.students.filter(
                s => s.grade === selectedGrade && s.room === selectedRoom
            );
            classStudents.sort((a,b) => a.no - b.no);

            let classP = 0, classTotal = 0;

            classStudents.forEach(st => {
                const logs = this.db.attendance_logs.filter(l => l.studentId === st.studentId);
                let p = 0, a = 0, le = 0, la = 0, act = 0;
                logs.forEach(l => {
                    if (l.status === 'present') p++;
                    else if (l.status === 'absent') a++;
                    else if (l.status === 'leave') le++;
                    else if (l.status === 'late') la++;
                    else if (l.status === 'activity') act++;
                });

                const stTotal = p + a + le + la + act;
                const rate = stTotal > 0 ? Math.round((p / stTotal) * 100) + '%' : '0%';
                
                classP += p;
                classTotal += stTotal;

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${st.no}</td>
                    <td>${st.studentId}</td>
                    <td style="font-weight:600;">${st.name}</td>
                    <td>${p}</td>
                    <td>${a}</td>
                    <td>${le}</td>
                    <td>${la}</td>
                    <td>${act}</td>
                    <td style="font-weight:700; color:var(--primary-dark);">${rate}</td>
                `;
                tableBody.appendChild(tr);
            });

            const percent = classTotal > 0 ? Math.round((classP / classTotal) * 100) : 0;
            summaryStatsDiv.innerHTML = `
                <div class="card stat-card" style="padding:16px;"><div class="stat-info"><h3>จำนวนนักเรียนทั้งหมด</h3><p style="color:var(--primary)">${classStudents.length} คน</p></div></div>
                <div class="card stat-card" style="padding:16px;"><div class="stat-info"><h3>ร้อยละมาเรียนห้องเฉลี่ย</h3><p style="color:var(--success)">${percent}%</p></div></div>
            `;
        }
    }

    // Export Excel using SheetJS
    exportReportToExcel() {
        const type = document.getElementById('report-type-select').value;
        const table = document.getElementById('reports-output-table');
        
        if (!table) {
            alert("ไม่สามารถค้นหาข้อมูลตารางเพื่อนำออกได้!");
            return;
        }

        const wb = XLSX.utils.table_to_book(table, { sheet: "รายงานการเข้าเรียน" });
        const fileName = `Attendance_Report_${type}_${this.systemDate}.xlsx`;
        XLSX.writeFile(wb, fileName);
    }

    // RENDER: CRUD Management console
    renderManage() {
        const wrapper = document.getElementById('manage-content-wrapper');
        const denied = document.getElementById('manage-denied-wrapper');
        if (!this.currentUser || this.currentUser.role !== 'admin') {
            if (wrapper) wrapper.style.display = 'none';
            if (denied) denied.style.display = 'block';
        } else {
            if (wrapper) wrapper.style.display = 'block';
            if (denied) denied.style.display = 'none';
            this.switchManageTab(this.manageTab);
        }
    }

    switchManageTab(tabId) {
        this.manageTab = tabId;
        
        // Update tab buttons style
        const tabs = ['students', 'teachers', 'bases', 'schedule', 'import', 'cloud'];
        tabs.forEach(t => {
            const btn = document.getElementById(`btn-tab-${t}`);
            const div = document.getElementById(`manage-sub-${t}`);
            
            if (t === tabId) {
                if (btn) btn.classList.add('btn-primary');
                if (btn) btn.classList.remove('btn-outline');
                if (div) div.style.display = 'block';
            } else {
                if (btn) btn.classList.remove('btn-primary');
                if (btn) btn.classList.add('btn-outline');
                if (div) div.style.display = 'none';
            }
        });

        // Trigger sub-tab load
        if (tabId === 'students') {
            this.studentPage = 1;
            this.renderManageStudents();
        } else if (tabId === 'teachers') {
            this.renderManageTeachers();
        } else if (tabId === 'bases') {
            this.renderManageBases();
        } else if (tabId === 'schedule') {
            this.renderManageSchedule();
        } else if (tabId === 'cloud') {
            this.loadCloudBackups();
            this.loadAuditLogs();
        }
    }

    // Sub-tab: Students CRUD
    getFilteredStudents() {
        const query = document.getElementById('manage-student-search').value.trim().toLowerCase();
        return this.db.students.filter(st => {
            const classStr = `${st.grade}/${st.room}`;
            return st.name.toLowerCase().includes(query) || 
                   st.studentId.includes(query) || 
                   classStr.includes(query) ||
                   st.grade.includes(query);
        });
    }

    renderManageStudents() {
        const filtered = this.getFilteredStudents();
        const total = filtered.length;
        
        // Sorting by Grade, Room, then Number
        filtered.sort((a, b) => {
            if (a.grade !== b.grade) return a.grade.localeCompare(b.grade);
            if (a.room !== b.room) return a.room - b.room;
            return a.no - b.no;
        });

        // Pagination calculations
        const totalPages = Math.ceil(total / this.pageSize);
        if (this.studentPage > totalPages) this.studentPage = Math.max(1, totalPages);
        
        const start = (this.studentPage - 1) * this.pageSize;
        const end = Math.min(start + this.pageSize, total);
        const paginated = filtered.slice(start, end);

        // Update pagination labels
        document.getElementById('student-pagination-info').textContent = total > 0 
            ? `แสดง ${start + 1} - ${end} จากทั้งหมด ${total} คน`
            : `ไม่พบข้อมูลนักเรียน`;

        const tbody = document.getElementById('manage-students-table-body');
        tbody.innerHTML = '';

        paginated.forEach(st => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>เลขที่ ${st.no}</td>
                <td>${st.studentId}</td>
                <td style="font-weight:600;">${st.name}</td>
                <td>${st.grade}</td>
                <td>ห้อง ${st.room}</td>
                <td>
                    <button class="btn btn-outline btn-sm" onclick="app.openEditStudentModal('${st.studentId}')">
                        <i class="fa-solid fa-pen-to-square"></i> แก้ไข
                    </button>
                    <button class="btn btn-outline btn-sm" style="color:var(--danger);" onclick="app.deleteStudent('${st.studentId}')">
                        <i class="fa-solid fa-trash"></i> ลบ
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    // Sub-tab: Teachers CRUD
    renderManageTeachers() {
        const tbody = document.getElementById('manage-teachers-table-body');
        tbody.innerHTML = '';

        this.db.teachers.forEach(t => {
            let roleBadge = '<span class="status-badge info">ครูผู้สอน</span>';
            if (t.role === 'admin') {
                roleBadge = '<span class="status-badge activity" style="background-color:#E0F2FE; color:#0369A1;">แอดมิน</span>';
            } else if (t.role === 'director') {
                roleBadge = '<span class="status-badge activity">ผู้บริหาร</span>';
            }

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="font-family:'Outfit';">${t.username}</td>
                <td style="font-weight:600;">${t.name}</td>
                <td>${roleBadge}</td>
                <td>
                    <button class="btn btn-outline btn-sm" onclick="app.openEditTeacherModal('${t.username}')">
                        <i class="fa-solid fa-pen-to-square"></i> แก้ไข
                    </button>
                    <button class="btn btn-outline btn-sm" style="color:var(--danger);" onclick="app.deleteTeacher('${t.username}')">
                        <i class="fa-solid fa-trash"></i> ลบ
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    // Sub-tab: Bases CRUD
    renderManageBases() {
        const tbody = document.getElementById('manage-bases-table-body');
        tbody.innerHTML = '';

        this.db.bases.forEach(b => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="font-weight:700; color:var(--primary-dark);">${b.name}</td>
                <td><i class="fa-solid fa-location-dot"></i> ${b.defaultRoom}</td>
                <td><i class="fa-solid fa-user-tie"></i> ${b.defaultTeacher}</td>
                <td>
                    <button class="btn btn-outline btn-sm" onclick="app.openEditBaseModal('${b.id}')">
                        <i class="fa-solid fa-pen-to-square"></i> แก้ไข
                    </button>
                    <button class="btn btn-outline btn-sm" style="color:var(--danger);" onclick="app.deleteBase('${b.id}')">
                        <i class="fa-solid fa-trash"></i> ลบ
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    // Sub-tab: Schedule CRUD
    renderManageSchedule() {
        // Populate filter week if empty
        const filterWeek = document.getElementById('manage-schedule-week-filter');
        if (filterWeek.children.length <= 1) { // 1 is 'all'
            const weeks = [...new Set(this.db.rotation_schedule.map(s => s.week))].sort((a,b) => a-b);
            weeks.forEach(w => {
                const opt = document.createElement('option');
                opt.value = w;
                opt.textContent = `สัปดาห์ที่ ${w}`;
                filterWeek.appendChild(opt);
            });
        }

        const selectedWeekVal = filterWeek.value;
        const filtered = selectedWeekVal === 'all' 
            ? this.db.rotation_schedule 
            : this.db.rotation_schedule.filter(s => s.week === parseInt(selectedWeekVal));

        // Sort schedule by week, then base index
        filtered.sort((a, b) => {
            if (a.week !== b.week) return a.week - b.week;
            return a.baseName.localeCompare(b.baseName);
        });

        const tbody = document.getElementById('manage-schedule-table-body');
        tbody.innerHTML = '';

        filtered.forEach((sch) => {
            const dbIndex = this.db.rotation_schedule.indexOf(sch);
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>สัปดาห์ที่ ${sch.week}</td>
                <td style="font-size:12px; color:var(--text-secondary);">${sch.dates}</td>
                <td style="font-weight:700; color:var(--primary-dark);">${sch.baseName}</td>
                <td><span class="status-badge info">${sch.classes}</span></td>
                <td><i class="fa-solid fa-location-dot"></i> ${sch.room}</td>
                <td>${sch.teacherName}</td>
                <td>
                    <button class="btn btn-outline btn-sm" onclick="app.openEditScheduleModal(${dbIndex})">
                        <i class="fa-solid fa-pen-to-square"></i> แก้ไข
                    </button>
                    <button class="btn btn-outline btn-sm" style="color:var(--danger);" onclick="app.deleteSchedule(${dbIndex})">
                        <i class="fa-solid fa-trash"></i> ลบ
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    // STUDENT: CRUD Operations Modal Save
    openAddStudentModal() {
        document.getElementById('student-modal-title').textContent = "เพิ่มข้อมูลนักเรียน";
        document.getElementById('student-form-index').value = ""; // Empty indicates new student
        document.getElementById('student-form-id').value = "";
        document.getElementById('student-form-id').disabled = false;
        document.getElementById('student-form-name').value = "";
        document.getElementById('student-form-grade').value = "ม.1";
        document.getElementById('student-form-class').value = "";
        document.getElementById('student-form-no').value = "";
        this.openModal('student-modal');
    }

    openEditStudentModal(studentId) {
        const st = this.db.students.find(s => s.studentId === studentId);
        if (!st) return;

        document.getElementById('student-modal-title').textContent = "แก้ไขข้อมูลนักเรียน";
        document.getElementById('student-form-index').value = studentId; // Holds ID for edits
        document.getElementById('student-form-id').value = st.studentId;
        document.getElementById('student-form-id').disabled = true; // Cannot edit unique key ID
        document.getElementById('student-form-name').value = st.name;
        document.getElementById('student-form-grade').value = st.grade;
        document.getElementById('student-form-class').value = st.room;
        document.getElementById('student-form-no').value = st.no;

        this.openModal('student-modal');
    }

    saveStudentFromForm() {
        const formIndex = document.getElementById('student-form-index').value;
        const id = document.getElementById('student-form-id').value.trim();
        const name = document.getElementById('student-form-name').value.trim();
        const grade = document.getElementById('student-form-grade').value;
        const room = parseInt(document.getElementById('student-form-class').value);
        const no = parseInt(document.getElementById('student-form-no').value);

        if (!id || !name || isNaN(room) || isNaN(no)) {
            alert("กรุณากรอกข้อมูลให้ครบถ้วน!");
            return;
        }

        // Determine group index based on grade / room
        let groupIndex = 0;
        if (grade === 'ม.1' && (room === 1 || room === 2 || room === 9)) groupIndex = 0;
        else if (grade === 'ม.2' && (room === 1 || room === 2 || room === 9)) groupIndex = 1;
        else if (grade === 'ม.3' && (room === 1 || room === 2 || room === 9)) groupIndex = 2;
        else if (grade === 'ม.4' && (room === 1 || room === 2 || room === 9)) groupIndex = 3;
        else if (grade === 'ม.5' && (room === 1 || room === 2 || room === 9)) groupIndex = 4;
        else if (grade === 'ม.6' && (room === 1 || room === 2 || room === 9)) groupIndex = 5;
        else groupIndex = 6; // mixed group 7

        if (formIndex === "") {
            // Check duplicate
            if (this.db.students.find(s => s.studentId === id)) {
                alert("เลขประจำตัวนักเรียนนี้มีอยู่ในระบบแล้ว!");
                return;
            }
            // Create new
            this.db.students.push({ studentId: id, name, grade, room, no, groupIndex });
            this.logAudit(`Added student: ${name} (ID: ${id})`);
        } else {
            // Edit existing
            const st = this.db.students.find(s => s.studentId === formIndex);
            if (st) {
                st.name = name;
                st.grade = grade;
                st.room = room;
                st.no = no;
                st.groupIndex = groupIndex;
            }
            this.logAudit(`Updated student: ${name} (ID: ${id})`);
        }

        this.saveDatabase();
        this.closeModal('student-modal');
        this.renderManageStudents();
    }

    deleteStudent(studentId) {
        if (confirm(`คุณแน่ใจว่าต้องการลบรายชื่อนักเรียน รหัส ${studentId} หรือไม่?`)) {
            this.db.students = this.db.students.filter(s => s.studentId !== studentId);
            this.saveDatabase();
            this.logAudit(`Deleted student ID: ${studentId}`);
            this.renderManageStudents();
        }
    }

    // TEACHER: CRUD operations
    openAddTeacherModal() {
        document.getElementById('teacher-modal-title').textContent = "เพิ่มข้อมูลคุณครู";
        document.getElementById('teacher-form-username').value = "";
        document.getElementById('teacher-form-username').disabled = false;
        document.getElementById('teacher-form-name').value = "";
        document.getElementById('teacher-form-role').value = "teacher";
        
        document.getElementById('teacher-form-password-label').textContent = "รหัสผ่านเริ่มต้น (รหัสเริ่มต้นคือ username)";
        document.getElementById('teacher-form-password').value = "";
        document.getElementById('teacher-form-password').placeholder = "ระบุรหัสผ่านเริ่มต้น...";
        
        this.openModal('teacher-modal');
    }

    openEditTeacherModal(username) {
        const t = this.db.teachers.find(x => x.username === username);
        if (!t) return;

        document.getElementById('teacher-modal-title').textContent = "แก้ไขข้อมูลคุณครู";
        document.getElementById('teacher-form-username').value = t.username;
        document.getElementById('teacher-form-username').disabled = true;
        document.getElementById('teacher-form-name').value = t.name;
        document.getElementById('teacher-form-role').value = t.role;
        
        document.getElementById('teacher-form-password-label').textContent = "รหัสผ่านใหม่ / รีเซ็ตรหัสผ่าน";
        document.getElementById('teacher-form-password').value = "";
        document.getElementById('teacher-form-password').placeholder = "ระบุรหัสผ่านใหม่ (ปล่อยว่างหากต้องการใช้รหัสเดิม)...";
        
        this.openModal('teacher-modal');
    }

    saveTeacherFromForm() {
        const username = document.getElementById('teacher-form-username').value.trim();
        const name = document.getElementById('teacher-form-name').value.trim();
        const role = document.getElementById('teacher-form-role').value;
        const passwordVal = document.getElementById('teacher-form-password').value.trim();
        const formIndex = document.getElementById('teacher-form-username').disabled; // If disabled, it's an edit

        if (!username || !name) {
            alert("กรุณากรอกข้อมูลให้ครบถ้วน!");
            return;
        }

        if (!formIndex) { // Create
            if (this.db.teachers.find(t => t.username === username)) {
                alert("มีรหัสผู้ใช้ (Username) นี้อยู่ในระบบแล้ว!");
                return;
            }
            const newTeacher = { username, name, role };
            if (passwordVal) {
                newTeacher.password = passwordVal;
            }
            this.db.teachers.push(newTeacher);
            this.logAudit(`Added teacher: ${name} (Username: ${username})`);
        } else { // Edit
            const t = this.db.teachers.find(x => x.username === username);
            if (t) {
                t.name = name;
                t.role = role;
                if (passwordVal) {
                    t.password = passwordVal;
                }
            }
            this.logAudit(`Updated teacher: ${name} (Username: ${username})`);
        }

        this.saveDatabase();
        this.closeModal('teacher-modal');
        this.renderManageTeachers();
    }

    deleteTeacher(username) {
        if (username === 'director' || username === 'admin' || username === 'deputy1' || username === 'deputy2' || username === 'deputy3') {
            alert("ไม่สามารถลบบัญชีผู้บริหารหรือผู้ดูแลระบบหลักของระบบได้!");
            return;
        }
        if (confirm(`คุณแน่ใจว่าต้องการลบข้อมูลคุณครู รหัส ${username} ใช่หรือไม่?`)) {
            this.db.teachers = this.db.teachers.filter(x => x.username !== username);
            this.saveDatabase();
            this.logAudit(`Deleted teacher: ${username}`);
            this.renderManageTeachers();
        }
    }

    // BASE: CRUD operations
    openAddBaseModal() {
        document.getElementById('base-modal-title').textContent = "เพิ่มข้อมูลฐานเรียนรู้";
        document.getElementById('base-form-id').value = "";
        document.getElementById('base-form-name').value = "";
        document.getElementById('base-form-room').value = "";
        this.openModal('base-modal');
        // Uncheck all checkboxes
        const checkboxes = document.querySelectorAll('input[name="base-teachers"]');
        checkboxes.forEach(cb => {
            cb.checked = false;
        });
    }

    openEditBaseModal(id) {
        const b = this.db.bases.find(x => x.id === id);
        if (!b) return;

        document.getElementById('base-modal-title').textContent = "แก้ไขข้อมูลฐานเรียนรู้";
        document.getElementById('base-form-id').value = b.id;
        document.getElementById('base-form-name').value = b.name;
        document.getElementById('base-form-room').value = b.defaultRoom;
        
        this.openModal('base-modal');
        // Check the checkboxes for assigned teachers
        const teacherIds = (b.teacherId || "").split(',').map(x => x.trim());
        const checkboxes = document.querySelectorAll('input[name="base-teachers"]');
        checkboxes.forEach(cb => {
            cb.checked = teacherIds.includes(cb.value);
        });
    }

    saveBaseFromForm() {
        const id = document.getElementById('base-form-id').value;
        const name = document.getElementById('base-form-name').value.trim();
        const room = document.getElementById('base-form-room').value.trim();

        // Get all checked teachers
        const checkedCheckboxes = document.querySelectorAll('input[name="base-teachers"]:checked');
        if (!name || !room || checkedCheckboxes.length === 0) {
            this.showStatusModal('error', 'กรอกข้อมูลไม่ครบ', 'กรุณากรอกชื่อฐาน สถานที่เรียน และเลือกคุณครูผู้ดูแลอย่างน้อย 1 ท่าน!');
            return;
        }

        const teacherIds = Array.from(checkedCheckboxes).map(cb => cb.value);
        const teacherNames = teacherIds.map(uname => {
            const t = this.db.teachers.find(x => x.username === uname);
            return t ? t.name : uname;
        });

        const teacherIdStr = teacherIds.join(', ');
        const teacherNameStr = teacherNames.join(', ');

        if (id === "") { // Create
            const newId = `base${Date.now()}`;
            this.db.bases.push({ id: newId, name, defaultRoom: room, defaultTeacher: teacherNameStr, teacherId: teacherIdStr });
            this.logAudit(`Created learning base: ${name}`);
        } else { // Edit
            const b = this.db.bases.find(x => x.id === id);
            if (b) {
                b.name = name;
                b.defaultRoom = room;
                b.defaultTeacher = teacherNameStr;
                b.teacherId = teacherIdStr;
            }
            // Sync rotation schedule entries
            this.db.rotation_schedule.forEach(sch => {
                if (sch.baseId === id) {
                    sch.baseName = name;
                    sch.room = room;
                    sch.teacherName = teacherNameStr;
                    sch.teacherId = teacherIdStr;
                }
            });
            this.logAudit(`Updated learning base: ${name} (Synced rotation schedule)`);
        }

        this.saveDatabase();
        this.closeModal('base-modal');
        this.renderManageBases();
    }

    deleteBase(id) {
        if (confirm(`คุณแน่ใจว่าต้องการลบฐานการเรียนรู้นี้?`)) {
            this.db.bases = this.db.bases.filter(b => b.id !== id);
            this.saveDatabase();
            this.logAudit(`Deleted base ID: ${id}`);
            this.renderManageBases();
        }
    }

    // SCHEDULE: CRUD operations
    openAddScheduleModal() {
        document.getElementById('schedule-modal-title').textContent = "เพิ่มตารางหมุนฐาน";
        document.getElementById('schedule-form-index').value = ""; // New
        document.getElementById('schedule-form-week').value = "";
        document.getElementById('schedule-form-dates').value = "";
        document.getElementById('schedule-form-classes').value = "";
        document.getElementById('schedule-form-room').value = "";
        this.openModal('schedule-modal');
    }

    openEditScheduleModal(index) {
        const sch = this.db.rotation_schedule[index];
        if (!sch) return;

        document.getElementById('schedule-modal-title').textContent = "แก้ไขตารางหมุนฐาน";
        document.getElementById('schedule-form-index').value = index;
        document.getElementById('schedule-form-week').value = sch.week;
        document.getElementById('schedule-form-dates').value = sch.dates;
        document.getElementById('schedule-form-classes').value = sch.classes;
        document.getElementById('schedule-form-room').value = sch.room;
        
        this.openModal('schedule-modal');
        document.getElementById('schedule-form-base').value = sch.baseId;
        document.getElementById('schedule-form-teacher').value = sch.teacherName;
    }

    saveScheduleFromForm() {
        const indexVal = document.getElementById('schedule-form-index').value;
        const week = parseInt(document.getElementById('schedule-form-week').value);
        const dates = document.getElementById('schedule-form-dates').value.trim();
        const baseId = document.getElementById('schedule-form-base').value;
        const classes = document.getElementById('schedule-form-classes').value.trim();
        const room = document.getElementById('schedule-form-room').value.trim();
        const teacherName = document.getElementById('schedule-form-teacher').value;

        if (isNaN(week) || !dates || !classes || !room) {
            alert("กรุณากรอกข้อมูลให้ครบถ้วน!");
            return;
        }

        const baseObj = this.db.bases.find(b => b.id === baseId);
        const baseName = baseObj ? baseObj.name : '';

        const teacherObj = this.db.teachers.find(t => t.name === teacherName);
        const teacherId = teacherObj ? teacherObj.username : '';

        // Derive start and end dates from week dates roughly or keep as week index start dates
        let startDate = `2026-05-11`;
        let endDate = `2026-05-17`;
        
        // Map rough YYYY-MM-DD back based on standard arrays or match existing week schedule values
        const matchedWeek = this.db.rotation_schedule.find(s => s.week === week);
        if (matchedWeek) {
            startDate = matchedWeek.startDate;
            endDate = matchedWeek.endDate;
        }

        const newSch = {
            week, dates, startDate, endDate, baseId, baseName, classes, room, teacherName, teacherId,
            groupIndex: matchedWeek ? matchedWeek.groupIndex : 0
        };

        if (indexVal === "") { // Create
            this.db.rotation_schedule.push(newSch);
            this.logAudit(`Added rotation schedule for week ${week}: ${baseName}`);
        } else { // Edit
            const idx = parseInt(indexVal);
            this.db.rotation_schedule[idx] = newSch;
            this.logAudit(`Updated rotation schedule for week ${week}: ${baseName}`);
        }

        this.saveDatabase();
        this.closeModal('schedule-modal');
        this.renderManageSchedule();
    }

    deleteSchedule(index) {
        const sch = this.db.rotation_schedule[index];
        if (confirm("ต้องการลบตารางเวลานี้หรือไม่?")) {
            this.db.rotation_schedule.splice(index, 1);
            this.saveDatabase();
            this.logAudit(`Deleted rotation schedule for week ${sch.week}: ${sch.baseName}`);
            this.renderManageSchedule();
        }
    }

    // EXCEL / CSV IMPORT AND EXPORT
    handleExcelImport(inputElement, type) {
        const file = inputElement.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            
            // Assuming first sheet
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            
            // Convert to JSON
            const jsonRows = XLSX.utils.sheet_to_json(sheet);
            
            if (type === 'students') {
                this.importStudents(jsonRows);
            } else if (type === 'teachers') {
                this.importTeachers(jsonRows);
            } else if (type === 'schedule') {
                this.importSchedule(jsonRows);
            }
            
            inputElement.value = ''; // clear file selector
        };
        reader.readAsArrayBuffer(file);
    }

    importStudents(rows) {
        if (rows.length === 0) {
            this.showStatusModal('error', 'นำเข้าข้อมูลไม่สำเร็จ', 'ไม่พบข้อมูลนักเรียนใดๆ ในไฟล์ Excel ที่คุณนำเข้า กรุณาตรวจสอบไฟล์ของคุณ');
            return;
        }

        // Required headers validation: studentId, name, grade, room, no
        const firstRowKeys = Object.keys(rows[0]);
        if (!firstRowKeys.includes('studentId') || !firstRowKeys.includes('name')) {
            this.showStatusModal('error', 'โครงสร้างไฟล์ไม่ถูกต้อง', 'ไม่พบคอลัมน์ที่จำเป็น (studentId, name, grade, room, no) ในไฟล์ Excel ที่นำเข้า');
            return;
        }

        let addedCount = 0;
        let updatedCount = 0;

        rows.forEach(row => {
            const studentId = String(row.studentId);
            const name = String(row.name);
            const grade = String(row.grade || 'ม.1');
            const room = parseInt(row.room || 1);
            const no = parseInt(row.no || 1);

            // Group index determination
            let groupIndex = 0;
            if (grade === 'ม.1' && (room === 1 || room === 2 || room === 9)) groupIndex = 0;
            else if (grade === 'ม.2' && (room === 1 || room === 2 || room === 9)) groupIndex = 1;
            else if (grade === 'ม.3' && (room === 1 || room === 2 || room === 9)) groupIndex = 2;
            else if (grade === 'ม.4' && (room === 1 || room === 2 || room === 9)) groupIndex = 3;
            else if (grade === 'ม.5' && (room === 1 || room === 2 || room === 9)) groupIndex = 4;
            else if (grade === 'ม.6' && (room === 1 || room === 2 || room === 9)) groupIndex = 5;
            else groupIndex = 6;

            const existing = this.db.students.find(s => s.studentId === studentId);
            if (existing) {
                existing.name = name;
                existing.grade = grade;
                existing.room = room;
                existing.no = no;
                existing.groupIndex = groupIndex;
                updatedCount++;
            } else {
                this.db.students.push({ studentId, name, grade, room, no, groupIndex });
                addedCount++;
            }
        });

        this.saveDatabase();
        this.showStatusModal('success', 'นำเข้าข้อมูลนักเรียนสำเร็จ', `นำเข้าข้อมูลนักเรียนเสร็จสิ้น!<br><strong>เพิ่มใหม่:</strong> ${addedCount} คน<br><strong>อัปเดตข้อมูล:</strong> ${updatedCount} คน`);
        this.renderManageStudents();
    }

    importTeachers(rows) {
        if (rows.length === 0) {
            this.showStatusModal('error', 'นำเข้าข้อมูลไม่สำเร็จ', 'ไม่พบข้อมูลคุณครูใดๆ ในไฟล์ Excel ที่คุณนำเข้า กรุณาตรวจสอบไฟล์ของคุณ');
            return;
        }

        const firstRowKeys = Object.keys(rows[0]);
        if (!firstRowKeys.includes('username') || !firstRowKeys.includes('name')) {
            this.showStatusModal('error', 'โครงสร้างไฟล์ไม่ถูกต้อง', 'ไม่พบคอลัมน์ที่จำเป็น (username, name) ในไฟล์ Excel ที่นำเข้า');
            return;
        }

        let addedCount = 0;
        let updatedCount = 0;

        rows.forEach(row => {
            const username = String(row.username || '').trim();
            const name = String(row.name || '').trim();
            let role = String(row.role || 'teacher').trim().toLowerCase();
            const password = row.password ? String(row.password).trim() : undefined;

            if (!username || !name) return;

            if (role !== 'admin' && role !== 'director') {
                role = 'teacher';
            }

            const existing = this.db.teachers.find(t => t.username === username);
            if (existing) {
                existing.name = name;
                existing.role = role;
                if (password) {
                    existing.password = password;
                }
                updatedCount++;
            } else {
                const newTeacher = { username, name, role };
                if (password) {
                    newTeacher.password = password;
                }
                this.db.teachers.push(newTeacher);
                addedCount++;
            }
        });

        this.saveDatabase();
        this.showStatusModal('success', 'นำเข้าข้อมูลคุณครูสำเร็จ', `นำเข้าข้อมูลคุณครูเสร็จสิ้น!<br><strong>เพิ่มใหม่:</strong> ${addedCount} ท่าน<br><strong>อัปเดตข้อมูล:</strong> ${updatedCount} ท่าน`);
        this.renderManageTeachers();
    }

    importSchedule(rows) {
        if (rows.length === 0) {
            this.showStatusModal('error', 'นำเข้าข้อมูลไม่สำเร็จ', 'ไม่พบข้อมูลตารางสอนหมุนฐานในไฟล์ Excel ที่นำเข้า');
            return;
        }

        const keys = Object.keys(rows[0]);
        if (!keys.includes('week') || !keys.includes('baseName') || !keys.includes('classes')) {
            this.showStatusModal('error', 'โครงสร้างตารางไม่ถูกต้อง', 'ไม่พบคอลัมน์ที่จำเป็นสำหรับตารางหมุนฐานในไฟล์ Excel ที่นำเข้า');
            return;
        }

        // We overwrite schedule with new Excel records
        const newSchedule = [];
        
        rows.forEach(row => {
            newSchedule.push({
                week: parseInt(row.week),
                dates: String(row.dates || ''),
                startDate: String(row.startDate || '2026-05-11'),
                endDate: String(row.endDate || '2026-05-17'),
                baseId: String(row.baseId || 'base1'),
                baseName: String(row.baseName),
                classes: String(row.classes),
                room: String(row.room || 'ห้องเรียน'),
                teacherName: String(row.teacherName || 'ครูผู้สอน'),
                teacherId: String(row.teacherId || 'teacher1'),
                groupIndex: parseInt(row.groupIndex || 0)
            });
        });

        this.db.rotation_schedule = newSchedule;
        this.saveDatabase();
        this.showStatusModal('success', 'นำเข้าตารางเรียนสำเร็จ', `นำเข้าปฏิทินหมุนฐานเรียนสำเร็จจำนวน <strong>${rows.length}</strong> รายการเรียบร้อยแล้ว!`);
        this.renderManageSchedule();
    }

    downloadStudentTemplate() {
        const templateData = [
            { studentId: "25001", name: "เด็กชายสมชาย ใจดี", grade: "ม.2", room: 1, no: 1 },
            { studentId: "25002", name: "เด็กหญิงสมศรี ดีเลิศ", grade: "ม.2", room: 2, no: 2 },
            { studentId: "25003", name: "นายเกรียงไกร รักชาติ", grade: "ม.2", room: 9, no: 3 }
        ];
        const ws = XLSX.utils.json_to_sheet(templateData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Students");
        XLSX.writeFile(wb, "Student_Import_Template.xlsx");
    }

    downloadTeacherTemplate() {
        const templateData = [
            { username: "teacher8", name: "ครูสมหมาย สอนดี", role: "teacher", password: "password123" },
            { username: "deputy3", name: "นายสมศักดิ์ รักเรียน", role: "director", password: "deputy3password" }
        ];
        const ws = XLSX.utils.json_to_sheet(templateData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Teachers");
        XLSX.writeFile(wb, "Teacher_Import_Template.xlsx");
    }

    downloadScheduleTemplate() {
        const templateData = [
            { week: 6, dates: "15 มิ.ย. - 21 มิ.ย. 69", startDate: "2026-06-15", endDate: "2026-06-21", baseId: "base3", baseName: "เงาในน้ำ", classes: "ม.2/1, ม.2/2, ม.2/9", room: "ห้อง 1208", teacherName: "ครูสมชาย เงาดี", teacherId: "teacher3", groupIndex: 1 }
        ];
        const ws = XLSX.utils.json_to_sheet(templateData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Schedule");
        XLSX.writeFile(wb, "Schedule_Import_Template.xlsx");
    }

    backupDatabase() {
        const jsonStr = JSON.stringify(this.db, null, 2);
        const blob = new Blob([jsonStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `sufficiency_economy_db_backup_${this.systemDate}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    restoreDatabase(inputElement) {
        const file = inputElement.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const parsed = JSON.parse(e.target.result);
                if (parsed.students && parsed.teachers && parsed.bases && parsed.rotation_schedule && parsed.attendance_logs) {
                    this.db = parsed;
                    this.saveDatabase();
                    this.showStatusModal('success', 'กู้คืนข้อมูลสำเร็จ', 'ระบบได้กู้คืนฐานข้อมูลจากไฟล์ JSON ที่สำรองไว้เสร็จสมบูรณ์แล้ว!');
                    this.render();
                } else {
                    this.showStatusModal('error', 'กู้คืนข้อมูลไม่สำเร็จ', 'โครงสร้างของไฟล์ JSON สำรองไม่ถูกต้อง ไม่สามารถนำมาใช้งานได้');
                }
            } catch (err) {
                this.showStatusModal('error', 'ไม่สามารถอ่านไฟล์ได้', 'เกิดข้อผิดพลาดในการอ่านไฟล์ JSON กรุณาตรวจสอบว่าไฟล์ไม่เสียหาย');
            }
            inputElement.value = '';
        };
        reader.readAsText(file);
    }

    // Helper: format date to Thai long format
    formatThaiDate(dateStr) {
        const dates = new Date(dateStr);
        if (isNaN(dates)) return dateStr;
        
        const thaiMonths = [
            "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
            "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
        ];
        
        const day = dates.getDate();
        const month = thaiMonths[dates.getMonth()];
        const year = dates.getFullYear() + 543; // to Buddhist Era
        
        return `${day} ${month} พ.ศ. ${year}`;
    }

    // RENDER: Rotation Schedule Matrix Grid view
    renderRotation() {
        const tbody = document.getElementById('rotation-matrix-table-body');
        if (!tbody) return;
        tbody.innerHTML = '';

        const currentWeek = this.currentWeekInfo ? this.currentWeekInfo.week : null;
        const mode = this.rotationViewMode || 'simple';

        // Loop over the 20 weeks
        for (let wk = 1; wk <= 20; wk++) {
            const weekEntries = this.db.rotation_schedule.filter(s => s.week === wk);
            if (weekEntries.length === 0) continue;

            const tr = document.createElement('tr');
            if (wk === currentWeek) {
                tr.className = 'current-week-row';
            }

            const firstEntry = weekEntries[0];
            const isSpecialWeek = weekEntries.some(e => e.isSpecial);

            if (isSpecialWeek) {
                let specialClass = 'week-prep';
                if (firstEntry.classes.includes('สอบ')) {
                    specialClass = 'week-exam';
                }
                
                tr.innerHTML = `
                    <td style="font-weight: 700;">สัปดาห์ที่ ${wk}</td>
                    <td style="font-size: 12px; color: var(--text-secondary);">${firstEntry.dates}</td>
                    <td colspan="7" class="${specialClass}" style="text-align: center; padding: 14px;">
                        ${firstEntry.classes}
                    </td>
                `;
            } else {
                let cellsHTML = `
                    <td style="font-weight: 700;">สัปดาห์ที่ ${wk}</td>
                    <td style="font-size: 12px; color: var(--text-secondary);">${firstEntry.dates}</td>
                `;

                const baseIds = ['base1', 'base2', 'base3', 'base4', 'base5', 'base6', 'base7'];
                baseIds.forEach(bId => {
                    const entry = weekEntries.find(e => e.baseId === bId);
                    if (!entry) {
                        cellsHTML += `<td class="week-empty">-</td>`;
                    } else if (entry.isEmpty) {
                        cellsHTML += `<td class="week-empty">ว่าง</td>`;
                    } else {
                        let gradeLabel = '';
                        if (entry.attendingClasses && entry.attendingClasses.length > 0) {
                            gradeLabel = entry.attendingClasses[0].split('/')[0];
                        } else {
                            const match = entry.classes.match(/ม\.\d/);
                            gradeLabel = match ? match[0] : '';
                        }

                        let colorClass = '';
                        if (gradeLabel === 'ม.1') colorClass = 'grade-m1';
                        else if (gradeLabel === 'ม.2') colorClass = 'grade-m2';
                        else if (gradeLabel === 'ม.3') colorClass = 'grade-m3';
                        else if (gradeLabel === 'ม.4') colorClass = 'grade-m4';
                        else if (gradeLabel === 'ม.5') colorClass = 'grade-m5';
                        else if (gradeLabel === 'ม.6') colorClass = 'grade-m6';

                        let cellContent = '';
                        if (mode === 'simple') {
                            cellContent = gradeLabel || entry.classes;
                        } else {
                            cellContent = `
                                <div style="font-weight: 700; font-size: 13px; margin-bottom: 4px;">${gradeLabel}</div>
                                <div style="font-size: 11px; opacity: 0.95; line-height: 1.3;">${entry.classes}</div>
                            `;
                        }

                        cellsHTML += `<td class="${colorClass}" style="cursor: pointer;" onclick="app.showRotationDetail(${wk}, '${bId}')" title="คลิกเพื่อดูรายละเอียดนักเรียนที่เข้าเรียน">${cellContent}</td>`;
                    }
                });

                tr.innerHTML = cellsHTML;
            }

            tbody.appendChild(tr);
        }
    }

    // Show popup modal for rotation cell detail
    showRotationDetail(weekNum, baseId) {
        // Find rotation entry
        const entry = this.db.rotation_schedule.find(s => s.week === weekNum && s.baseId === baseId);
        if (!entry || entry.isEmpty || entry.isSpecial) return;

        // Fill modal headers
        document.getElementById('rotation-detail-title').textContent = `รายละเอียดผู้เข้าเรียน ${entry.baseName}`;
        document.getElementById('rot-detail-week-dates').textContent = `สัปดาห์ที่ ${weekNum} (${entry.dates})`;
        document.getElementById('rot-detail-base').textContent = entry.baseName;
        document.getElementById('rot-detail-teacher').textContent = entry.teacherName;
        document.getElementById('rot-detail-room').textContent = entry.room;
        document.getElementById('rot-detail-classes').textContent = entry.classes;

        // Build room/class tabs
        const tabContainer = document.getElementById('rot-detail-tabs');
        tabContainer.innerHTML = '';

        const tbody = document.getElementById('rot-detail-student-table-body');
        tbody.innerHTML = '';

        if (!entry.attendingClasses || entry.attendingClasses.length === 0) {
            tabContainer.innerHTML = '<p style="color:var(--text-light); font-size:13px;">ไม่มีชั้นเรียนที่เข้าร่วม</p>';
            document.getElementById('rot-detail-student-count').textContent = '0 คน';
            return;
        }

        // Render tab buttons
        entry.attendingClasses.forEach((clsName, idx) => {
            const btn = document.createElement('button');
            btn.className = `btn btn-sm ${idx === 0 ? 'btn-primary' : 'btn-outline'}`;
            btn.style.whiteSpace = 'nowrap';
            btn.textContent = clsName;
            btn.onclick = () => {
                // Switch active tab style
                const buttons = tabContainer.querySelectorAll('button');
                buttons.forEach(b => {
                    b.classList.remove('btn-primary');
                    b.classList.add('btn-outline');
                });
                btn.classList.add('btn-primary');
                btn.classList.remove('btn-outline');

                // Render student list of this class
                this.renderRotationDetailStudents(clsName);
            };
            tabContainer.appendChild(btn);
        });

        // Load first tab automatically
        this.renderRotationDetailStudents(entry.attendingClasses[0]);

        this.openModal('rotation-detail-modal');
    }

    renderRotationDetailStudents(clsName) {
        const tbody = document.getElementById('rot-detail-student-table-body');
        tbody.innerHTML = '';

        const parts = clsName.split('/');
        const grade = parts[0];
        const room = parseInt(parts[1]);

        // Filter and sort students
        const students = this.db.students.filter(s => s.grade === grade && s.room === room);
        students.sort((a, b) => a.no - b.no);

        document.getElementById('rot-detail-student-count').textContent = `${students.length} คน`;

        if (students.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; color:var(--text-light); padding:16px;">ไม่พบข้อมูลนักเรียนในชั้นเรียนนี้</td></tr>';
            return;
        }

        students.forEach(st => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="text-align: center;">${st.no}</td>
                <td style="font-family:'Outfit'; text-align: center;">${st.studentId}</td>
                <td style="font-weight:600;">${st.name}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    // Export Rotation Matrix to Excel
    exportRotationToExcel() {
        const table = document.getElementById('rotation-matrix-table');
        if (!table) {
            alert("ไม่พบตารางหมุนฐานเพื่อส่งออก!");
            return;
        }

        const wb = XLSX.utils.table_to_book(table, { sheet: "ปฏิทินหมุนฐาน" });
        const fileName = `Rotation_Calendar_${this.systemDate}.xlsx`;
        XLSX.writeFile(wb, fileName);
    }

    // AI OCR: Import Rotation Schedule by Image
    handleImageOcrImport(inputElement) {
        const file = inputElement.files[0];
        if (!file) return;

        this.openModal('ocr-modal');
        
        // Render blank draft first
        this.renderOcrReviewTable(null);

        const statusLabel = document.getElementById('ocr-loading-status');
        const percentLabel = document.getElementById('ocr-loading-percent');
        const progressBar = document.getElementById('ocr-progress-bar');
        const rawTextArea = document.getElementById('ocr-raw-text');
        
        statusLabel.textContent = "กำลังโหลดระบบอ่านเขียนอักษรภาษาไทย AI OCR...";
        percentLabel.textContent = "0%";
        progressBar.style.width = "0%";
        rawTextArea.value = "";

        // Start Tesseract AI Recognition
        Tesseract.recognize(
            file,
            'tha+eng',
            {
                logger: m => {
                    if (m.status === 'recognizing text') {
                        const pct = Math.round(m.progress * 100);
                        statusLabel.textContent = `กำลังประมวลผลรูปภาพและแกะข้อความ (${pct}%)`;
                        percentLabel.textContent = `${pct}%`;
                        progressBar.style.width = `${pct}%`;
                    } else {
                        statusLabel.textContent = "กำลังเริ่มวิเคราะห์ตัวสะกดภาษาไทย...";
                    }
                }
            }
        ).then(({ data: { text } }) => {
            statusLabel.textContent = "ประมวลผลรูปภาพเสร็จสิ้น! กำลังจำแนกปฏิทินรายสัปดาห์...";
            percentLabel.textContent = "100%";
            progressBar.style.width = "100%";
            rawTextArea.value = text;

            // Analyze text to extract schedule draft
            const parsedData = this.parseOcrTextToCalendar(text);
            
            // Render draft to review table
            this.renderOcrReviewTable(parsedData);

            document.getElementById('btn-save-ocr-import').disabled = false;
            statusLabel.innerHTML = "<span style='color:var(--success); font-weight:700;'><i class='fa-solid fa-circle-check'></i> ถอดรหัสตารางเรียนเสร็จสมบูรณ์! กรุณารีวิวตรวจสอบระดับชั้นด้านขวาก่อนกดบันทึก</span>";
        }).catch(err => {
            console.error(err);
            statusLabel.innerHTML = "<span style='color:var(--danger); font-weight:700;'><i class='fa-solid fa-triangle-exclamation'></i> การประมวลผลรูปภาพล้มเหลว กรุณาตรวจสอบคุณภาพรูปภาพแล้วอัปโหลดใหม่อีกครั้ง</span>";
        }).finally(() => {
            inputElement.value = ''; // Reset input element
        });
    }

    // Heuristics parser: scan raw OCR text and map keywords
    parseOcrTextToCalendar(text) {
        const lines = text.split('\n');
        const calendarDraft = {};
        
        // Initialize empty draft for all weeks
        for (let w = 1; w <= 20; w++) {
            calendarDraft[w] = { base1: "", base2: "", base3: "", base4: "", base5: "", base6: "", base7: "" };
        }

        lines.forEach(line => {
            line = line.trim();
            if (!line) return;

            // Search for week indicators (e.g. สัปดาห์ที่ 4, W4, Week 4, 4)
            let weekNum = null;
            const weekMatch = line.match(/^(?:สัปดาห์ที่|สัปดาห์|week|wk|w\.?)\s*(\d+)/i);
            
            if (weekMatch) {
                weekNum = parseInt(weekMatch[1]);
            } else {
                // Match leading numbers for week rows e.g. "5 16 มิ.ย. ม.2 ม.3..."
                const leadingMatch = line.match(/^(\d+)\b/);
                if (leadingMatch) {
                    const num = parseInt(leadingMatch[1]);
                    if (num >= 1 && num <= 20) {
                        weekNum = num;
                    }
                }
            }

            if (weekNum && weekNum >= 1 && weekNum <= 20) {
                // Find all grade keywords matching ม.1-ม.6, M.1-M.6 (with or without spaces/dots) or ว่าง
                const gradeMatches = line.match(/([มM]\.?\s*[1-6]|ว่าง)/g);
                if (gradeMatches && gradeMatches.length > 0) {
                    for (let i = 0; i < Math.min(gradeMatches.length, 7); i++) {
                        let val = gradeMatches[i].replace(/\s+/g, '').replace(/[Mm]/g, 'ม'); // Normalize spaces and M to ม
                        if (val !== "ว่าง") {
                            if (!val.includes('.')) {
                                val = val.replace('ม', 'ม.');
                            }
                        }
                        calendarDraft[weekNum][`base${i+1}`] = val;
                    }
                }
            }
        });

        // Post-parsing heuristic: fill in paired weeks if one of them is empty
        // Since rotation schedule groups weeks in pairs (e.g. W4-5, W6-7, W8-9, etc.)
        const pairs = [
            [4, 5],
            [6, 7],
            [8, 9],
            [12, 13],
            [14, 15],
            [16, 17],
            [18, 19]
        ];
        pairs.forEach(([w1, w2]) => {
            const hasW1 = Object.values(calendarDraft[w1]).some(v => v !== "");
            const hasW2 = Object.values(calendarDraft[w2]).some(v => v !== "");
            
            if (hasW1 && !hasW2) {
                calendarDraft[w2] = { ...calendarDraft[w1] };
            } else if (!hasW1 && hasW2) {
                calendarDraft[w1] = { ...calendarDraft[w2] };
            }
        });

        return calendarDraft;
    }

    // Render review and correction table in ocr modal
    renderOcrReviewTable(parsedData) {
        const tbody = document.getElementById('ocr-preview-table-body');
        if (!tbody) return;
        tbody.innerHTML = '';

        const weekDatesMap = {
            1: "19 พ.ค. - 22 พ.ค. 69 (เตรียมความพร้อม)",
            2: "26 พ.ค. - 29 พ.ค. 69 (นำเสนอสัญจร)",
            3: "2 มิ.ย. - 5 มิ.ย. 69 (เรียน Online)",
            4: "9 มิ.ย. - 12 มิ.ย. 69",
            5: "16 มิ.ย. - 19 มิ.ย. 69",
            6: "23 มิ.ย. - 26 มิ.ย. 69",
            7: "30 มิ.ย. - 3 ก.ค. 69",
            8: "7 ก.ค. - 10 ก.ค. 69",
            9: "14 ก.ค. - 17 ก.ค. 69",
            10: "21 ก.ค. - 24 ก.ค. 69 (สอบกลางภาค)",
            11: "28 ก.ค. - 31 ก.ค. 69 (วันหยุดราชการ)",
            12: "4 ส.ค. - 7 ส.ค. 69",
            13: "11 ส.ค. - 14 ส.ค. 69",
            14: "18 ส.ค. - 21 ส.ค. 69",
            15: "25 ส.ค. - 28 ส.ค. 69",
            16: "1 ก.ย. - 4 ก.ย. 69",
            17: "8 ก.ย. - 11 ก.ย. 69",
            18: "15 ก.ย. - 18 ก.ย. 69",
            19: "22 ก.ย. - 25 ก.ย. 69",
            20: "29 ก.ย. - 2 ต.ค. 69 (สอบปลายภาค)"
        };

        const specialWeeks = [1, 2, 3, 10, 11, 20];

        for (let wk = 1; wk <= 20; wk++) {
            const tr = document.createElement('tr');
            const isSpecial = specialWeeks.includes(wk);
            
            let html = `
                <td style="font-weight: 700; text-align: center;">W${wk}</td>
                <td style="font-size: 11px; color: var(--text-secondary);">${weekDatesMap[wk]}</td>
            `;

            if (isSpecial) {
                let label = "กิจกรรมพิเศษ / เตรียมความพร้อม";
                if (wk === 10) label = "สอบกลางภาค";
                else if (wk === 11) label = "วันหยุดราชการ";
                else if (wk === 20) label = "สอบปลายภาค";
                else if (wk === 3) label = "เรียน Online On-Demand";

                html += `
                    <td colspan="7" class="week-prep" style="text-align: center; font-weight: 600; padding: 4px;">
                        ${label} (ล็อคโดยระบบ)
                    </td>
                `;
            } else {
                for (let b = 1; b <= 7; b++) {
                    const bId = `base${b}`;
                    const val = (parsedData && parsedData[wk]) ? parsedData[wk][bId] : "";
                    
                    html += `
                        <td style="padding: 2px;">
                            <select class="ocr-cell-select" data-week="${wk}" data-base="${bId}" style="width: 100%; padding: 4px; font-size: 12px; font-family: inherit; border-radius: 4px; border: 1px solid var(--border-color);">
                                <option value="" ${val === "" ? "selected" : ""}>-</option>
                                <option value="ม.1" ${val === "ม.1" ? "selected" : ""}>ม.1</option>
                                <option value="ม.2" ${val === "ม.2" ? "selected" : ""}>ม.2</option>
                                <option value="ม.3" ${val === "ม.3" ? "selected" : ""}>ม.3</option>
                                <option value="ม.4" ${val === "ม.4" ? "selected" : ""}>ม.4</option>
                                <option value="ม.5" ${val === "ม.5" ? "selected" : ""}>ม.5</option>
                                <option value="ม.6" ${val === "ม.6" ? "selected" : ""}>ม.6</option>
                                <option value="ว่าง" ${val === "ว่าง" ? "selected" : ""}>ว่าง</option>
                            </select>
                        </td>
                    `;
                }
            }

            tr.innerHTML = html;
            tbody.appendChild(tr);
        }
    }

    // Save reviewed values to rotation_schedule
    saveOcrImportedSchedule() {
        const tbody = document.getElementById('ocr-preview-table-body');
        if (!tbody) return;

        // Predefined week start/end dates
        const weekDates = [
            { week: 1, dates: "19 พฤษภาคม 2569", start: "2026-05-16", end: "2026-05-22", special: "เตรียมความพร้อมครูแกนนำ นักเรียนแกนนำ" },
            { week: 2, dates: "26 พฤษภาคม 2569", start: "2026-05-23", end: "2026-05-29", special: "นำเสนอวิธีการสอน และรูปแบบการสอนของแต่ละฐาน ห้องประชุมธนี พหลโยธิน" },
            { week: 3, dates: "2 มิถุนายน 2569", start: "2026-05-30", end: "2026-06-05", special: "จัดการเรียนการสอนแบบ Online On-Demand" },
            { week: 4, dates: "9 มิถุนายน 2569", start: "2026-06-06", end: "2026-06-12", block: 0, isB: false },
            { week: 5, dates: "16 มิถุนายน 2569", start: "2026-06-13", end: "2026-06-19", block: 0, isB: true },
            { week: 6, dates: "23 มิถุนายน 2569", start: "2026-06-20", end: "2026-06-26", block: 1, isB: false },
            { week: 7, dates: "30 มิถุนายน 2569", start: "2026-06-27", end: "2026-07-03", block: 1, isB: true },
            { week: 8, dates: "7 กรกฎาคม 2569", start: "2026-07-04", end: "2026-07-10", block: 2, isB: false },
            { week: 9, dates: "14 กรกฎาคม 2569", start: "2026-07-11", end: "2026-07-17", block: 2, isB: true },
            { week: 10, dates: "21 กรกฎาคม 2569", start: "2026-07-18", end: "2026-07-24", special: "สอบกลางภาค" },
            { week: 11, dates: "28 กรกฎาคม 2569", start: "2026-07-25", end: "2026-07-31", special: "วันหยุดราชการ" },
            { week: 12, dates: "4 สิงหาคม 2569", start: "2026-08-01", end: "2026-08-07", block: 3, isB: false },
            { week: 13, dates: "11 สิงหาคม 2569", start: "2026-08-08", end: "2026-08-14", block: 3, isB: true },
            { week: 14, dates: "18 สิงหาคม 2569", start: "2026-08-15", end: "2026-08-21", block: 4, isB: false },
            { week: 15, dates: "25 สิงหาคม 2569", start: "2026-08-22", end: "2026-08-28", block: 4, isB: true },
            { week: 16, dates: "1 กันยายน 2569", start: "2026-08-29", end: "2026-09-04", block: 5, isB: false },
            { week: 17, dates: "8 กันยายน 2569", start: "2026-09-05", end: "2026-09-11", block: 5, isB: true },
            { week: 18, dates: "15 กันยายน 2569", start: "2026-09-12", end: "2026-09-18", block: 6, isB: false },
            { week: 19, dates: "22 กันยายน 2569", start: "2026-09-19", end: "2026-09-25", block: 6, isB: true },
            { week: 20, dates: "29 กันยายน 2569", start: "2026-09-26", end: "2026-10-02", special: "สอบปลายภาค" }
        ];

        const newSchedule = [];

        // Loop weeks 1 to 20
        for (let wk = 1; wk <= 20; wk++) {
            const wInfo = weekDates.find(w => w.week === wk);
            if (!wInfo) continue;

            if (wInfo.special) {
                // Special week (midterm, prep, etc.)
                this.db.bases.forEach(b => {
                    newSchedule.push({
                        week: wk,
                        dates: wInfo.dates,
                        startDate: wInfo.start,
                        endDate: wInfo.end,
                        baseId: b.id,
                        baseName: b.name,
                        classes: wInfo.special,
                        attendingClasses: [],
                        classRooms: {},
                        room: b.defaultRoom,
                        teacherName: b.defaultTeacher || "-",
                        teacherId: b.teacherId || "",
                        isSpecial: true
                    });
                });
            } else {
                // Normal rotation week
                for (let bIdx = 0; bIdx < 7; bIdx++) {
                    const b = this.db.bases[bIdx] || { id: `base${bIdx+1}`, name: `ฐาน ${bIdx+1}`, defaultRoom: "-" };
                    
                    // Get grade from select input
                    const select = tbody.querySelector(`select[data-week="${wk}"][data-base="${b.id}"]`);
                    const grade = select ? select.value : "";

                    if (!grade || grade === "ว่าง") {
                        newSchedule.push({
                            week: wk,
                            dates: wInfo.dates,
                            startDate: wInfo.start,
                            endDate: wInfo.end,
                            baseId: b.id,
                            baseName: b.name,
                            classes: "ว่าง (ไม่มีการจัดเรียน)",
                            attendingClasses: [],
                            classRooms: {},
                            room: "-",
                            teacherName: b.defaultTeacher || "-",
                            teacherId: b.teacherId || "",
                            isEmpty: true
                        });
                    } else {
                        // Resolve classroom and room assignments using our helper
                        const classData = this.getClassesForBaseAndGrade(b.id, grade, wInfo.isB);
                        const mainRoom = Object.values(classData.classRooms)[0] || b.defaultRoom;

                        newSchedule.push({
                            week: wk,
                            dates: wInfo.dates,
                            startDate: wInfo.start,
                            endDate: wInfo.end,
                            baseId: b.id,
                            baseName: b.name,
                            classes: classData.classesLabel,
                            attendingClasses: classData.classes,
                            classRooms: classData.classRooms,
                            room: mainRoom,
                            teacherName: b.defaultTeacher || "-",
                            teacherId: b.teacherId || ""
                        });
                    }
                }
            }
        }

        // Save to database
        this.db.rotation_schedule = newSchedule;
        this.saveDatabase();

        this.closeModal('ocr-modal');
        this.showStatusModal('success', 'นำเข้าตารางเรียนสำเร็จ', `ถอดรหัสและบันทึกปฏิทินหมุนฐานเรียนจำนวน <strong>${newSchedule.length}</strong> รายการเรียบร้อยแล้ว!`);

        // Refresh manage schedule table if currently viewing it
        if (this.currentView === 'manage') {
            this.renderManage();
        }
    }

    // Helper to get room-specific teachers for Base 5
    getRoomTeachers(roomName) {
        if (roomName === "ห้อง 1105") {
            return "ครูสัมฤทธิ์ ไชยทารินทร์, นางดวงสุดา เรืองวุฒิ, ครูพัทยา ยะมะโน";
        }
        if (roomName === "ห้อง 1103") {
            return "ครูศิวพร รุ่งเรือง, นางสาวเพชรดารินทร์ เดชชลธี, นางสาวปาริชาติ แก้วศักดิ์";
        }
        if (roomName === "ห้องคหกรรม") {
            return "นางสาวเจนประภา เรือนคำ, นายก้องภพ มูลศรี, นางสาวธัญชนก พงษ์ศรี";
        }
        return "";
    }

    // Helper to map classrooms to bases dynamically
    getClassesForBaseAndGrade(baseId, grade, isWeekB) {
        const allGradeClasses = {
            "ม.1": ["ม.1/1", "ม.1/2", "ม.1/3", "ม.1/4", "ม.1/5", "ม.1/6", "ม.1/7", "ม.1/8", "ม.1/9"],
            "ม.2": ["ม.2/1", "ม.2/2", "ม.2/3", "ม.2/4", "ม.2/5", "ม.2/6", "ม.2/7", "ม.2/8", "ม.2/9"],
            "ม.3": ["ม.3/1", "ม.3/2", "ม.3/3", "ม.3/4", "ม.3/5", "ม.3/6", "ม.3/7", "ม.3/8"],
            "ม.4": ["ม.4/1", "ม.4/2", "ม.4/3", "ม.4/4", "ม.4/5", "ม.4/6", "ม.4/7"],
            "ม.5": ["ม.5/1", "ม.5/2", "ม.5/3", "ม.5/4", "ม.5/5", "ม.5/6"],
            "ม.6": ["ม.6/1", "ม.6/2", "ม.6/3", "ม.6/4", "ม.6/5", "ม.6/6"]
        };

        if (baseId === 'base1') { // ไฟเบอร์ ทรงพลัง
            const cls = allGradeClasses[grade] || [];
            const rooms = {};
            cls.forEach(c => { rooms[c] = "หอประชุมพุทธรักษา"; });
            return {
                classes: cls,
                classRooms: rooms,
                classesLabel: `${grade} (หอประชุมพุทธรักษา)`
            };
        }

        if (baseId === 'base7') { // หลู่ล่างกานเครือ เกื้อบุญ
            const cls = allGradeClasses[grade] || [];
            const rooms = {};
            cls.forEach(c => { rooms[c] = "หอประชุมศุภเมธี"; });
            return {
                classes: cls,
                classRooms: rooms,
                classesLabel: `${grade} (หอประชุมศุภเมธี)`
            };
        }

        const group1 = [];
        const group2 = [];
        const group3 = [];
        const group4 = [];
        
        if (grade === 'ม.1' || grade === 'ม.2') {
            group1.push(`${grade}/1`, `${grade}/9`);
            group2.push(`${grade}/2`, `${grade}/3`, `${grade}/4`);
            group3.push(`${grade}/5`, `${grade}/6`);
            group4.push(`${grade}/7`, `${grade}/8`);
        } else if (grade === 'ม.3') {
            group1.push(`${grade}/1`, `${grade}/8`);
            group2.push(`${grade}/2`, `${grade}/3`, `${grade}/4`);
            group3.push(`${grade}/5`, `${grade}/6`);
            group4.push(`${grade}/7`);
        } else if (grade === 'ม.4' || grade === 'ม.5' || grade === 'ม.6') {
            if (grade === 'ม.4') {
                group1.push("ม.4/1", "ม.4/7");
                group2.push("ม.4/2", "ม.4/5", "ม.4/6");
                group3.push("ม.4/3", "ม.4/4");
            } else {
                group1.push(`${grade}/1`, `${grade}/6`);
                group2.push(`${grade}/2`, `${grade}/5`);
                group3.push(`${grade}/3`, `${grade}/4`);
            }
        }

        const classesList = [];
        const classRooms = {};
        let roomA = '', roomB = '', roomC = '', roomD = '';

        const isJunior = (grade === 'ม.1' || grade === 'ม.2' || grade === 'ม.3');

        if (baseId === 'base2') { // อาณาจักรอักษร
            roomA = "ห้อง 2206";
            roomB = "ห้องสมุด";
            roomC = "ห้อง 2202-2203";
            roomD = "ห้อง 2204-2205";
            if (!isJunior) {
                roomA = "ห้อง 2202-2203";
                roomB = "ห้องสมุด";
                roomC = "ห้อง 2204-2205";
                roomD = "";
            }
        } else if (baseId === 'base3') { // เงาในน้ำ
            roomA = "ห้อง 1208";
            roomB = "ห้อง 1201";
            roomC = "ห้อง 1203-1204";
            roomD = isJunior ? (grade === 'ม.3' ? "ห้อง 1205" : "ห้อง 1205-1206") : "";
        } else if (baseId === 'base4') { // ไก่ไข่อารมณ์ดี
            roomA = "ห้อง 2101";
            roomB = "ห้อง 2201";
            roomC = "ห้อง 2102-2103";
            roomD = isJunior ? (grade === 'ม.3' ? "ห้อง 2104" : "ห้อง 2104-2105") : "";
        } else if (baseId === 'base5') { // หรรษาสุธารสเห็ด
            roomA = "ห้อง 1103";
            roomB = "ห้องคหกรรม";
            roomC = "ห้อง 1105";
            roomD = isJunior ? "ห้อง 1103" : "";
        } else if (baseId === 'base6') { // ต้นกล้าประชาธิปไตย
            roomA = isJunior ? "ห้อง 2306" : "ห้อง 2301";
            roomB = "ห้องประชุมธนี พหลโยธิน";
            roomC = "ห้องคอมพิวเตอร์ 1 4101";
            roomD = isJunior ? "ห้อง 2301" : "";
        }

        if (!isWeekB) {
            classesList.push(...group1, ...group2);
            group1.forEach(c => { classRooms[c] = roomA; });
            group2.forEach(c => { classRooms[c] = roomB; });
        } else {
            classesList.push(...group3, ...group4);
            group3.forEach(c => { classRooms[c] = roomC; });
            group4.forEach(c => { classRooms[c] = roomD; });
        }

        let label = '';
        if (!isWeekB) {
            label = `${group1.join(', ')} (${roomA}) | ${group2.join(', ')} (${roomB})`;
        } else {
            if (group4.length > 0) {
                label = `${group3.join(', ')} (${roomC}) | ${group4.join(', ')} (${roomD})`;
            } else {
                label = `${group3.join(', ')} (${roomC})`;
            }
        }

        return {
            classes: classesList,
            classRooms: classRooms,
            classesLabel: label
        };
    }

    
    showStatusModal(type, title, message) {
        const modal = document.getElementById('status-modal');
        if (!modal) return;

        const iconContainer = document.getElementById('status-modal-icon');
        const titleContainer = document.getElementById('status-modal-title');
        const messageContainer = document.getElementById('status-modal-message');

        titleContainer.textContent = title;
        messageContainer.innerHTML = message;

        if (type === 'success') {
            iconContainer.innerHTML = '<i class="fa-solid fa-circle-check" style="color: var(--success); filter: drop-shadow(0 4px 6px rgba(76, 175, 80, 0.2));"></i>';
        } else if (type === 'error') {
            iconContainer.innerHTML = '<i class="fa-solid fa-circle-xmark" style="color: var(--danger); filter: drop-shadow(0 4px 6px rgba(239, 68, 68, 0.2));"></i>';
        } else if (type === 'warning') {
            iconContainer.innerHTML = '<i class="fa-solid fa-circle-exclamation" style="color: var(--warning); filter: drop-shadow(0 4px 6px rgba(255, 193, 7, 0.2));"></i>';
        }

        this.openModal('status-modal');
    }

generateDefaultRotationSchedule(customBases = null) {
        const rotation_schedule = [];
        const weekDates = [
            { week: 1, dates: "19 พฤษภาคม 2569", start: "2026-05-16", end: "2026-05-22", special: "เตรียมความพร้อมครูแกนนำ นักเรียนแกนนำ" },
            { week: 2, dates: "26 พฤษภาคม 2569", start: "2026-05-23", end: "2026-05-29", special: "นำเสนอวิธีการสอน และรูปแบบการสอนของแต่ละฐาน ห้องประชุมธนี พหลโยธิน" },
            { week: 3, dates: "2 มิถุนายน 2569", start: "2026-05-30", end: "2026-06-05", special: "จัดการเรียนการสอนแบบ Online On-Demand" },
            { week: 4, dates: "9 มิถุนายน 2569", start: "2026-06-06", end: "2026-06-12", block: 0, isB: false },
            { week: 5, dates: "16 มิถุนายน 2569", start: "2026-06-13", end: "2026-06-19", block: 0, isB: true },
            { week: 6, dates: "23 มิถุนายน 2569", start: "2026-06-20", end: "2026-06-26", block: 1, isB: false },
            { week: 7, dates: "30 มิถุนายน 2569", start: "2026-06-27", end: "2026-07-03", block: 1, isB: true },
            { week: 8, dates: "7 กรกฎาคม 2569", start: "2026-07-04", end: "2026-07-10", block: 2, isB: false },
            { week: 9, dates: "14 กรกฎาคม 2569", start: "2026-07-11", end: "2026-07-17", block: 2, isB: true },
            { week: 10, dates: "21 กรกฎาคม 2569", start: "2026-07-18", end: "2026-07-24", special: "สอบกลางภาค" },
            { week: 11, dates: "28 กรกฎาคม 2569", start: "2026-07-25", end: "2026-07-31", special: "วันหยุดราชการ" },
            { week: 12, dates: "4 สิงหาคม 2569", start: "2026-08-01", end: "2026-08-07", block: 3, isB: false },
            { week: 13, dates: "11 สิงหาคม 2569", start: "2026-08-08", end: "2026-08-14", block: 3, isB: true },
            { week: 14, dates: "18 สิงหาคม 2569", start: "2026-08-15", end: "2026-08-21", block: 4, isB: false },
            { week: 15, dates: "25 สิงหาคม 2569", start: "2026-08-22", end: "2026-08-28", block: 4, isB: true },
            { week: 16, dates: "1 กันยายน 2569", start: "2026-08-29", end: "2026-09-04", block: 5, isB: false },
            { week: 17, dates: "8 กันยายน 2569", start: "2026-09-05", end: "2026-09-11", block: 5, isB: true },
            { week: 18, dates: "15 กันยายน 2569", start: "2026-09-12", end: "2026-09-18", block: 6, isB: false },
            { week: 19, dates: "22 กันยายน 2569", start: "2026-09-19", end: "2026-09-25", block: 6, isB: true },
            { week: 20, dates: "29 กันยายน 2569", start: "2026-09-26", end: "2026-10-02", special: "สอบปลายภาค" }
        ];

        const grades = ["ม.1", "ม.2", "ม.3", "ม.4", "ม.5", "ม.6", "ว่าง"];
        const bases = customBases || this.db.bases;

        weekDates.forEach((w) => {
            if (w.special) {
                bases.forEach(b => {
                    rotation_schedule.push({
                        week: w.week,
                        dates: w.dates,
                        startDate: w.start,
                        endDate: w.end,
                        baseId: b.id,
                        baseName: b.name,
                        classes: w.special,
                        attendingClasses: [],
                        classRooms: {},
                        room: b.defaultRoom || "-",
                        teacherName: b.defaultTeacher || "-",
                        teacherId: b.teacherId || "",
                        isSpecial: true
                    });
                });
            } else {
                for (let bIdx = 0; bIdx < 7; bIdx++) {
                    const b = bases[bIdx];
                    const gIdx = (bIdx - w.block + 7) % 7;
                    const grade = grades[gIdx];

                    if (grade === "ว่าง") {
                        rotation_schedule.push({
                            week: w.week,
                            dates: w.dates,
                            startDate: w.start,
                            endDate: w.end,
                            baseId: b.id,
                            baseName: b.name,
                            classes: "ว่าง (ไม่มีการจัดเรียน)",
                            attendingClasses: [],
                            classRooms: {},
                            room: "-",
                            teacherName: b.defaultTeacher || "-",
                            teacherId: b.teacherId || "",
                            isEmpty: true
                        });
                    } else {
                        const classData = this.getClassesForBaseAndGrade(b.id, grade, w.isB);
                        const mainRoom = Object.values(classData.classRooms)[0] || b.defaultRoom || "-";

                        rotation_schedule.push({
                            week: w.week,
                            dates: w.dates,
                            startDate: w.start,
                            endDate: w.end,
                            baseId: b.id,
                            baseName: b.name,
                            classes: classData.classesLabel,
                            attendingClasses: classData.classes,
                            classRooms: classData.classRooms,
                            room: mainRoom,
                            teacherName: b.defaultTeacher || "-",
                            teacherId: b.teacherId || ""
                        });
                    }
                }
            }
        });

        return rotation_schedule;
    }
}

// Global App Instance
let app;
window.addEventListener('DOMContentLoaded', () => {
    app = new AttendanceApp();
});
