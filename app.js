// Pai Wittyakarn School Student Attendance App - Core Engine

class AttendanceApp {
    constructor() {
        this.db = {};
        this.currentUser = null;
        this.currentView = 'dashboard';
        this.manageTab = 'students';
        
        // Initialize simulated system date to current real local date dynamically
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        this.systemDate = `${year}-${month}-${day}`;

        this.studentPage = 1;
        this.pageSize = 15;
        this.selectedStudents = [];
        this.selectedTeachers = [];
        
        // Active Charts
        this.dashChart = null;
        this.adminChart = null;

        // Firestore properties
        this.useFirestore = false;
        this.firestore = null;
        this.firestoreNetworkError = false;

        // Initialize App
        this.init();
    }

    // Initialize databases and bindings
    async init() {
        try {
            // Register Service Worker for PWA Add-to-Home-Screen support
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.register('./sw.js')
                    .then(reg => {
                        console.log('Service Worker registered successfully:', reg.scope);
                        // Check for updates
                        reg.onupdatefound = () => {
                            const installingWorker = reg.installing;
                            if (installingWorker) {
                                installingWorker.onstatechange = () => {
                                    if (installingWorker.state === 'installed') {
                                        if (navigator.serviceWorker.controller) {
                                            // New content is available; show update notification
                                            this.showVersionUpdateBanner();
                                        }
                                    }
                                };
                            }
                        };
                    })
                    .catch(err => console.error('Service Worker registration failed:', err));
            }

            // Initialize Firestore
            this.initFirestore();

            // 1. Load database from LocalStorage first (non-blocking)
            this.loadDatabaseFromLocalStorage();

            // 2. Bind DOM Events
            this.bindEvents();
            this.setupLoginAutoComplete();

            // 3. Sync Simulator Date
            document.getElementById('system-date-input').value = this.systemDate;

            // 4. Load Current User Session
            this.loadSession();

            // 5. Render active view
            this.render();

            // Sync Staging Badge Count
            this.updateStagingBadgeCount();

            // Hide loading screen immediately for instant startup
            const loadingScreen = document.getElementById('app-loading-screen');
            if (loadingScreen) {
                loadingScreen.classList.add('fade-out');
                setTimeout(() => {
                    loadingScreen.remove();
                }, 500);
            }

            // 6. Sync with Firebase in the background
            if (this.useFirestore) {
                this.syncFirebaseUser();
                this.loadDatabaseFromCloudInBackground();
                this.checkNightlyBackup();
                this.loadCloudBackups();
                this.loadAuditLogs();
            }
        } catch (e) {
            console.error("Initialization error:", e);
        }
    }

    initFirestore() {
        const firebaseConfig = {
            apiKey: "AIzaSyB9hRPPPtHEDqlMTERb90q0pi64TpPLyrU",
            authDomain: "paiwittyakarn-attendance.firebaseapp.com",
            projectId: "paiwittyakarn-attendance",
            storageBucket: "paiwittyakarn-attendance.firebasestorage.app",
            messagingSenderId: "413992897747",
            appId: "1:413992897747:web:377441843a83e56f5f1826",
            measurementId: "G-RW7F1RM7VM"
        };

        if (firebaseConfig.apiKey === "PLACEHOLDER_FIREBASE_API_KEY") {
            this.useFirestore = false;
            console.log("Firebase placeholder keys detected, using LocalStorage.");
            return;
        }

        try {
            if (firebase.apps.length === 0) {
                firebase.initializeApp(firebaseConfig);
            }
            this.firestore = firebase.firestore();
            this.useFirestore = true;
            console.log("Firebase Firestore initialized successfully.");

            // Enable offline persistence for faster subsequent loads (wrapped in try/catch for Samsung/private mode compatibility)
            try {
                this.firestore.enablePersistence()
                    .catch(err => {
                        console.warn("Firestore persistence error:", err.code);
                    });
            } catch (persistErr) {
                console.warn("Firestore enablePersistence crashed synchronously:", persistErr);
            }

            // Set Auth persistence explicitly to LOCAL (with safety wrappers)
            try {
                firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL)
                    .catch(err => {
                        console.warn("Firebase Auth setPersistence error:", err);
                    });
            } catch (authPersistErr) {
                console.warn("Firebase Auth setPersistence crashed synchronously:", authPersistErr);
            }

            // Listen for Firebase Auth state changes (does not forcefully log out anymore to separate Authn and Authz)
            firebase.auth().onAuthStateChanged(user => {
                if (user) {
                    this.syncFirebaseUser();
                } else {
                    console.log("[Firebase Auth] State: No active cloud session / Offline");
                }
            });
        } catch (e) {
            console.error("Error initializing Firebase:", e);
            this.useFirestore = false;
        }
    }

    syncFirebaseUser() {
        if (!this.useFirestore) return;
        const user = firebase.auth().currentUser;
        if (user && this.db.teachers) {
            const username = user.email.split('@')[0];
            const dbUser = this.db.teachers.find(t => t.username === username);
            if (dbUser) {
                const prevUser = this.currentUser;
                this.currentUser = dbUser;
                sessionStorage.setItem('school_current_user', JSON.stringify(dbUser));
                localStorage.setItem('school_current_user', JSON.stringify(dbUser));
                this.updateUserUI();
                if (!prevUser) {
                    this.render();
                }
            }
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
        // Sync warning badge status
        this.updateOfflineSyncWarning(false);
    }

    updateOfflineSyncWarning(hasPending) {
        const badge = document.getElementById('unsynced-warning-badge');
        if (badge) {
            const textEl = badge.querySelector('span');
            const btn = badge.querySelector('button');
            const iconEl = badge.querySelector('i');
            
            const isOffline = !navigator.onLine;
            const isNetworkError = this.firestoreNetworkError;
            const isNotConnected = !this.useFirestore;

            if (hasPending || isOffline || isNetworkError || isNotConnected) {
                badge.style.display = 'flex';
                
                if (isOffline) {
                    // Orange offline style
                    badge.style.background = 'linear-gradient(135deg, #FF8C00 0%, #FF6F00 100%)';
                    if (iconEl) iconEl.className = 'fa-solid fa-triangle-exclamation';
                    if (textEl) textEl.textContent = 'ระบบอยู่ในโหมดออฟไลน์ (ไม่มีอินเทอร์เน็ต) ข้อมูลจะบันทึกที่เครื่องและซิงค์เมื่อออนไลน์';
                    if (btn) btn.style.display = 'none';
                } else if (isNetworkError) {
                    // Orange network error style
                    badge.style.background = 'linear-gradient(135deg, #FF8C00 0%, #FF6F00 100%)';
                    if (iconEl) iconEl.className = 'fa-solid fa-triangle-exclamation';
                    if (textEl) textEl.textContent = 'ไม่ได้เชื่อมต่อคลาวด์ (ปัญหาเครือข่าย) ข้อมูลจะบันทึกที่เครื่องและซิงค์เมื่อออนไลน์';
                    if (btn) btn.style.display = 'flex';
                } else if (hasPending) {
                    // Orange unsynced writes style
                    badge.style.background = 'linear-gradient(135deg, #FF8C00 0%, #FF6F00 100%)';
                    if (iconEl) iconEl.className = 'fa-solid fa-triangle-exclamation';
                    if (textEl) textEl.textContent = 'มีข้อมูลเช็กชื่อค้างอยู่ในเครื่องยังไม่ได้ซิงค์ขึ้นคลาวด์ กรุณาอย่าปิดแอปหรือล้างประวัติเบราว์เซอร์';
                    if (btn) btn.style.display = 'none';
                } else if (isNotConnected) {
                    // Blue connecting style for slow network
                    badge.style.background = 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)';
                    if (iconEl) iconEl.className = 'fa-solid fa-spinner fa-spin';
                    if (textEl) textEl.textContent = 'กำลังเชื่อมต่อ...';
                    if (btn) btn.style.display = 'none';
                }
            } else {
                badge.style.display = 'none';
            }
        }
    }

    async tryReconnectCloud(event) {
        if (event) event.stopPropagation();

        const btn = document.querySelector('#unsynced-warning-badge button');
        if (!btn) return;
        const originalHtml = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> กำลังเชื่อมต่อ...';

        try {
            console.log("Forcing cloud reconnection attempt...");
            if (!this.firestore && typeof firebase !== 'undefined') {
                this.initFirestore();
            }
            
            if (this.firestore) {
                this.useFirestore = true;
                
                // Force a query to Firestore to check if it actually connects (timeout in 3.5 seconds)
                const checkPromise = this.firestore.collection('system_data').doc('bases').get();
                const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error("Connection timeout")), 3500)
                );
                
                await Promise.race([checkPromise, timeoutPromise]);
                
                // Connection successful! Reload database
                await this.loadDatabase();
                this.updateFirestoreConnectionStatus(true);
                this.render();
                
                // Show success notification
                this.showStatusModal('success', 'เชื่อมต่อคลาวด์สำเร็จ', 'ระบบเชื่อมต่อกับ Firebase Firestore เรียบร้อยแล้ว ข้อมูลจะอัปเดตแบบเรียลไทม์!');
            } else {
                throw new Error("Firebase SDK not loaded");
            }
        } catch (err) {
            console.error("Cloud reconnection failed:", err);
            this.useFirestore = false;
            this.updateFirestoreConnectionStatus(false);
            alert("ไม่สามารถเชื่อมต่อคลาวด์ได้ในขณะนี้: " + (err.message === "Connection timeout" ? "การเชื่อมต่อหมดเวลา (เครือข่ายช้า)" : err.message));
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalHtml;
        }
    }

    async tryReconnectCloudFromLogin(event) {
        if (event) event.preventDefault();
        
        try {
            console.log("Login Modal: Reconnect attempt initiated...");
            if (!this.firestore && typeof firebase !== 'undefined') {
                this.initFirestore();
            }
            
            if (this.firestore) {
                this.useFirestore = true;
                
                // Force a query to Firestore to check if it actually connects (timeout in 6 seconds)
                const checkPromise = this.firestore.collection('system_data').doc('bases').get();
                const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error("Connection timeout")), 6000)
                );
                
                await Promise.race([checkPromise, timeoutPromise]);
                
                // Connection successful! Reload database with a 15-second timeout
                await this.loadDatabase(20000);
                this.updateFirestoreConnectionStatus(true);
                this.render();
                
                alert("เชื่อมต่อคลาวด์สำเร็จ! ฐานข้อมูลอัปเดตเป็นปัจจุบันเรียบร้อยแล้ว");
            } else {
                throw new Error("Firebase SDK not loaded");
            }
        } catch (err) {
            console.error("Cloud reconnection from login failed:", err);
            this.useFirestore = false;
            this.updateFirestoreConnectionStatus(false);
            alert("ไม่สามารถเชื่อมต่อคลาวด์ได้: " + (err.message === "Connection timeout" ? "การเชื่อมต่อหมดเวลา (เน็ตช้า)" : err.message));
        }
    }

    clearSystemCache(event) {
        if (event) event.preventDefault();
        
        const confirmClear = confirm("คุณต้องการล้างแคชระบบใช่หรือไม่?\nการล้างแคชจะทำการเคลียร์ข้อมูลชั่วคราวในเครื่อง และรีโหลดหน้าเว็บใหม่เพื่อดาวน์โหลดระบบล่าสุดจากเซิร์ฟเวอร์");
        if (!confirmClear) return;
        
        try {
            // 1. Clear storage
            localStorage.clear();
            sessionStorage.clear();
            
            // 2. Unregister service workers
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistrations().then(registrations => {
                    for (let registration of registrations) {
                        registration.unregister();
                    }
                }).catch(err => console.error("Error unregistering service worker:", err));
            }

            // 3. Clear Cache Storage
            if ('caches' in window) {
                caches.keys().then(names => {
                    for (let name of names) {
                        caches.delete(name);
                    }
                }).catch(err => console.error("Error clearing cache storage:", err));
            }
            
            alert("ล้างแคชระบบสำเร็จ! ระบบจะทำการรีโหลดหน้าเว็บใหม่");
            window.location.reload(true); // Force reload from server
        } catch (e) {
            console.error("Error clearing cache:", e);
            alert("เกิดข้อผิดพลาดในการล้างแคช: " + e.message);
        }
    }

    showVersionUpdateBanner() {
        // Prevent duplicate banners
        if (document.getElementById('version-update-banner')) return;

        const banner = document.createElement('div');
        banner.id = 'version-update-banner';
        banner.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%) translateY(-100px);
            background: linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%);
            color: white;
            padding: 16px 24px;
            border-radius: var(--radius-md);
            box-shadow: 0 10px 25px rgba(0,0,0,0.15);
            z-index: 10000;
            display: flex;
            align-items: center;
            gap: 16px;
            font-family: inherit;
            font-weight: 500;
            transition: transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        `;

        banner.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
                <i class="fa-solid fa-cloud-arrow-down fa-bounce" style="font-size: 20px;"></i>
                <span>ตรวจพบเวอร์ชันใหม่พร้อมใช้งาน!</span>
            </div>
            <div style="display: flex; gap: 8px;">
                <button id="btn-update-reload" style="
                    background: white;
                    color: var(--primary);
                    border: none;
                    padding: 6px 16px;
                    border-radius: var(--radius-sm);
                    cursor: pointer;
                    font-weight: 600;
                    font-size: 13px;
                    box-shadow: var(--shadow-sm);
                    transition: all 0.2s;
                ">อัปเดตทันที</button>
                <button id="btn-update-close" style="
                    background: rgba(255,255,255,0.2);
                    color: white;
                    border: none;
                    padding: 6px 12px;
                    border-radius: var(--radius-sm);
                    cursor: pointer;
                    font-size: 13px;
                    transition: all 0.2s;
                ">ภายหลัง</button>
            </div>
        `;

        document.body.appendChild(banner);

        // Slide down animation
        setTimeout(() => {
            banner.style.transform = 'translateX(-50%) translateY(0)';
        }, 100);

        // Bind events
        document.getElementById('btn-update-reload').addEventListener('click', () => {
            window.location.reload(true);
        });
        document.getElementById('btn-update-close').addEventListener('click', () => {
            banner.style.transform = 'translateX(-50%) translateY(-100px)';
            setTimeout(() => banner.remove(), 500);
        });
    }

    async getDocWithCacheFallback(docRef) {
        try {
            // Try fetching from server first with a 3-second timeout
            const serverPromise = docRef.get({ source: 'server' });
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error("Server timeout")), 3000)
            );
            return await Promise.race([serverPromise, timeoutPromise]);
        } catch (e) {
            console.log(`[Firestore Cache Fallback] Reading ${docRef.id} from local cache due to slow connection / error:`, e.message);
            try {
                return await docRef.get({ source: 'cache' });
            } catch (cacheErr) {
                console.error("[Firestore Cache Fallback] Failed to read from cache:", cacheErr);
                throw cacheErr;
            }
        }
    }

    async getCollectionWithCacheFallback(colRef) {
        try {
            // Try fetching from server first with a 3-second timeout
            const serverPromise = colRef.get({ source: 'server' });
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error("Server timeout")), 3000)
            );
            return await Promise.race([serverPromise, timeoutPromise]);
        } catch (e) {
            console.log(`[Firestore Cache Fallback] Reading collection ${colRef.id} from local cache due to slow connection / error:`, e.message);
            try {
                return await colRef.get({ source: 'cache' });
            } catch (cacheErr) {
                console.error("[Firestore Cache Fallback] Failed to read collection from cache:", cacheErr);
                throw cacheErr;
            }
        }
    }

    // Check localStorage, if empty seed dummy data
    // Check localStorage, if empty seed dummy data
    async loadDatabase(timeoutMs = 20000) {
        if (this.useFirestore) {
            try {
                const collections = ['students', 'teachers', 'bases', 'rotation_schedule', 'semesters', 'activeSemesterId'];
                const loadedDb = {};
                let hasData = true;

                if (this.logsUnsubscribe) {
                    this.logsUnsubscribe();
                    this.logsUnsubscribe = null;
                }

                const docPromises = collections.map(col => {
                    const docRef = this.firestore.collection('system_data').doc(col);
                    return this.getDocWithCacheFallback(docRef);
                });

                // Parallel fetches for collections
                const baseActPromise = this.getCollectionWithCacheFallback(this.firestore.collection('base_activity_logs'));
                const stagingPromise = this.getCollectionWithCacheFallback(this.firestore.collection('staging_logs'));

                // Set up onSnapshot listener inside a Promise for the initial data
                let initialLogsReceived = false;
                let logsResolve;
                const logsPromise = new Promise((resolve) => {
                    logsResolve = resolve;
                });

                this.logsUnsubscribe = this.firestore.collection('attendance_logs').onSnapshot({ includeMetadataChanges: true }, (snapshot) => {
                    const updatedLogs = snapshot.docs.map(doc => doc.data());
                    if (this.db) {
                        this.db.attendance_logs = updatedLogs;
                        localStorage.setItem('school_attendance_logs', JSON.stringify(updatedLogs));
                        
                        if (initialLogsReceived) {
                            console.log("Real-time attendance logs updated from Firestore!");
                            this.render();
                        }
                    }
                    
                    const hasPending = snapshot.metadata.hasPendingWrites;
                    this.firestoreNetworkError = false;
                    this.updateOfflineSyncWarning(hasPending);
                    this.updateFirestoreConnectionStatus(true);

                    if (!initialLogsReceived) {
                        initialLogsReceived = true;
                        logsResolve(snapshot);
                    }
                }, (error) => {
                    console.error("Firestore onSnapshot error for logs:", error);
                    this.firestoreNetworkError = true;
                    this.updateOfflineSyncWarning(false);
                    if (!initialLogsReceived) {
                        initialLogsReceived = true;
                        logsResolve(null);
                    }
                });

                // Run them all concurrently
                const allPromises = [
                    Promise.all(docPromises),
                    baseActPromise,
                    stagingPromise,
                    logsPromise
                ];

                const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error("Firestore fetch timeout")), timeoutMs)
                );

                const [docResults, baseActSnapshot, stagingSnapshot, logsSnapshot] = await Promise.race([
                    Promise.all(allPromises),
                    timeoutPromise
                ]);

                for (let i = 0; i < collections.length; i++) {
                    const doc = docResults[i];
                    if (doc && doc.exists) {
                        if (collections[i] === 'activeSemesterId') {
                            loadedDb['activeSemesterId'] = doc.data().data?.id || "1-2569";
                        } else {
                            loadedDb[collections[i]] = doc.data().data || [];
                        }
                    } else {
                        hasData = false;
                        break;
                    }
                }

                if (hasData) {
                    loadedDb['attendance_logs'] = logsSnapshot ? logsSnapshot.docs.map(doc => doc.data()) : [];
                    loadedDb['base_activity_logs'] = baseActSnapshot ? baseActSnapshot.docs.map(doc => doc.data()) : [];
                    loadedDb['staging_logs'] = stagingSnapshot ? stagingSnapshot.docs.map(doc => doc.data()) : [];

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
        
        this.loadDatabaseFromLocalStorage();
        this.populateLoginSuggestions();
    }

    loadDatabaseFromLocalStorage() {
        const students = localStorage.getItem('school_students');
        const teachers = localStorage.getItem('school_teachers');
        const bases = localStorage.getItem('school_bases');
        const schedule = localStorage.getItem('school_rotation_schedule');
        const logs = localStorage.getItem('school_attendance_logs');
        const semesters = localStorage.getItem('school_semesters');
        const activeSemesterId = localStorage.getItem('school_active_semester_id');
        const baseActivityLogs = localStorage.getItem('school_base_activity_logs');
        const stagingLogs = localStorage.getItem('school_staging_logs');

        if (!students || !teachers || !bases || !schedule || !logs) {
            this.db = this.db || {};
            this.resetToDemoData(false); // Seed without forcing confirmation on first load
        } else {
            this.db = this.db || {};
            this.db.students = JSON.parse(students);
            this.db.teachers = JSON.parse(teachers);
            this.db.bases = JSON.parse(bases);
            this.db.rotation_schedule = JSON.parse(schedule);
            this.db.attendance_logs = JSON.parse(logs);
            this.db.semesters = semesters ? JSON.parse(semesters) : [{ id: "1-2569", name: "ภาคเรียนที่ 1/2569", active: true }];
            this.db.activeSemesterId = activeSemesterId || "1-2569";
            this.db.base_activity_logs = baseActivityLogs ? JSON.parse(baseActivityLogs) : [];
            this.db.staging_logs = stagingLogs ? JSON.parse(stagingLogs) : [];
            this.runMigrationChecks();
        }
        this.populateLoginSuggestions();
    }

    async loadDatabaseFromCloudInBackground() {
        if (!this.useFirestore) return;
        
        try {
            console.log("[Background Sync] Fetching database updates from Firestore...");
            const collections = ['students', 'teachers', 'bases', 'rotation_schedule', 'semesters', 'activeSemesterId'];
            const loadedDb = {};
            let hasData = true;

            const docPromises = collections.map(col => {
                const docRef = this.firestore.collection('system_data').doc(col);
                return this.getDocWithCacheFallback(docRef);
            });

            // Parallel fetches for collections
            const baseActPromise = this.getCollectionWithCacheFallback(this.firestore.collection('base_activity_logs'));
            const stagingPromise = this.getCollectionWithCacheFallback(this.firestore.collection('staging_logs'));

            const [docResults, baseActSnapshot, stagingSnapshot] = await Promise.all([
                Promise.all(docPromises),
                baseActPromise,
                stagingPromise
            ]);

            for (let i = 0; i < collections.length; i++) {
                const doc = docResults[i];
                if (doc.exists) {
                    if (collections[i] === 'activeSemesterId') {
                        loadedDb['activeSemesterId'] = doc.data().data?.id || "1-2569";
                    } else {
                        loadedDb[collections[i]] = doc.data().data || [];
                    }
                } else {
                    hasData = false;
                    break;
                }
            }

            if (hasData) {
                loadedDb['base_activity_logs'] = baseActSnapshot ? baseActSnapshot.docs.map(doc => doc.data()) : [];
                loadedDb['staging_logs'] = stagingSnapshot ? stagingSnapshot.docs.map(doc => doc.data()) : [];

                // Update db references
                this.db.students = loadedDb.students;
                this.db.teachers = loadedDb.teachers;
                this.db.bases = loadedDb.bases;
                this.db.rotation_schedule = loadedDb.rotation_schedule;
                this.db.semesters = loadedDb.semesters;
                this.db.activeSemesterId = loadedDb.activeSemesterId;
                this.db.base_activity_logs = loadedDb.base_activity_logs;
                this.db.staging_logs = loadedDb.staging_logs;

                // Sync and listen to attendance logs
                if (this.logsUnsubscribe) {
                    this.logsUnsubscribe();
                }

                this.logsUnsubscribe = this.firestore.collection('attendance_logs').onSnapshot({ includeMetadataChanges: true }, (snapshot) => {
                    const updatedLogs = snapshot.docs.map(doc => doc.data());
                    if (this.db) {
                        this.db.attendance_logs = updatedLogs;
                        localStorage.setItem('school_attendance_logs', JSON.stringify(updatedLogs));
                        this.render();
                    }
                });

                this.runMigrationChecks();
                // Save to localStorage
                localStorage.setItem('school_students', JSON.stringify(this.db.students));
                localStorage.setItem('school_teachers', JSON.stringify(this.db.teachers));
                localStorage.setItem('school_bases', JSON.stringify(this.db.bases));
                localStorage.setItem('school_rotation_schedule', JSON.stringify(this.db.rotation_schedule));
                localStorage.setItem('school_semesters', JSON.stringify(this.db.semesters));
                localStorage.setItem('school_active_semester_id', this.db.activeSemesterId);
                localStorage.setItem('school_base_activity_logs', JSON.stringify(this.db.base_activity_logs));
                localStorage.setItem('school_staging_logs', JSON.stringify(this.db.staging_logs));

                this.updateFirestoreConnectionStatus(true);
                this.updateStagingBadgeCount();
                this.render();
                this.populateLoginSuggestions();
                console.log("[Background Sync] Firestore database sync complete!");
            }
        } catch (e) {
            console.warn("[Background Sync] Slow connection or error loading from Firestore. Fallback active.", e.message);
            this.updateFirestoreConnectionStatus(false);
        }
    }

    // Save database state to localStorage & Firestore
    async saveDatabase(saveLogsToFirestore = false, collectionsToSync = null) {
        localStorage.setItem('school_students', JSON.stringify(this.db.students || []));
        localStorage.setItem('school_teachers', JSON.stringify(this.db.teachers || []));
        localStorage.setItem('school_bases', JSON.stringify(this.db.bases || []));
        localStorage.setItem('school_rotation_schedule', JSON.stringify(this.db.rotation_schedule || []));
        localStorage.setItem('school_attendance_logs', JSON.stringify(this.db.attendance_logs || []));
        localStorage.setItem('school_semesters', JSON.stringify(this.db.semesters || []));
        localStorage.setItem('school_active_semester_id', this.db.activeSemesterId || "1-2569");
        localStorage.setItem('school_base_activity_logs', JSON.stringify(this.db.base_activity_logs || []));
        localStorage.setItem('school_staging_logs', JSON.stringify(this.db.staging_logs || []));

        if (this.useFirestore) {
            try {
                // Determine collections to sync
                let syncCols = [];
                if (collectionsToSync) {
                    syncCols = collectionsToSync;
                } else if (saveLogsToFirestore) {
                    syncCols = ['students', 'teachers', 'bases', 'rotation_schedule', 'semesters', 'activeSemesterId'];
                }

                if (syncCols.length > 0) {
                    const batch = this.firestore.batch();
                    syncCols.forEach(col => {
                        let dataToSave;
                        let docId = col;
                        let collectionName = 'system_data';

                        if (col === 'activeSemesterId') {
                            dataToSave = { id: this.db.activeSemesterId || "1-2569" };
                        } else {
                            dataToSave = this.db[col];
                        }

                        if (dataToSave !== undefined) {
                            const docRef = this.firestore.collection(collectionName).doc(docId);
                            batch.set(docRef, { data: dataToSave });
                        }
                    });
                    await batch.commit();
                }

                // Save logs fully if requested (e.g. seed or full restore)
                if (saveLogsToFirestore) {
                    // Sync attendance logs
                    await this.syncCollectionFully('attendance_logs', this.db.attendance_logs, (log) => `${log.date}_${log.baseId}_${log.studentId}`);
                    
                    // Sync base activity logs
                    if (this.db.base_activity_logs) {
                        await this.syncCollectionFully('base_activity_logs', this.db.base_activity_logs, (log) => log.id);
                    }

                    // Sync staging logs
                    if (this.db.staging_logs) {
                        await this.syncCollectionFully('staging_logs', this.db.staging_logs, (log) => log.batchId);
                    }
                }

                await this.triggerAutoBackup();
                this.updateFirestoreConnectionStatus(true);
            } catch (e) {
                console.error("Failed to save database to Firestore:", e);
                this.updateFirestoreConnectionStatus(false);
            }
        }
    }

    // Helper to delete old docs and write new docs in chunks of 400
    async syncCollectionFully(collectionName, dataArray, getDocIdFn) {
        const oldDocsSnapshot = await this.firestore.collection(collectionName).get();
        
        // Delete in chunks of 400
        const deleteBatches = [];
        let currentDeleteBatch = this.firestore.batch();
        let opCount = 0;
        
        oldDocsSnapshot.docs.forEach(doc => {
            currentDeleteBatch.delete(doc.ref);
            opCount++;
            if (opCount === 400) {
                deleteBatches.push(currentDeleteBatch);
                currentDeleteBatch = this.firestore.batch();
                opCount = 0;
            }
        });
        if (opCount > 0) {
            deleteBatches.push(currentDeleteBatch);
        }
        
        for (const b of deleteBatches) {
            await b.commit();
        }

        // Now write the new documents in chunks of 400
        const writeBatches = [];
        let currentWriteBatch = this.firestore.batch();
        let writeCount = 0;

        dataArray.forEach(item => {
            const docId = getDocIdFn(item);
            const docRef = this.firestore.collection(collectionName).doc(docId);
            currentWriteBatch.set(docRef, item);
            writeCount++;
            if (writeCount === 400) {
                writeBatches.push(currentWriteBatch);
                currentWriteBatch = this.firestore.batch();
                writeCount = 0;
            }
        });
        if (writeCount > 0) {
            writeBatches.push(currentWriteBatch);
        }

        for (const b of writeBatches) {
            await b.commit();
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
                await this.saveDatabase(true);
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
            { username: "director", name: "นายปุรเชษฐ์ มธุรส", role: "director", password: "123456" },
            { username: "deputy1", name: "นางสาวกษมา อุดทาเรือน", role: "director", password: "123456" },
            { username: "deputy2", name: "นางสาวหัสดาภรณ์ พรหมคำติ๊บ", role: "director", password: "123456" },
            { username: "admin", name: "นางสาวเจนประภา เรือนคำ", role: "admin" }
        ];

        let dbChanged = false;

        // Remove obsolete deputy3 username from local database if migrating
        const oldDeputy3Index = this.db.teachers.findIndex(t => t.username === 'deputy3');
        if (oldDeputy3Index !== -1) {
            this.db.teachers.splice(oldDeputy3Index, 1);
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
                // Overwrite password ONLY if it is missing, or matches old default (phone/username/June), and is not 123456
                const isOldDefault = !found.password || found.password === exec.phone || found.password === exec.username || found.password === '20June2026';
                if (isOldDefault && found.password !== "123456") {
                    found.password = "123456";
                    dbChanged = true;
                }
                if (exec.phone && found.phone !== exec.phone) {
                    found.phone = exec.phone;
                    dbChanged = true;
                }
            }
        });

        // Migration for all bases and teachers
        const requiredTeachers = [
            { username: "nattawadee", name: "นางสาวณัฐวดี เขียวภูมิชัย", role: "teacher" },
            { username: "punyapat", name: "นายปุญญพัฒน์ ธิมา", role: "teacher" },
            { username: "phensiri", name: "นางสาวเพ็ญศิริ วงค์เทพ", role: "teacher" },
            { username: "wipimsai", name: "นางสาววิพิมพ์สาย หิ่งคำ", role: "teacher" },
            { username: "nattida", name: "นางสาวนัฎฐิดา ปันงาม", role: "teacher" },
            { username: "kiattima", name: "นางสาวเกียรติติมา มณีวรรณ", role: "teacher" },
            { username: "jariya", name: "นางสาวจริยา ทวีกิจสถาพร", role: "teacher" },
            { username: "prapaisri", name: "นางประไพศรี กำแพงแก้ว", role: "teacher" },
            { username: "nattakarn", name: "นางสาวณัฐกาญจน์ แก้วสุวรรณ", role: "teacher" },
            { username: "pimprabha", name: "นางสาวพิมพ์ประภา เสาสวัสดิ์", role: "teacher" },
            { username: "praeploy", name: "นางสาวแพรพลอย บุศยาณิน", role: "teacher" },
            { username: "pattra", name: "นางสาวภัทรา กันทะคำ", role: "teacher" },
            { username: "patama", name: "นางสาวปัทมา หาญยศ", role: "teacher" },
            { username: "suthinee", name: "นางสาวศุทธินี โภชพิพิธ", role: "teacher" },
            { username: "thanyathorn", name: "นางธัญญาธร ศิริสุภาศักดิ์", role: "teacher" },
            { username: "piyada", name: "นางสาวปิยดา ปวงฟู", role: "teacher" },
            { username: "jirapha", name: "นางสาวจิรภา พันธ์ธรรม", role: "teacher" },
            { username: "thanyakorn", name: "นางสาวธัญกร ยอดทอง", role: "teacher" },
            { username: "kasemsan", name: "นายเกษมสันต์ จอมพิจิตร", role: "teacher" },
            { username: "apichaya", name: "นางสาวอภิชญา สุขแสงงาม", role: "teacher" },
            { username: "arnon", name: "นายอานนท์ ตื้อจันตา", role: "teacher" },
            { username: "chaiyo", name: "นายไชโย ธัมหมื่นยอง", role: "teacher" },
            { username: "nawaphat", name: "นายนวพรรษ พุทธิปา", role: "teacher" },
            { username: "wachira", name: "นายวชิร ยะถามกรรม", role: "teacher" },
            { username: "suntree", name: "นางสาวสุนทรี จิโนบัว", role: "teacher" },
            { username: "hattayaporn", name: "นางหัตถยาภรณ์ เอกจีน", role: "teacher" },
            { username: "kulpriya", name: "นางสาวกุลปริยา รอดสุวรรณ", role: "teacher" },
            { username: "kodchakorn", name: "นางสาวกชกร รัตนศาสตร์ชาญ", role: "teacher" },
            { username: "angkana_w", name: "นางสาวอังคนา วงค์คำ", role: "teacher" },
            { username: "phuwadol", name: "นายภูวดล สุระจินดา", role: "teacher" },
            { username: "nattapong", name: "นายณัฐพงศ์ หาญพอ", role: "teacher" },
            { username: "narada", name: "นางณรฎา มธุรส", role: "teacher" },
            { username: "thanomsak", name: "นายถนอมศักดิ์ กิตติเลิศภักดีกุล", role: "teacher" },
            { username: "patiphan", name: "นายปฎิภาณ ใจซื่อ", role: "teacher" },
            { username: "narong_c", name: "นายณรงค์ เชียงแก้ว", role: "teacher" },
            { username: "anawat", name: "นายอนวัช ซอแอ", role: "teacher" },
            { username: "natnaree", name: "นางสาวนาฎนารี มณีแก้ว", role: "teacher" },
            { username: "patjek", name: "นายปัจเจก จันทรเสนาวงค์", role: "teacher" },
            { username: "supaluck", name: "นายศุภลักษณ์ ไชโย", role: "teacher" },
            { username: "supannee", name: "นางสาวสุพรรณี จิตเมตตาบริสุทธิ์", role: "teacher" },
            { username: "pattaya", name: "นางสาวพัทยา ยะมะโน", role: "teacher" },
            { username: "siwaporn", name: "นางสาวศิวพร รุ่งเรือง", role: "teacher" },
            { username: "phetcharin", name: "นางสาวเพชรดารินทร์ เดชชลธี", role: "teacher" },
            { username: "thanchanok", name: "นางสาวธัญชนก พงษ์ศรี", role: "teacher" },
            { username: "parichart", name: "นางสาวปาริชาติ แก้วศักดิ์", role: "teacher" },
            { username: "duangsuda", name: "นางดวงสุดา เรืองวุฒิ", role: "teacher" },
            { username: "samrit", name: "นายสัมฤทธิ์ ไชยทารินทร์", role: "teacher" },
            { username: "pongpak", name: "นายพงศ์ภัค มงคลจรรยาภัค", role: "teacher" },
            { username: "kongphop", name: "นายก้องภพ มูลศรี", role: "teacher" },
            { username: "tidarat", name: "นางสาวธิดารัตน์ วงศ์ใหญ่", role: "teacher" },
            { username: "sahaphum", name: "นายสหภูมิ ตั้งตรง", role: "teacher" },
            { username: "sawang", name: "นายสว่าง มัศยวรรณ", role: "teacher" },
            { username: "supiya", name: "นายสุปิยะ ศักดิ์ภิรมย์", role: "teacher" },
            { username: "jantanee", name: "นางสาวจันทนีย์ เฮิมนาง", role: "teacher" },
            { username: "prabtawan", name: "นายปราบตะวัน สุรินทร์", role: "teacher" },
            { username: "chitsanupong", name: "นายชิษณุพงศ์ วงศ์เสน", role: "teacher" },
            { username: "rangsiya", name: "นางสาวรังสิยา ชัชวงศ์", role: "teacher" },
            { username: "waranyu", name: "นายวรัญญู วิไลกุล", role: "teacher" },
            { username: "phattarapin", name: "นางสาวภัทรรพินท์ พงศ์ธนะลีลา", role: "teacher" },
            { username: "patcharaporn", name: "นางสาวพัชราภรณ์ หล้าแก้ว", role: "teacher" },
            { username: "apiradee", name: "นางอภิระดี เพ่งพิศ", role: "teacher" },
            { username: "narongrit", name: "นายณรงค์ฤทธิ์ หงษ์อารีย์", role: "teacher" },
            { username: "rotjana", name: "นางรจนา พุทธิ", role: "teacher" },
            { username: "thanyarat", name: "นางธัญญรัตน์ เทศมี", role: "teacher" },
            { username: "siriwattana", name: "นางศิริวัฒนา ยุ้งทอง", role: "teacher" },
            { username: "weerapong", name: "ว่าที่ร้อยตรีวีรพงศ์ แสงแฝง", role: "teacher" },
            { username: "katsinee", name: "นางสาวเกษศิณี จันพรมมิน", role: "teacher" },
            { username: "thanyaluck", name: "นางสาวธัญลักษณ์ เกตุ้ย", role: "teacher" },
            { username: "angkana_k", name: "นางสาวอังคนา คำป้อ", role: "teacher" },
            { username: "woranuch", name: "นางสาววรนุช คีรีเลิศธรรม", role: "teacher" },
            { username: "pinyapat", name: "นางสาวภิญญาพัชร์ บุญเป", role: "teacher" },
            { username: "kusupiya", name: "นางสาวกุสุปิยา รอดสุวรรณ", role: "teacher" },
            { username: "tyler", name: "Mr.Tyler Pearce", role: "teacher" },
            { username: "michael", name: "Mr.Michael Gibbs", role: "teacher" },
            { username: "shoon", name: "Miss Shoon Shoe Lei", role: "teacher" }
        ];

        // Splicing old demo accounts
        const oldDemoUsernames = [
            "teacher1", "teacher1_2", "teacher2", "teacher2_2", 
            "teacher3", "teacher3_2", "teacher4", "teacher4_2", 
            "teacher6", "teacher6_2", "teacher7", "teacher7_2"
        ];
        oldDemoUsernames.forEach(username => {
            const idx = this.db.teachers.findIndex(t => t.username === username);
            if (idx !== -1) {
                this.db.teachers.splice(idx, 1);
                dbChanged = true;
            }
        });

        // Ensure all required teachers are registered in database
        requiredTeachers.forEach(tInfo => {
            const found = this.db.teachers.find(t => t.username === tInfo.username);
            if (!found) {
                tInfo.password = "123456";
                this.db.teachers.push(tInfo);
                dbChanged = true;
            } else {
                let changed = false;
                if (found.name !== tInfo.name) {
                    found.name = tInfo.name;
                    changed = true;
                }
                if (found.role !== tInfo.role) {
                    found.role = tInfo.role;
                    changed = true;
                }
                // Overwrite password ONLY if it is missing, or matches old default (phone/username), and is not 123456
                const isOldDefault = !found.password || found.password === tInfo.phone || found.password === tInfo.username;
                if (isOldDefault && found.password !== "123456") {
                    found.password = "123456";
                    changed = true;
                }
                if (tInfo.phone && found.phone !== tInfo.phone) {
                    found.phone = tInfo.phone;
                    changed = true;
                }
                if (changed) dbChanged = true;
            }
        });

        // Bases definitions migration
        const newBasesData = [
            { id: "base1", name: "ไฟเบอร์ ทรงพลัง", defaultRoom: "หอประชุมพุทธรักษา", defaultTeacher: "นางสาวณัฐวดี เขียวภูมิชัย, นายปุญญพัฒน์ ธิมา, นางสาวเพ็ญศิริ วงค์เทพ, นางสาววิพิมพ์สาย หิ่งคำ, นางสาวนัฎฐิดา ปันงาม, นางสาวเกียรติติมา มณีวรรณ, นางสาวจริยา ทวีกิจสถาพร, นางประไพศรี กำแพงแก้ว, นางสาวณัฐกาญจน์ แก้วสุวรรณ, นางสาวพิมพ์ประภา เสาสวัสดิ์", teacherId: "nattawadee, punyapat, phensiri, wipimsai, nattida, kiattima, jariya, prapaisri, nattakarn, pimprabha" },
            { id: "base2", name: "อาณาจักรอักษร", defaultRoom: "ห้อง 2206", defaultTeacher: "นางสาวแพรพลอย บุศยาณิน, นางสาวภัทรา กันทะคำ, นางสาวปัทมา หาญยศ, นางสาวศุทธินี โภชพิพิธ, นางธัญญาธร ศิริสุภาศักดิ์, นางสาวปิยดา ปวงฟู, นางสาวจิรภา พันธ์ธรรม, นางสาวธัญกร ยอดทอง, นายเกษมสันต์ จอมพิจิตร, นางสาวอภิชญา สุขแสงงาม", teacherId: "praeploy, pattra, patama, suthinee, thanyathorn, piyada, jirapha, thanyakorn, kasemsan, apichaya" },
            { id: "base3", name: "เงาในน้ำ", defaultRoom: "ห้อง 1208", defaultTeacher: "นายอานนท์ ตื้อจันตา, นายไชโย ธัมหมื่นยอง, นายนวพรรษ พุทธิปา, นายวชิร ยะถามกรรม, นางสาวสุนทรี จิโนบัว, นางหัตถยาภรณ์ เอกจีน, นางสาวกุลปริยา รอดสุวรรณ, นางสาวกชกร รัตนศาสตร์ชาญ, นางสาวอังคนา วงค์คำ, นายภูวดล สุระจินดา", teacherId: "arnon, chaiyo, nawaphat, wachira, suntree, hattayaporn, kulpriya, kodchakorn, angkana_w, phuwadol" },
            { id: "base4", name: "ไก่ไข่อารมณ์ดี", defaultRoom: "ห้อง 2101", defaultTeacher: "นายณัฐพงศ์ หาญพอ, นางณรฎา มธุรส, นายถนอมศักดิ์ กิตติเลิศภักดีกุล, นายปฎิภาณ ใจซื่อ, นายณรงค์ เชียงแก้ว, นายอนวัช ซอแอ, นางสาวนาฎนารี มณีแก้ว, นายปัจเจก จันทรเสนาวงค์, นายศุภลักษณ์ ไชโย, นางสาวสุพรรณี จิตเมตตาบริสุทธิ์", teacherId: "nattapong, narada, thanomsak, patiphan, narong_c, anawat, natnaree, patjek, supaluck, supannee" },
            { id: "base5", name: "หรรษาสุธารสเห็ด", defaultRoom: "ห้อง 1103, ห้อง 1105, ห้องคหกรรม", defaultTeacher: "นางสาวพัทยา ยะมะโน, นางสาวศิวพร รุ่งเรือง, นางสาวเพชรดารินทร์ เดชชลธี, นางสาวธัญชนก พงษ์ศรี, นางสาวปาริชาติ แก้วศักดิ์, นางดวงสุดา เรืองวุฒิ, นายสัมฤทธิ์ ไชยทารินทร์, นางสาวเจนประภา เรือนคำ, นายพงศ์ภัค มงคลจรรยาภัค, นายก้องภพ มูลศรี", teacherId: "pattaya, siwaporn, phetcharin, thanchanok, parichart, duangsuda, samrit, admin, pongpak, kongphop" },
            { id: "base6", name: "ต้นกล้าประชาธิปไตย", defaultRoom: "ห้อง 2301", defaultTeacher: "นางสาวธิดารัตน์ วงศ์ใหญ่, นายสหภูมิ ตั้งตรง, นายสว่าง มัศยวรรณ, นายสุปิยะ ศักดิ์ภิรมย์, นางสาวจันทนีย์ เฮิมนาง, นายปราบตะวัน สุรินทร์, นายชิษณุพงศ์ วงศ์เสน, นางสาวรังสิยา ชัชวงศ์, นายวรัญญู วิไลกุล, นางสาวภัทรรพินท์ พงศ์ธนะลีลา, นางสาวพัชราภรณ์ หล้าแก้ว", teacherId: "tidarat, sahaphum, sawang, supiya, jantanee, prabtawan, chitsanupong, rangsiya, waranyu, phattarapin, patcharaporn" },
            { id: "base7", name: "หลู่ส่างกานเครือ เกื้อบุญ", defaultRoom: "หอประชุมสุภเมธี", defaultTeacher: "นางอภิระดี เพ่งพิศ, นายณรงค์ฤทธิ์ หงษ์อารีย์, นางรจนา พุทธิ, นางธัญญรัตน์ เทศมี, นางศิริวัฒนา ยุ้งทอง, ว่าที่ร้อยตรีวีรพงศ์ แสงแฝง, นางสาวเกษศิณี จันพรมมิน, นางสาวธัญลักษณ์ เกตุ้ย, นางสาวอังคนา คำป้อ, นางสาววรนุช คีรีเลิศธรรม, นางสาวภิญญาพัชร์ บุญเป", teacherId: "apiradee, narongrit, rotjana, thanyarat, siriwattana, weerapong, katsinee, thanyaluck, angkana_k, woranuch, pinyapat" }
        ];

        newBasesData.forEach(bData => {
            const base = this.db.bases.find(b => b.id === bData.id);
            if (base) {
                if (base.name !== bData.name) {
                    base.name = bData.name;
                    dbChanged = true;
                }
                if (base.defaultTeacher !== bData.defaultTeacher) {
                    base.defaultTeacher = bData.defaultTeacher;
                    dbChanged = true;
                }
                if (base.teacherId !== bData.teacherId) {
                    base.teacherId = bData.teacherId;
                    dbChanged = true;
                }
            }

            if (this.db.rotation_schedule) {
                this.db.rotation_schedule.forEach(sch => {
                    if (sch.baseId === bData.id) {
                        if (sch.baseName !== bData.name) {
                            sch.baseName = bData.name;
                            dbChanged = true;
                        }
                        if (sch.teacherName !== bData.defaultTeacher || sch.teacherId !== bData.teacherId) {
                            sch.teacherName = bData.defaultTeacher;
                            sch.teacherId = bData.teacherId;
                            dbChanged = true;
                        }
                    }
                });
            }
        });

        // Ensure all bases have classRooms field (backward compat)
        this.db.bases.forEach(b => {
            if (!b.classRooms) {
                b.classRooms = {};
                dbChanged = true;
            }
        });

        // Force regeneration of rotation schedule to match the new 1/2569 calendar (Migration Version 5)
        const migrationVersion = localStorage.getItem('school_migration_version') || '0';
        if (parseInt(migrationVersion) < 5) {
            console.log("[Migration] Regenerating rotation schedule to match new calendar layout (V5)...");
            this.db.rotation_schedule = this.generateDefaultRotationSchedule();
            localStorage.setItem('school_migration_version', '5');
            dbChanged = true;
        }

        // Migration Version 6 (Semesters & Custom Data Lists)
        if (parseInt(migrationVersion) < 6) {
            console.log("[Migration] Initializing semester structure (V6)...");
            if (!this.db.semesters) {
                this.db.semesters = [
                    { id: "1-2569", name: "ภาคเรียนที่ 1/2569", active: true }
                ];
            }
            if (!this.db.activeSemesterId) {
                this.db.activeSemesterId = "1-2569";
            }
            if (!this.db.base_activity_logs) {
                this.db.base_activity_logs = [];
            }
            if (!this.db.staging_logs) {
                this.db.staging_logs = [];
            }
            
            // Add semesterId to existing database records
            if (this.db.students) {
                this.db.students.forEach(st => {
                    if (!st.semesterId) st.semesterId = "1-2569";
                });
            }
            if (this.db.rotation_schedule) {
                this.db.rotation_schedule.forEach(sch => {
                    if (!sch.semesterId) sch.semesterId = "1-2569";
                });
            }
            if (this.db.attendance_logs) {
                this.db.attendance_logs.forEach(log => {
                    if (!log.semesterId) log.semesterId = "1-2569";
                });
            }

            localStorage.setItem('school_migration_version', '6');
            dbChanged = true;
        }

        // Migration Version 7 (Regenerate rotation schedule to restore missing classrooms ม.4/1 and ม.5/1)
        if (parseInt(migrationVersion) < 7) {
            console.log("[Migration] Regenerating rotation schedule to restore ม.4/1 and ม.5/1 (V7)...");
            this.db.rotation_schedule = this.generateDefaultRotationSchedule();
            localStorage.setItem('school_migration_version', '7');
            dbChanged = true;
        }

        if (dbChanged) {
            this.saveDatabase(false, ['bases', 'rotation_schedule', 'semesters', 'activeSemesterId', 'students', 'teachers']);
        }
    }

    // Seed realistic database
    resetToDemoData(showConfirm = true) {
        if (showConfirm && !confirm("คุณต้องการลบข้อมูลทั้งหมดและเริ่มฐานข้อมูลทดลองใหม่ใช่หรือไม่? (ประวัติการเช็กชื่อเดิมจะสูญหาย)")) {
            return;
        }

        // 1. Bases
        const bases = [
            { id: "base1", name: "ไฟเบอร์ ทรงพลัง", defaultRoom: "หอประชุมพุทธรักษา", defaultTeacher: "นางสาวณัฐวดี เขียวภูมิชัย, นายปุญญพัฒน์ ธิมา, นางสาวเพ็ญศิริ วงค์เทพ, นางสาววิพิมพ์สาย หิ่งคำ, นางสาวนัฎฐิดา ปันงาม, นางสาวเกียรติติมา มณีวรรณ, นางสาวจริยา ทวีกิจสถาพร, นางประไพศรี กำแพงแก้ว, นางสาวณัฐกาญจน์ แก้วสุวรรณ, นางสาวพิมพ์ประภา เสาสวัสดิ์", teacherId: "nattawadee, punyapat, phensiri, wipimsai, nattida, kiattima, jariya, prapaisri, nattakarn, pimprabha" },
            { id: "base2", name: "อาณาจักรอักษร", defaultRoom: "ห้อง 2206", defaultTeacher: "นางสาวแพรพลอย บุศยาณิน, นางสาวภัทรา กันทะคำ, นางสาวปัทมา หาญยศ, นางสาวศุทธินี โภชพิพิธ, นางธัญญาธร ศิริสุภาศักดิ์, นางสาวปิยดา ปวงฟู, นางสาวจิรภา พันธ์ธรรม, นางสาวธัญกร ยอดทอง, นายเกษมสันต์ จอมพิจิตร, นางสาวอภิชญา สุขแสงงาม", teacherId: "praeploy, pattra, patama, suthinee, thanyathorn, piyada, jirapha, thanyakorn, kasemsan, apichaya" },
            { id: "base3", name: "เงาในน้ำ", defaultRoom: "ห้อง 1208", defaultTeacher: "นายอานนท์ ตื้อจันตา, นายไชโย ธัมหมื่นยอง, นายนวพรรษ พุทธิปา, นายวชิร ยะถามกรรม, นางสาวสุนทรี จิโนบัว, นางหัตถยาภรณ์ เอกจีน, นางสาวกุลปริยา รอดสุวรรณ, นางสาวกชกร รัตนศาสตร์ชาญ, นางสาวอังคนา วงค์คำ, นายภูวดล สุระจินดา", teacherId: "arnon, chaiyo, nawaphat, wachira, suntree, hattayaporn, kulpriya, kodchakorn, angkana_w, phuwadol" },
            { id: "base4", name: "ไก่ไข่อารมณ์ดี", defaultRoom: "ห้อง 2101", defaultTeacher: "นายณัฐพงศ์ หาญพอ, นางณรฎา มธุรส, นายถนอมศักดิ์ กิตติเลิศภักดีกุล, นายปฎิภาณ ใจซื่อ, นายณรงค์ เชียงแก้ว, นายอนวัช ซอแอ, นางสาวนาฎนารี มณีแก้ว, นายปัจเจก จันทรเสนาวงค์, นายศุภลักษณ์ ไชโย, นางสาวสุพรรณี จิตเมตตาบริสุทธิ์", teacherId: "nattapong, narada, thanomsak, patiphan, narong_c, anawat, natnaree, patjek, supaluck, supannee" },
            { id: "base5", name: "หรรษาสุธารสเห็ด", defaultRoom: "ห้อง 1103, ห้อง 1105, ห้องคหกรรม", defaultTeacher: "นางสาวพัทยา ยะมะโน, นางสาวศิวพร รุ่งเรือง, นางสาวเพชรดารินทร์ เดชชลธี, นางสาวธัญชนก พงษ์ศรี, นางสาวปาริชาติ แก้วศักดิ์, นางดวงสุดา เรืองวุฒิ, นายสัมฤทธิ์ ไชยทารินทร์, นางสาวเจนประภา เรือนคำ, นายพงศ์ภัค มงคลจรรยาภัค, นายก้องภพ มูลศรี", teacherId: "pattaya, siwaporn, phetcharin, thanchanok, parichart, duangsuda, samrit, admin, pongpak, kongphop" },
            { id: "base6", name: "ต้นกล้าประชาธิปไตย", defaultRoom: "ห้อง 2301", defaultTeacher: "นางสาวธิดารัตน์ วงศ์ใหญ่, นายสหภูมิ ตั้งตรง, นายสว่าง มัศยวรรณ, นายสุปิยะ ศักดิ์ภิรมย์, นางสาวจันทนีย์ เฮิมนาง, นายปราบตะวัน สุรินทร์, นายชิษณุพงศ์ วงศ์เสน, นางสาวรังสิยา ชัชวงศ์, นายวรัญญู วิไลกุล, นางสาวภัทรรพินท์ พงศ์ธนะลีลา, นางสาวพัชราภรณ์ หล้าแก้ว", teacherId: "tidarat, sahaphum, sawang, supiya, jantanee, prabtawan, chitsanupong, rangsiya, waranyu, phattarapin, patcharaporn" },
            { id: "base7", name: "หลู่ส่างกานเครือ เกื้อบุญ", defaultRoom: "หอประชุมสุภเมธี", defaultTeacher: "นางอภิระดี เพ่งพิศ, นายณรงค์ฤทธิ์ หงษ์อารีย์, นางรจนา พุทธิ, นางธัญญรัตน์ เทศมี, นางศิริวัฒนา ยุ้งทอง, ว่าที่ร้อยตรีวีรพงศ์ แสงแฝง, นางสาวเกษศิณี จันพรมมิน, นางสาวธัญลักษณ์ เกตุ้ย, นางสาวอังคนา คำป้อ, นางสาววรนุช คีรีเลิศธรรม, นางสาวภิญญาพัชร์ บุญเป", teacherId: "apiradee, narongrit, rotjana, thanyarat, siriwattana, weerapong, katsinee, thanyaluck, angkana_k, woranuch, pinyapat" }
        ];

        // 2. Teachers
        const teachers = [
            { username: "nattawadee", name: "นางสาวณัฐวดี เขียวภูมิชัย", role: "teacher" },
            { username: "punyapat", name: "นายปุญญพัฒน์ ธิมา", role: "teacher" },
            { username: "phensiri", name: "นางสาวเพ็ญศิริ วงค์เทพ", role: "teacher" },
            { username: "wipimsai", name: "นางสาววิพิมพ์สาย หิ่งคำ", role: "teacher" },
            { username: "nattida", name: "นางสาวนัฎฐิดา ปันงาม", role: "teacher" },
            { username: "kiattima", name: "นางสาวเกียรติติมา มณีวรรณ", role: "teacher" },
            { username: "jariya", name: "นางสาวจริยา ทวีกิจสถาพร", role: "teacher" },
            { username: "prapaisri", name: "นางประไพศรี กำแพงแก้ว", role: "teacher" },
            { username: "nattakarn", name: "นางสาวณัฐกาญจน์ แก้วสุวรรณ", role: "teacher" },
            { username: "pimprabha", name: "นางสาวพิมพ์ประภา เสาสวัสดิ์", role: "teacher" },
            { username: "praeploy", name: "นางสาวแพรพลอย บุศยาณิน", role: "teacher" },
            { username: "pattra", name: "นางสาวภัทรา กันทะคำ", role: "teacher" },
            { username: "patama", name: "นางสาวปัทมา หาญยศ", role: "teacher" },
            { username: "suthinee", name: "นางสาวศุทธินี โภชพิพิธ", role: "teacher" },
            { username: "thanyathorn", name: "นางธัญญาธร ศิริสุภาศักดิ์", role: "teacher" },
            { username: "piyada", name: "นางสาวปิยดา ปวงฟู", role: "teacher" },
            { username: "jirapha", name: "นางสาวจิรภา พันธ์ธรรม", role: "teacher" },
            { username: "thanyakorn", name: "นางสาวธัญกร ยอดทอง", role: "teacher" },
            { username: "kasemsan", name: "นายเกษมสันต์ จอมพิจิตร", role: "teacher" },
            { username: "apichaya", name: "นางสาวอภิชญา สุขแสงงาม", role: "teacher" },
            { username: "arnon", name: "นายอานนท์ ตื้อจันตา", role: "teacher" },
            { username: "chaiyo", name: "นายไชโย ธัมหมื่นยอง", role: "teacher" },
            { username: "nawaphat", name: "นายนวพรรษ พุทธิปา", role: "teacher" },
            { username: "wachira", name: "นายวชิร ยะถามกรรม", role: "teacher" },
            { username: "suntree", name: "นางสาวสุนทรี จิโนบัว", role: "teacher" },
            { username: "hattayaporn", name: "นางหัตถยาภรณ์ เอกจีน", role: "teacher" },
            { username: "kulpriya", name: "นางสาวกุลปริยา รอดสุวรรณ", role: "teacher" },
            { username: "kodchakorn", name: "นางสาวกชกร รัตนศาสตร์ชาญ", role: "teacher" },
            { username: "angkana_w", name: "นางสาวอังคนา วงค์คำ", role: "teacher" },
            { username: "phuwadol", name: "นายภูวดล สุระจินดา", role: "teacher" },
            { username: "nattapong", name: "นายณัฐพงศ์ หาญพอ", role: "teacher" },
            { username: "narada", name: "นางณรฎา มธุรส", role: "teacher" },
            { username: "thanomsak", name: "นายถนอมศักดิ์ กิตติเลิศภักดีกุล", role: "teacher" },
            { username: "patiphan", name: "นายปฎิภาณ ใจซื่อ", role: "teacher" },
            { username: "narong_c", name: "นายณรงค์ เชียงแก้ว", role: "teacher" },
            { username: "anawat", name: "นายอนวัช ซอแอ", role: "teacher" },
            { username: "natnaree", name: "นางสาวนาฎนารี มณีแก้ว", role: "teacher" },
            { username: "patjek", name: "นายปัจเจก จันทรเสนาวงค์", role: "teacher" },
            { username: "supaluck", name: "นายศุภลักษณ์ ไชโย", role: "teacher" },
            { username: "supannee", name: "นางสาวสุพรรณี จิตเมตตาบริสุทธิ์", role: "teacher" },
            { username: "pattaya", name: "นางสาวพัทยา ยะมะโน", role: "teacher" },
            { username: "siwaporn", name: "นางสาวศิวพร รุ่งเรือง", role: "teacher" },
            { username: "phetcharin", name: "นางสาวเพชรดารินทร์ เดชชลธี", role: "teacher" },
            { username: "thanchanok", name: "นางสาวธัญชนก พงษ์ศรี", role: "teacher" },
            { username: "parichart", name: "นางสาวปาริชาติ แก้วศักดิ์", role: "teacher" },
            { username: "duangsuda", name: "นางดวงสุดา เรืองวุฒิ", role: "teacher" },
            { username: "samrit", name: "นายสัมฤทธิ์ ไชยทารินทร์", role: "teacher" },
            { username: "pongpak", name: "นายพงศ์ภัค มงคลจรรยาภัค", role: "teacher" },
            { username: "kongphop", name: "นายก้องภพ มูลศรี", role: "teacher" },
            { username: "tidarat", name: "นางสาวธิดารัตน์ วงศ์ใหญ่", role: "teacher" },
            { username: "sahaphum", name: "นายสหภูมิ ตั้งตรง", role: "teacher" },
            { username: "sawang", name: "นายสว่าง มัศยวรรณ", role: "teacher" },
            { username: "supiya", name: "นายสุปิยะ ศักดิ์ภิรมย์", role: "teacher" },
            { username: "jantanee", name: "นางสาวจันทนีย์ เฮิมนาง", role: "teacher" },
            { username: "prabtawan", name: "นายปราบตะวัน สุรินทร์", role: "teacher" },
            { username: "chitsanupong", name: "นายชิษณุพงศ์ วงศ์เสน", role: "teacher" },
            { username: "rangsiya", name: "นางสาวรังสิยา ชัชวงศ์", role: "teacher" },
            { username: "waranyu", name: "นายวรัญญู วิไลกุล", role: "teacher" },
            { username: "phattarapin", name: "นางสาวภัทรรพินท์ พงศ์ธนะลีลา", role: "teacher" },
            { username: "patcharaporn", name: "นางสาวพัชราภรณ์ หล้าแก้ว", role: "teacher" },
            { username: "apiradee", name: "นางอภิระดี เพ่งพิศ", role: "teacher" },
            { username: "narongrit", name: "นายณรงค์ฤทธิ์ หงษ์อารีย์", role: "teacher" },
            { username: "rotjana", name: "นางรจนา พุทธิ", role: "teacher" },
            { username: "thanyarat", name: "นางธัญญรัตน์ เทศมี", role: "teacher" },
            { username: "siriwattana", name: "นางศิริวัฒนา ยุ้งทอง", role: "teacher" },
            { username: "weerapong", name: "ว่าที่ร้อยตรีวีรพงศ์ แสงแฝง", role: "teacher" },
            { username: "katsinee", name: "นางสาวเกษศิณี จันพรมมิน", role: "teacher" },
            { username: "thanyaluck", name: "นางสาวธัญลักษณ์ เกตุ้ย", role: "teacher" },
            { username: "angkana_k", name: "นางสาวอังคนา คำป้อ", role: "teacher" },
            { username: "woranuch", name: "นางสาววรนุช คีรีเลิศธรรม", role: "teacher" },
            { username: "pinyapat", name: "นางสาวภิญญาพัชร์ บุญเป", role: "teacher" },
            { username: "admin", name: "นางสาวเจนประภา เรือนคำ", role: "admin" },
            { username: "kusupiya", name: "นางสาวกุสุปิยา รอดสุวรรณ", role: "teacher" },
            { username: "tyler", name: "Mr.Tyler Pearce", role: "teacher" },
            { username: "michael", name: "Mr.Michael Gibbs", role: "teacher" },
        ];

        // Reset all passwords to "123456" as default
        teachers.forEach(t => {
            t.password = "123456";
        });

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
                // Generate 40 students per classroom
                for (let i = 1; i <= 40; i++) {
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
        this.saveDatabase(true);

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
            { username: "director", name: "นายปุรเชษฐ์ มธุรส", role: "director", password: "123456", phone: "081-7646763" },
            { username: "deputy1", name: "นางสาวกษมา อุดทาเรือน", role: "director", password: "123456", phone: "094-4976328" },
            { username: "deputy2", name: "นางสาวหัสดาภรณ์ พรหมคำติ๊บ", role: "director", password: "123456", phone: "091-8521021" },
            { username: "admin", name: "นางสาวเจนประภา เรือนคำ", role: "admin", password: "123456" }
        ];

        // Default 7 bases with empty teacher assignment
        const bases = [
            { id: "base1", name: "ไฟเบอร์ ทรงพลัง", defaultRoom: "หอประชุมพุทธรักษา", defaultTeacher: "", teacherId: "" },
            { id: "base2", name: "อาณาจักรอักษร", defaultRoom: "ห้อง 2206", defaultTeacher: "", teacherId: "" },
            { id: "base3", name: "เงาในน้ำ", defaultRoom: "ห้อง 1208", defaultTeacher: "", teacherId: "" },
            { id: "base4", name: "ไก่ไข่อารมณ์ดี", defaultRoom: "ห้อง 2101", defaultTeacher: "", teacherId: "" },
            { id: "base5", name: "หรรษาสุธารสเห็ด", defaultRoom: "ห้อง 1103", defaultTeacher: "", teacherId: "" },
            { id: "base6", name: "ต้นกล้าประชาธิปไตย", defaultRoom: "ห้อง 2301", defaultTeacher: "", teacherId: "" },
            { id: "base7", name: "หลู่ส่างกานเครือ เกื้อบุญ", defaultRoom: "หอประชุมสุภเมธี", defaultTeacher: "", teacherId: "" }
        ];

        this.db.students = [];
        this.db.teachers = systemTeachers;
        this.db.bases = bases;
        this.db.rotation_schedule = this.generateDefaultRotationSchedule();
        this.db.attendance_logs = [];

        this.saveDatabase(true);

        // Clear active session to force login again
        this.currentUser = null;
        sessionStorage.removeItem('school_current_user');
        localStorage.removeItem('school_current_user');
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

        // Online/Offline Network Status Listener
        window.addEventListener('online', async () => {
            console.log("Network status: ONLINE");
            if (this.firestore) {
                this.useFirestore = true;
                this.updateFirestoreConnectionStatus(true);
                try {
                    await this.loadDatabase();
                    this.render();
                } catch (err) {
                    console.error("Error reloading database on restore online:", err);
                }
            }
        });

        window.addEventListener('offline', () => {
            console.log("Network status: OFFLINE");
            this.updateFirestoreConnectionStatus(false);
        });

        // Login Actions
        document.getElementById('auth-action-btn').addEventListener('click', () => {
            if (this.currentUser) {
                this.logout();
            } else {
                this.openModal('login-modal');
            }
        });

        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.login();
            });
        }

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
        // Navigation Guard based on user role
        if (!this.currentUser) {
            // Guest mode
            const guestViews = ['dashboard', 'calendar', 'bases', 'rotation', 'search'];
            if (!guestViews.includes(viewId)) {
                viewId = 'dashboard';
            }
        } else if (this.currentUser.role === 'teacher') {
            // Teacher mode
            const teacherViews = ['checkin', 'teacher-history'];
            if (!teacherViews.includes(viewId)) {
                viewId = 'checkin';
            }
        } else if (this.currentUser.role === 'director') {
            // Director mode
            const directorViews = ['dashboard', 'calendar', 'bases', 'rotation', 'search', 'reports', 'admin'];
            if (!directorViews.includes(viewId)) {
                viewId = 'admin';
            }
        } else if (this.currentUser.role === 'admin') {
            // Admin mode
            const adminViews = ['dashboard', 'calendar', 'bases', 'rotation', 'search', 'checkin', 'reports', 'admin', 'manage'];
            if (!adminViews.includes(viewId)) {
                viewId = 'manage';
            }
        }

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
                manage: 'ระบบจัดการข้อมูล (Admin Console)',
                'teacher-history': 'ประวัติการเช็กชื่อเข้าเรียน (Attendance History)'
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
                
                html += '<optgroup label="ผู้บริหารโรงเรียน (Executive)">';
                directorsList.forEach(t => {
                    let roleTitle = 'ผู้บริหาร';
                    if (t.username === 'director') roleTitle = 'ผู้อำนวยการ';
                    else if (t.username === 'deputy1') roleTitle = 'รองผู้อำนวยการ 1';
                    else if (t.username === 'deputy2') roleTitle = 'รองผู้อำนวยการ 2';
                    html += `<option value="${t.username}">${t.name} (${roleTitle})</option>`;
                });
                html += '</optgroup>';

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
        if (modalId === 'change-password-modal') {
            if (this.currentUser && (this.currentUser.password === '123456' || !this.currentUser.password)) {
                alert("กรุณาตั้งรหัสผ่านใหม่ก่อนเข้าใช้งานระบบ!");
                return;
            }
        }
        document.getElementById(modalId).classList.remove('active');
    }

    togglePasswordVisibility(inputId, btn) {
        const input = document.getElementById(inputId);
        if (!input) return;
        
        const icon = btn.querySelector('i');
        if (input.type === 'password') {
            input.type = 'text';
            if (icon) {
                icon.className = 'fa-solid fa-eye-slash';
            }
        } else {
            input.type = 'password';
            if (icon) {
                icon.className = 'fa-solid fa-eye';
            }
        }
    }


    populateLoginSuggestions() {
        const container = document.getElementById('login-username-suggestions');
        if (!container) return;

        // Clear existing suggestions
        container.innerHTML = '';

        if (!this.db || !this.db.teachers) return;

        // Group teachers
        const admins = this.db.teachers.filter(t => t.role === 'admin');
        const executives = this.db.teachers.filter(t => t.role === 'director');
        const baseTeachers = [];
        const otherTeachers = [];

        // Find which teachers are assigned to bases
        const baseTeacherUsernames = new Set();
        if (this.db.bases) {
            this.db.bases.forEach(b => {
                if (b.teacherId) {
                    b.teacherId.split(',').forEach(id => {
                        baseTeacherUsernames.add(id.trim());
                    });
                }
            });
        }

        this.db.teachers.forEach(t => {
            if (t.role === 'admin' || t.role === 'director') return;
            if (baseTeacherUsernames.has(t.username)) {
                baseTeachers.push(t);
            } else {
                otherTeachers.push(t);
            }
        });

        // Sort lists alphabetically by name
        const sortByName = (a, b) => a.name.localeCompare(b.name, 'th');
        admins.sort(sortByName);
        executives.sort(sortByName);
        baseTeachers.sort(sortByName);
        otherTeachers.sort(sortByName);

        const createSection = (title, list) => {
            if (list.length === 0) return;
            const header = document.createElement('div');
            header.className = 'suggestion-group-title';
            header.textContent = title;
            container.appendChild(header);

            list.forEach(u => {
                const item = document.createElement('div');
                item.className = 'suggestion-item';
                item.dataset.username = u.username;
                
                // Find base name if any
                let subtitle = '';
                if (u.role === 'admin') subtitle = 'ผู้ดูแลระบบ';
                else if (u.role === 'director') subtitle = 'ผู้บริหารโรงเรียน';
                else {
                    const base = this.db.bases ? this.db.bases.find(b => b.teacherId && b.teacherId.includes(u.username)) : null;
                    subtitle = base ? `ครูประจำฐาน: ${base.name}` : 'คุณครู';
                }

                item.innerHTML = `
                    <div class="suggestion-item-name">${u.name}</div>
                    <div class="suggestion-item-sub">${u.username} | ${subtitle}</div>
                `;
                item.addEventListener('mousedown', (e) => {
                    // Prevent input blur before click executes
                    e.preventDefault();
                });
                item.addEventListener('click', () => {
                    const input = document.getElementById('login-username');
                    if (input) {
                        input.value = u.name;
                        input.dataset.selectedUsername = u.username;
                    }
                    container.style.display = 'none';
                    
                    // Put focus on password field for quick navigation
                    const pwdInput = document.getElementById('login-password');
                    if (pwdInput) pwdInput.focus();
                });
                container.appendChild(item);
            });
        };

        createSection('ผู้ดูแลระบบ (Admin) & ผู้บริหาร (Executive)', [...admins, ...executives]);
        createSection('ครูประจำฐานการเรียนรู้ (Base Teachers)', baseTeachers);
        createSection('คุณครูอื่น ๆ (All Teachers)', otherTeachers);
    }

    setupLoginAutoComplete() {
        const input = document.getElementById('login-username');
        const container = document.getElementById('login-username-suggestions');
        const triggerBtn = document.getElementById('btn-username-dropdown');

        if (!input || !container) return;

        const filterSuggestions = () => {
            const query = input.value.toLowerCase().trim();
            const items = container.querySelectorAll('.suggestion-item');
            let hasVisible = false;

            items.forEach(item => {
                const text = item.textContent.toLowerCase();
                const username = item.dataset.username.toLowerCase();
                if (text.includes(query) || username.includes(query)) {
                    item.style.display = 'block';
                    hasVisible = true;
                } else {
                    item.style.display = 'none';
                }
            });

            // Hide empty group headers
            const groups = container.querySelectorAll('.suggestion-group-title');
            groups.forEach(group => {
                let next = group.nextElementSibling;
                let groupHasVisible = false;
                while (next && !next.classList.contains('suggestion-group-title')) {
                    if (next.style.display !== 'none') {
                        groupHasVisible = true;
                    }
                    next = next.nextElementSibling;
                }
                group.style.display = groupHasVisible ? 'block' : 'none';
            });

            container.style.display = hasVisible ? 'block' : 'none';
        };

        input.addEventListener('focus', () => {
            this.populateLoginSuggestions();
            container.style.display = 'block';
            filterSuggestions();
        });

        input.addEventListener('input', () => {
            // Clear selected data attribute if typed text doesn't match
            input.removeAttribute('data-selected-username');
            filterSuggestions();
        });

        // Close dropdown when blurring input or clicking outside
        input.addEventListener('blur', () => {
            // Delay closing slightly so click handler can fire on suggestion items
            setTimeout(() => {
                container.style.display = 'none';
            }, 200);
        });

        if (triggerBtn) {
            triggerBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (container.style.display === 'none' || container.style.display === '') {
                    this.populateLoginSuggestions();
                    container.style.display = 'block';
                    filterSuggestions();
                    input.focus();
                } else {
                    container.style.display = 'none';
                }
            });
        }
    }

    // Load auth session
    loadSession() {
        let savedUser = localStorage.getItem('school_current_user');
        if (!savedUser) {
            savedUser = sessionStorage.getItem('school_current_user');
        }
        if (savedUser) {
            this.currentUser = JSON.parse(savedUser);
            
            // Sync session user state with updated database values
            if (this.db && this.db.teachers) {
                const dbUser = this.db.teachers.find(t => t.username === this.currentUser.username);
                if (dbUser && (dbUser.name !== this.currentUser.name || dbUser.role !== this.currentUser.role || dbUser.password !== this.currentUser.password)) {
                    this.currentUser = dbUser;
                    localStorage.setItem('school_current_user', JSON.stringify(dbUser));
                    sessionStorage.setItem('school_current_user', JSON.stringify(dbUser));
                }
            }
            
            this.updateUserUI();
            
            // Redirect teachers to checkin on load
            if (this.currentUser && this.currentUser.role === 'teacher') {
                this.switchView('checkin');
            }
            
            // Force password change check on session load
            if (this.currentUser && (this.currentUser.password === '123456' || !this.currentUser.password)) {
                setTimeout(() => {
                    this.openChangePasswordModal(true);
                }, 1000);
            }
        } else {
            // Auto show login modal if not logged in to guide users
            setTimeout(() => {
                this.openModal('login-modal');
            }, 800);
        }
    }

    // Complete the login flow after successful auth and profile loading
    async completeLogin(userObj) {
        this.currentUser = userObj;
        sessionStorage.setItem('school_current_user', JSON.stringify(userObj));
        localStorage.setItem('school_current_user', JSON.stringify(userObj));
        
        if (this.useFirestore && userObj.role !== 'admin' && userObj.role !== 'director') {
            if (!userObj.isAuthCreated) {
                userObj.isAuthCreated = true;
                try {
                    await this.saveDatabase(false);
                } catch (e) {
                    console.error("[Login Flow] Failed to update teacher isAuthCreated status:", e);
                }
            }
        }

        this.updateUserUI();
        this.closeModal('login-modal');
        
        // Auto redirect depending on role
        if (userObj.role === 'admin') {
            this.switchView('manage');
        } else if (userObj.role === 'director') {
            this.switchView('admin');
        } else {
            this.switchView('checkin');
        }

        // Check if using default password, force them to change password
        const isDefaultPassword = userObj.password === '123456' || !userObj.password;
        if (isDefaultPassword) {
            setTimeout(() => {
                alert("ระบบบังคับเปลี่ยนรหัสผ่าน: เนื่องจากรหัสผ่านของคุณยังเป็นรหัสผ่านเริ่มต้น (123456) กรุณาตั้งรหัสผ่านใหม่เพื่อความปลอดภัยของข้อมูล");
                this.openChangePasswordModal(true);
            }, 800);
        }
    }

    // Retry profile load when login auth succeeded but database load was slow/failed
    async retryLoginProfileLoad(event) {
        if (event) event.preventDefault();
        
        if (!this.pendingLoginUser) {
            console.warn("No pending login user found for profile load retry");
            return;
        }

        const retryBtn = document.getElementById('btn-login-retry');
        const loadingText = document.getElementById('login-loading-text');
        
        if (retryBtn) {
            retryBtn.disabled = true;
            retryBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> กำลังลองใหม่...';
        }
        if (loadingText) {
            loadingText.textContent = 'กำลังโหลดข้อมูลผู้ใช้...';
        }

        try {
            console.log("[Login Flow] Retrying profile load for:", this.pendingLoginUser.username);
            this.initFirestore();
            await this.loadDatabase(20000);
            console.log("[Login Flow] Retry profile load: SUCCESS");
            
            if (retryBtn) {
                retryBtn.disabled = false;
                retryBtn.style.display = 'none';
                retryBtn.textContent = 'ลองใหม่อีกครั้ง';
            }
            const loadingStatus = document.getElementById('login-loading-status');
            if (loadingStatus) loadingStatus.style.display = 'none';

            const userObj = this.pendingLoginUser;
            this.pendingLoginUser = null;
            await this.completeLogin(userObj);
        } catch (err) {
            console.error("[Login Flow] Retry profile load: FAIL, Error:", err);
            if (retryBtn) {
                retryBtn.disabled = false;
                retryBtn.innerHTML = 'ลองใหม่อีกครั้ง';
                retryBtn.style.display = 'block';
            }
            if (loadingText) {
                loadingText.textContent = 'เข้าสู่ระบบแล้ว แต่โหลดข้อมูลผู้ใช้ไม่สำเร็จ';
            }
            this.showStatusModal('error', 'โหลดข้อมูลไม่สำเร็จ', 'เข้าสู่ระบบแล้ว แต่โหลดข้อมูลผู้ใช้ไม่สำเร็จ');
        }
    }

    // Retry database loading for the check-in view on slow network
    async retryCheckinDataLoad(event) {
        if (event) event.preventDefault();
        
        const retryBtn = document.getElementById('btn-checkin-retry');
        if (retryBtn) {
            retryBtn.disabled = true;
            retryBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> กำลังลองใหม่...';
        }

        try {
            console.log("[Checkin Flow] Retrying database load from checkin view...");
            this.initFirestore();
            this.useFirestore = true;
            await this.loadDatabase(20000);
            console.log("[Checkin Flow] Database load retry: SUCCESS");
            
            this.renderCheckin();
        } catch (err) {
            console.error("[Checkin Flow] Database load retry failed:", err);
            if (retryBtn) {
                retryBtn.disabled = false;
                retryBtn.innerHTML = '<i class="fa-solid fa-rotate"></i> ลองโหลดข้อมูลใหม่';
            }
            alert("ไม่สามารถโหลดข้อมูลผู้ใช้ได้ในขณะนี้: " + err.message);
        }
    }

    // Login logic
    async login() {
        const usernameInput = document.getElementById('login-username');
        if (!usernameInput) return;

        let selectedId = usernameInput.dataset.selectedUsername;
        if (!selectedId) {
            // If they typed manually or browser autofilled:
            const rawVal = usernameInput.value.trim().toLowerCase();
            // Try to find by username first, then by name
            const foundUser = this.db.teachers.find(t => 
                t.username.toLowerCase() === rawVal || 
                t.name.toLowerCase() === rawVal ||
                t.name.replace(/^(นาย|นางสาว|นาง|ครู)/, '').toLowerCase() === rawVal.replace(/^(นาย|นางสาว|นาง|ครู)/, '').toLowerCase()
            );
            if (foundUser) {
                selectedId = foundUser.username;
            } else {
                selectedId = rawVal; // fallback
            }
        }

        if (!selectedId) {
            alert("กรุณาระบุชื่อผู้ใช้งาน หรือเลือกจากรายการ!");
            return;
        }

        const userObj = this.db.teachers.find(t => t.username.toLowerCase() === selectedId.toLowerCase());
        if (!userObj) {
            this.showStatusModal('error', 'ไม่พบโปรไฟล์ผู้ใช้', 'ไม่พบข้อมูลผู้ใช้นี้ในระบบสำรอง กรุณาตรวจสอบชื่อผู้ใช้');
            return;
        }

        const passwordInput = document.getElementById('login-password').value;
        const expectedPassword = userObj.password || '123456';
        const email = `${userObj.username}@paiwittyakarn.local`;

        console.log("[Login Flow] Init Login for username:", userObj.username);
        console.log("[Login Flow] Browser Online Status:", navigator.onLine);

        const hasNetwork = navigator.onLine;
        
        // Local validation logic (for offline or fallback)
        const validatePasswordLocally = () => {
            return passwordInput === expectedPassword;
        };

        if (!hasNetwork) {
            console.log("[Login Flow] Cache fallback used: YES (Offline login)");
            if (validatePasswordLocally()) {
                alert("เข้าสู่ระบบสำเร็จในโหมดออฟไลน์ (ข้อมูลจะถูกจัดเก็บในเครื่องชั่วคราวและซิงค์เมื่อมีเน็ต)");
                await this.completeLogin(userObj);
            } else {
                this.showStatusModal('error', 'เข้าสู่ระบบไม่สำเร็จ', 'รหัสผ่านไม่ถูกต้อง (โหมดออฟไลน์)');
            }
            return;
        }

        const loginBtn = document.getElementById('btn-login-submit');
        const originalText = loginBtn ? loginBtn.innerHTML : 'ตกลงเข้าสู่ระบบ';
        if (loginBtn) {
            loginBtn.disabled = true;
            loginBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> กำลังตรวจสอบรหัสผ่านคลาวด์...';
        }

        // Hide and reset status elements inside modal
        const loadingStatus = document.getElementById('login-loading-status');
        const loadingText = document.getElementById('login-loading-text');
        const retryBtn = document.getElementById('btn-login-retry');
        if (loadingStatus) loadingStatus.style.display = 'none';
        if (retryBtn) retryBtn.style.display = 'none';

        // 6-second timeout helper for promises
        const withTimeout = (promise, ms, name) => {
            const timeout = new Promise((_, reject) => 
                setTimeout(() => reject(new Error(`${name} timeout`)), ms)
            );
            return Promise.race([promise, timeout]);
        };

        try {
            // 1. Authenticate with Firebase Auth (with 6s timeout)
            if (typeof firebase !== 'undefined' && firebase.auth) {
                console.log("[Login Flow] Attempting cloud authentication...");
                await withTimeout(
                    firebase.auth().signInWithEmailAndPassword(email, passwordInput),
                    6000,
                    "Auth"
                );
                console.log("[Login Flow] Firebase Auth Status: SUCCESS");
            } else {
                throw new Error("Firebase SDK not loaded");
            }
            
            // 2. Auth succeeded, now load or restore Firestore connection
            if (loginBtn) loginBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> เข้าสู่ระบบสำเร็จ กำลังโหลดข้อมูลโปรไฟล์...';
            
            if (loadingStatus) loadingStatus.style.display = 'block';
            if (loadingText) loadingText.textContent = 'กำลังโหลดข้อมูลผู้ใช้...';
            if (retryBtn) retryBtn.style.display = 'none';

            // Show retry button if database load takes more than 4 seconds
            const retryTimer = setTimeout(() => {
                if (retryBtn) retryBtn.style.display = 'block';
            }, 4000);

            this.pendingLoginUser = userObj;

            try {
                this.initFirestore();
                await this.loadDatabase(15000); // 15 seconds timeout for profile load
                console.log("[Login Flow] Firestore User Profile Load: SUCCESS");
                
                clearTimeout(retryTimer);
                if (loadingStatus) loadingStatus.style.display = 'none';
                if (loginBtn) {
                    loginBtn.disabled = false;
                    loginBtn.innerHTML = originalText;
                }
                this.pendingLoginUser = null;
                await this.completeLogin(userObj);
            } catch (firestoreErr) {
                console.error("[Login Flow] Firestore User Profile Load: FAIL, Error:", firestoreErr);
                clearTimeout(retryTimer);
                if (loginBtn) {
                    loginBtn.disabled = false;
                    loginBtn.innerHTML = originalText;
                }
                this.pendingLoginUser = null;
                
                if (loadingStatus) loadingStatus.style.display = 'none';
                
                // Fallback to local database but complete login to unblock user
                alert("เข้าสู่ระบบสำเร็จ (ใช้ฐานข้อมูลในเครื่องชั่วคราวเนื่องจากการเชื่อมต่อล่าช้า)");
                await this.completeLogin(userObj);
            }
            
        } catch (authErr) {
            console.log("[Login Flow] Cloud Auth Failed or Timed out. Error:", authErr.message);
            if (loginBtn) {
                loginBtn.disabled = false;
                loginBtn.innerHTML = originalText;
            }

            const isTimeout = authErr.message && authErr.message.includes('timeout');
            const isNetworkError = isTimeout || 
                                   authErr.code === 'auth/network-request-failed' || 
                                   authErr.code === 'auth/timeout' || 
                                   authErr.message.includes('network') ||
                                   authErr.message.includes('failed');

            // If it is a network error or timeout, try local authentication
            if (isNetworkError) {
                if (validatePasswordLocally()) {
                    alert("การเชื่อมต่อคลาวด์ขัดข้องหรือล่าช้า: เข้าสู่ระบบสำเร็จโดยใช้ฐานข้อมูลในเครื่องชั่วคราว");
                    await this.completeLogin(userObj);
                } else {
                    this.showStatusModal('error', 'เข้าสู่ระบบไม่สำเร็จ', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์คลาวด์ได้ และรหัสผ่านที่ป้อนไม่ถูกต้อง');
                }
                return;
            }

            // Handle wrong passwords / auto-provisioning (only if online and credentials rejected)
            if (authErr.code === 'auth/wrong-password' || authErr.code === 'auth/invalid-credential') {
                if (validatePasswordLocally()) {
                    if (loginBtn) {
                        loginBtn.disabled = true;
                        loginBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> กำลังสร้างบัญชีความปลอดภัยใหม่...';
                    }
                    try {
                        await firebase.auth().createUserWithEmailAndPassword(email, passwordInput);
                        console.log("[Login Flow] Auto-provisioning Account: SUCCESS");
                        
                        this.initFirestore();
                        
                        if (loadingStatus) loadingStatus.style.display = 'block';
                        if (loadingText) loadingText.textContent = 'กำลังโหลดข้อมูลผู้ใช้...';
                        if (retryBtn) retryBtn.style.display = 'none';

                        const retryTimer = setTimeout(() => {
                            if (retryBtn) retryBtn.style.display = 'block';
                        }, 4000);

                        this.pendingLoginUser = userObj;

                        try {
                            await this.loadDatabase(15000);
                            clearTimeout(retryTimer);
                            
                            if (loadingStatus) loadingStatus.style.display = 'none';
                            if (loginBtn) {
                                loginBtn.disabled = false;
                                loginBtn.innerHTML = originalText;
                            }
                            this.pendingLoginUser = null;
                            await this.completeLogin(userObj);
                        } catch (loadErr) {
                            console.error("[Login Flow] Profile load failed after auto-provision:", loadErr);
                            clearTimeout(retryTimer);
                            if (loadingStatus) loadingStatus.style.display = 'none';
                            if (loginBtn) {
                                loginBtn.disabled = false;
                                loginBtn.innerHTML = originalText;
                            }
                            this.pendingLoginUser = null;
                            alert("สร้างบัญชีและเข้าสู่ระบบสำเร็จ (ใช้ฐานข้อมูลในเครื่องชั่วคราวเนื่องจากการเชื่อมต่อล่าช้า)");
                            await this.completeLogin(userObj);
                        }
                    } catch (createErr) {
                        console.error("[Login Flow] Auto-provisioning failed:", createErr);
                        if (loginBtn) {
                            loginBtn.disabled = false;
                            loginBtn.innerHTML = originalText;
                        }
                        
                        const isCreateNetworkError = createErr.code === 'auth/network-request-failed' || 
                                                     createErr.code === 'auth/timeout' || 
                                                     createErr.message.includes('timeout') ||
                                                     createErr.message.includes('network');

                        if (isCreateNetworkError) {
                            // If auto-provision failed due to network error, complete login locally!
                            alert("เข้าสู่ระบบสำเร็จ (ใช้ฐานข้อมูลในเครื่องชั่วคราวเนื่องจากไม่สามารถลงทะเบียนคลาวด์ได้ในขณะนี้)");
                            await this.completeLogin(userObj);
                        } else if (createErr.code === 'auth/email-already-in-use') {
                            this.showStatusModal('error', 'เข้าสู่ระบบไม่สำเร็จ', 'รหัสผ่านไม่ถูกต้อง (คุณอาจเคยเปลี่ยนรหัสผ่านแล้ว กรุณาใช้รหัสผ่านล่าสุดของคุณ)');
                        } else {
                            this.showStatusModal('error', 'ข้อผิดพลาดการลงทะเบียน', 'ไม่สามารถลงทะเบียนบัญชีความปลอดภัยบนระบบคลาวด์: ' + createErr.message);
                        }
                    }
                } else {
                    this.showStatusModal('error', 'เข้าสู่ระบบไม่สำเร็จ', 'รหัสผ่านไม่ถูกต้อง');
                }
            } else if (authErr.code === 'auth/user-not-found' && validatePasswordLocally()) {
                if (loginBtn) {
                    loginBtn.disabled = true;
                    loginBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> กำลังลงทะเบียนบัญชีความปลอดภัย...';
                }
                try {
                    await firebase.auth().createUserWithEmailAndPassword(email, passwordInput);
                    this.initFirestore();
                    
                    if (loadingStatus) loadingStatus.style.display = 'block';
                    if (loadingText) loadingText.textContent = 'กำลังโหลดข้อมูลผู้ใช้...';
                    if (retryBtn) retryBtn.style.display = 'none';

                    const retryTimer = setTimeout(() => {
                        if (retryBtn) retryBtn.style.display = 'block';
                    }, 4000);

                    this.pendingLoginUser = userObj;

                    try {
                        await this.loadDatabase(15000);
                        clearTimeout(retryTimer);
                        
                        if (loadingStatus) loadingStatus.style.display = 'none';
                        if (loginBtn) {
                            loginBtn.disabled = false;
                            loginBtn.innerHTML = originalText;
                        }
                        this.pendingLoginUser = null;
                        await this.completeLogin(userObj);
                    } catch (loadErr) {
                        console.error("[Login Flow] Profile load failed after registration:", loadErr);
                        clearTimeout(retryTimer);
                        if (loadingStatus) loadingStatus.style.display = 'none';
                        if (loginBtn) {
                            loginBtn.disabled = false;
                            loginBtn.innerHTML = originalText;
                        }
                        this.pendingLoginUser = null;
                        alert("สร้างบัญชีและเข้าสู่ระบบสำเร็จ (ใช้ฐานข้อมูลในเครื่องชั่วคราวเนื่องจากการเชื่อมต่อล่าช้า)");
                        await this.completeLogin(userObj);
                    }
                } catch (createErr) {
                    console.error("[Login Flow] Auto-provisioning failed:", createErr);
                    if (loginBtn) {
                        loginBtn.disabled = false;
                        loginBtn.innerHTML = originalText;
                    }

                    const isCreateNetworkError = createErr.code === 'auth/network-request-failed' || 
                                                 createErr.code === 'auth/timeout' || 
                                                 createErr.message.includes('timeout') ||
                                                 createErr.message.includes('network');

                    if (isCreateNetworkError) {
                        alert("เข้าสู่ระบบสำเร็จ (ใช้ฐานข้อมูลในเครื่องชั่วคราวเนื่องจากไม่สามารถลงทะเบียนคลาวด์ได้ในขณะนี้)");
                        await this.completeLogin(userObj);
                    } else {
                        this.showStatusModal('error', 'ข้อผิดพลาดการลงทะเบียน', 'ไม่สามารถสร้างบัญชีความปลอดภัย: ' + createErr.message);
                    }
                }
            } else {
                console.warn("[Login Flow] Network/Firebase error during auth:", authErr);
                // Try local check as general fallback
                if (validatePasswordLocally()) {
                    alert("การเชื่อมต่อคลาวด์ขัดข้อง: เข้าสู่ระบบสำเร็จโดยใช้ฐานข้อมูลในเครื่องชั่วคราว");
                    await this.completeLogin(userObj);
                } else {
                    this.showStatusModal('error', 'การเชื่อมต่อล้มเหลว', 'อินเทอร์เน็ตช้าหรือไม่เสถียร กรุณารอสักครู่หรือลองใหม่');
                }
            }
        }
    }

    // Logout logic
    async logout() {
        this.currentUser = null;
        sessionStorage.removeItem('school_current_user');
        localStorage.removeItem('school_current_user');
        if (this.useFirestore) {
            try {
                await firebase.auth().signOut();
            } catch (e) {
                console.error("Firebase signOut failed:", e);
            }
        }
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
        const menuDashboard = document.getElementById('menu-dashboard');
        const menuCalendar = document.getElementById('menu-calendar');
        const menuBases = document.getElementById('menu-bases');
        const menuRotation = document.getElementById('menu-rotation');
        const menuSearch = document.getElementById('menu-search');
        const menuCheckin = document.getElementById('menu-checkin');
        const menuReports = document.getElementById('menu-reports');
        const menuTeacherHistory = document.getElementById('menu-teacher-history');
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
                if (menuDashboard) menuDashboard.style.display = 'block';
                if (menuCalendar) menuCalendar.style.display = 'block';
                if (menuBases) menuBases.style.display = 'block';
                if (menuRotation) menuRotation.style.display = 'block';
                if (menuSearch) menuSearch.style.display = 'block';
                if (menuCheckin) menuCheckin.style.display = 'block';
                if (menuReports) menuReports.style.display = 'block';
                if (menuTeacherHistory) menuTeacherHistory.style.display = 'none';
                if (menuAdmin) menuAdmin.style.display = 'block';
                if (menuManage) menuManage.style.display = 'block';
            } else if (this.currentUser.role === 'director') {
                roleLabel.textContent = "ผู้บริหารโรงเรียน";
                if (menuDashboard) menuDashboard.style.display = 'block';
                if (menuCalendar) menuCalendar.style.display = 'block';
                if (menuBases) menuBases.style.display = 'block';
                if (menuRotation) menuRotation.style.display = 'block';
                if (menuSearch) menuSearch.style.display = 'block';
                if (menuCheckin) menuCheckin.style.display = 'none';
                if (menuReports) menuReports.style.display = 'block';
                if (menuTeacherHistory) menuTeacherHistory.style.display = 'none';
                if (menuAdmin) menuAdmin.style.display = 'block';
                if (menuManage) menuManage.style.display = 'none';
            } else {
                // Teacher: ONLY Login, Attendance, and Attendance History are allowed/visible.
                // Hide all admin/guest features from teachers.
                roleLabel.textContent = "ครูประจำฐานการเรียนรู้";
                if (menuDashboard) menuDashboard.style.display = 'none';
                if (menuCalendar) menuCalendar.style.display = 'none';
                if (menuBases) menuBases.style.display = 'none';
                if (menuRotation) menuRotation.style.display = 'none';
                if (menuSearch) menuSearch.style.display = 'none';
                if (menuCheckin) menuCheckin.style.display = 'block';
                if (menuReports) menuReports.style.display = 'none';
                if (menuTeacherHistory) menuTeacherHistory.style.display = 'block';
                if (menuAdmin) menuAdmin.style.display = 'none';
                if (menuManage) menuManage.style.display = 'none';
            }
        } else {
            nameLabel.textContent = "ไม่ได้เข้าสู่ระบบ";
            roleLabel.textContent = "กรุณาเข้าสู่ระบบ";
            avatarLabel.textContent = "?";
            authBtnText.textContent = "เข้าสู่ระบบ";
            authIcon.className = "fa-solid fa-right-to-bracket";
            
            // Guest mode defaults
            if (menuDashboard) menuDashboard.style.display = 'block';
            if (menuCalendar) menuCalendar.style.display = 'block';
            if (menuBases) menuBases.style.display = 'block';
            if (menuRotation) menuRotation.style.display = 'block';
            if (menuSearch) menuSearch.style.display = 'block';
            if (menuCheckin) menuCheckin.style.display = 'none';
            if (menuReports) menuReports.style.display = 'none';
            if (menuTeacherHistory) menuTeacherHistory.style.display = 'none';
            if (menuAdmin) menuAdmin.style.display = 'none';
            if (menuManage) menuManage.style.display = 'none';
        }

        const changePwdBtn = document.getElementById('btn-change-password');
        if (this.currentUser && this.currentUser.role !== 'admin') {
            if (changePwdBtn) changePwdBtn.style.display = 'flex';
        } else {
            if (changePwdBtn) changePwdBtn.style.display = 'none';
        }

        // Date simulator permission lock
        const dateSimulator = document.getElementById('date-simulator-widget');
        if (dateSimulator) {
            if (this.currentUser && (this.currentUser.role === 'admin' || this.currentUser.role === 'director')) {
                dateSimulator.style.display = 'flex';
            } else {
                dateSimulator.style.display = 'none';
                // Lock systemDate to real local date
                const today = new Date();
                const year = today.getFullYear();
                const month = String(today.getMonth() + 1).padStart(2, '0');
                const day = String(today.getDate()).padStart(2, '0');
                const realDate = `${year}-${month}-${day}`;
                if (this.systemDate !== realDate) {
                    this.systemDate = realDate;
                    const dateInput = document.getElementById('system-date-input');
                    if (dateInput) {
                        dateInput.value = realDate;
                    }
                    this.currentWeekInfo = this.getWeekByDate(this.systemDate);
                }
            }
        }
    }

    openChangePasswordModal(force = false) {
        document.getElementById('change-pwd-current').value = '';
        document.getElementById('change-pwd-new').value = '';
        document.getElementById('change-pwd-confirm').value = '';
        
        const closeBtn = document.querySelector('#change-password-modal .modal-close');
        const cancelBtn = document.querySelector('#change-password-modal .modal-footer .btn-outline');
        
        if (force) {
            if (closeBtn) closeBtn.style.display = 'none';
            if (cancelBtn) cancelBtn.style.display = 'none';
            this.forcePasswordChange = true;
        } else {
            if (closeBtn) closeBtn.style.display = 'block';
            if (cancelBtn) cancelBtn.style.display = 'block';
            this.forcePasswordChange = false;
        }
        
        this.openModal('change-password-modal');
    }

    async changePasswordSubmit() {
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

        if (newPwd.length < 6) {
            this.showStatusModal('error', 'ข้อผิดพลาด', 'รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร!');
            return;
        }

        const t = this.db.teachers.find(x => x.username === this.currentUser.username);
        if (t) {
            const changePwdBtn = document.querySelector('#change-password-modal .btn-success');
            const originalText = changePwdBtn ? changePwdBtn.innerHTML : '';
            
            if (this.useFirestore) {
                if (changePwdBtn) {
                    changePwdBtn.disabled = true;
                    changePwdBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> กำลังอัปเดตรหัสผ่าน...';
                }
                try {
                    const user = firebase.auth().currentUser;
                    if (user) {
                        await user.updatePassword(newPwd);
                    }
                } catch (e) {
                    console.error("Failed to update password in Firebase Auth:", e);
                    this.showStatusModal('error', 'เปลี่ยนรหัสผ่านไม่สำเร็จ', 'ระบบความปลอดภัยไม่สามารถอัปเดตรหัสผ่านได้: ' + e.message);
                    if (changePwdBtn) {
                        changePwdBtn.disabled = false;
                        changePwdBtn.innerHTML = originalText;
                    }
                    return;
                }
            }

            t.password = newPwd;
            this.currentUser.password = newPwd;
            sessionStorage.setItem('school_current_user', JSON.stringify(this.currentUser));
            localStorage.setItem('school_current_user', JSON.stringify(this.currentUser));
            this.saveDatabase(false);
            
            if (this.useFirestore && changePwdBtn) {
                changePwdBtn.disabled = false;
                changePwdBtn.innerHTML = originalText;
            }
            
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
        } else if (this.currentView === 'teacher-history') {
            this.renderTeacherHistory();
        } else if (this.currentView === 'manage') {
            this.renderManage();
        } else if (this.currentView === 'calendar') {
            this.renderCalendar();
        } else if (this.currentView === 'bases') {
            this.renderBases();
        } else if (this.currentView === 'search') {
            this.renderSearch();
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
        this.renderExecutiveCards('dash-executives-container');
    }

    renderExecutiveCards(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        // Filter and sort executives to match director, deputy1, deputy2 sequence
        const directorsList = this.db.teachers.filter(t => t.role === 'director');
        const sortedDirectors = [];
        
        const dir = directorsList.find(t => t.username === 'director');
        if (dir) sortedDirectors.push(dir);
        const dep1 = directorsList.find(t => t.username === 'deputy1');
        if (dep1) sortedDirectors.push(dep1);
        const dep2 = directorsList.find(t => t.username === 'deputy2');
        if (dep2) sortedDirectors.push(dep2);
        
        // Add any other directors if they exist
        directorsList.forEach(t => {
            if (t.username !== 'director' && t.username !== 'deputy1' && t.username !== 'deputy2') {
                sortedDirectors.push(t);
            }
        });

        let html = '';
        sortedDirectors.forEach(exec => {
            let roleTitle = 'ผู้บริหาร';
            let avatarBg = 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)';
            
            if (exec.username === 'director') {
                roleTitle = 'ผู้อำนวยการ';
                avatarBg = 'linear-gradient(135deg, #1D4ED8 0%, #1E3A8A 100%)'; // Sleek dark blue
            } else if (exec.username === 'deputy1') {
                roleTitle = 'รองผู้อำนวยการ 1';
                avatarBg = 'linear-gradient(135deg, #059669 0%, #064E3B 100%)'; // Sleek green
            } else if (exec.username === 'deputy2') {
                roleTitle = 'รองผู้อำนวยการ 2';
                avatarBg = 'linear-gradient(135deg, #D97706 0%, #78350F 100%)'; // Sleek amber
            }

            const initialLetter = exec.name ? exec.name.replace(/^(นาย|นางสาว|นาง|ครู)\s*/, '')[0] : 'ผ';

            html += `
                <div class="executive-card">
                    <div class="executive-avatar" style="width: 60px; height: 60px; border-radius: 50%; background: ${avatarBg}; display: flex; align-items: center; justify-content: center; color: white; font-size: 24px; font-weight: bold; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
                        ${initialLetter}
                    </div>
                    <div class="executive-info">
                        <h4 style="margin: 0; font-size: 16px; font-weight: 700; color: var(--text-primary);">${exec.name}</h4>
                        <span class="status-badge info" style="margin-top: 5px; display: inline-block; font-size: 11px;">${roleTitle}</span>
                    </div>
                </div>
            `;
        });

        if (html === '') {
            container.innerHTML = '<div style="color: var(--text-secondary); text-align: center; width: 100%;">ไม่มีข้อมูลผู้บริหาร</div>';
        } else {
            container.innerHTML = html;
        }
    }

    // RENDER: Check-in page
    renderCheckin() {
        const checkinView = document.getElementById('view-checkin');
        
        // Hide class selector by default
        const selectorCard = document.getElementById('checkin-class-selector-card');
        const buttonsContainer = document.getElementById('checkin-class-buttons-container');
        if (selectorCard) selectorCard.style.display = 'none';

        // Permissions Guard: Must be teacher or admin
        if (!this.currentUser || (this.currentUser.role !== 'teacher' && this.currentUser.role !== 'admin')) {
            checkinView.innerHTML = `
                <div class="alert-banner" style="background-color: var(--danger-bg); border-color: var(--danger); color: var(--danger); margin: 0 0 24px 0;">
                    <i class="fa-solid fa-triangle-exclamation"></i>
                    <div>
                        <strong>ปฏิเสธการเข้าถึง!</strong> เฉพาะคุณครูผู้สอนหรือผู้ดูแลระบบเท่านั้นที่สามารถเข้าใช้งานหน้าเช็กชื่อนี้ได้
                    </div>
                </div>
                <div style="text-align: center; padding: 48px 0;">
                    <button class="btn btn-primary" onclick="app.openModal('login-modal')">
                        <i class="fa-solid fa-right-to-bracket"></i> เข้าสู่ระบบเพื่อเข้าใช้หน้าเช็กชื่อ
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

        if (!this.db || !this.db.bases || this.db.bases.length === 0) {
            const titleEl = document.getElementById('checkin-base-title');
            const infoEl = document.getElementById('checkin-base-info');
            if (titleEl) titleEl.textContent = "กำลังโหลดข้อมูล...";
            if (infoEl) infoEl.innerHTML = "<i class='fa-solid fa-spinner fa-spin'></i> กรุณารอระบบดึงข้อมูลจากระบบคลาวด์";

            const listContainer = document.getElementById('student-attendance-list-container');
            if (listContainer) {
                listContainer.innerHTML = `
                    <div class="skeleton-loader">
                        <div class="skeleton-item skeleton-title"></div>
                        <div class="skeleton-item skeleton-text"></div>
                        <div class="skeleton-item skeleton-text"></div>
                        <div class="skeleton-item skeleton-text short"></div>
                    </div>
                    <div style="text-align: center; margin-top: 16px; padding-bottom: 24px;">
                        <button class="btn btn-outline" id="btn-checkin-retry" onclick="app.retryCheckinDataLoad(event)">
                            <i class="fa-solid fa-rotate"></i> ลองโหลดข้อมูลใหม่
                        </button>
                    </div>
                `;
            }
            return;
        }

        const week = this.currentWeekInfo.week;
        const todayDate = this.systemDate;

        // Simplify view for teachers (remove teacher check-in, rating, comments, and uploads)
        const extrasSection = document.getElementById('checkin-extras-section');
        const saveStagingBtn = document.getElementById('btn-save-attendance-staging');
        const saveLiveBtn = document.getElementById('btn-save-attendance');

        if (this.currentUser && this.currentUser.role === 'teacher') {
            if (extrasSection) extrasSection.style.display = 'none';
            if (saveStagingBtn) saveStagingBtn.style.display = 'none';
            if (saveLiveBtn) {
                saveLiveBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> บันทึกข้อมูลการเช็กชื่อ';
                saveLiveBtn.style.padding = '14px 48px';
            }
        } else {
            if (extrasSection) extrasSection.style.display = 'grid';
            if (saveStagingBtn) saveStagingBtn.style.display = 'inline-flex';
            if (saveLiveBtn) {
                saveLiveBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> บันทึกข้อมูลหลักทันที (Live)';
                saveLiveBtn.style.padding = '14px 40px';
            }
        }

        // Admin Base Selector Logic
        const adminCard = document.getElementById('checkin-admin-base-selector-card');
        const adminSelect = document.getElementById('checkin-admin-base-select');
        
        let scheduleRow;
        if (this.currentUser.role === 'admin') {
            if (adminCard && adminSelect) {
                adminCard.style.display = 'block';
                if (adminSelect.children.length === 0) {
                    adminSelect.innerHTML = this.db.bases.map(b => `<option value="${b.id}">${b.name}</option>`).join('');
                    
                    // Listen for base selection change
                    adminSelect.addEventListener('change', (e) => {
                        this.adminSelectedBaseId = e.target.value;
                        this.renderCheckin();
                    });
                }
                if (!this.adminSelectedBaseId) {
                    if (this.currentUser.username === 'admin') {
                        this.adminSelectedBaseId = 'base5';
                    } else {
                        this.adminSelectedBaseId = adminSelect.value || 'base1';
                    }
                }
                adminSelect.value = this.adminSelectedBaseId;
            }
            scheduleRow = this.db.rotation_schedule.find(s => s.week === week && s.baseId === this.adminSelectedBaseId);
        } else {
            if (adminCard) adminCard.style.display = 'none';

            // Find schedule for this teacher today
            scheduleRow = this.db.rotation_schedule.find(
                s => {
                    if (s.week !== week) return false;
                    const ids = (s.teacherId || "").split(',').map(x => x.trim());
                    return ids.includes(this.currentUser.username);
                }
            );
        }

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
    setCheckinRating(rating) {
        this.currentCheckinRating = rating;
        const stars = document.querySelectorAll('#checkin-rating-stars i');
        stars.forEach((star, index) => {
            if (index < rating) {
                star.className = 'fa-solid fa-star';
                star.style.color = 'var(--accent)';
            } else {
                star.className = 'fa-regular fa-star';
                star.style.color = '#D1D5DB';
            }
        });
        const label = document.getElementById('checkin-rating-value-label');
        if (label) {
            label.textContent = rating.toFixed(1);
            label.style.display = 'inline';
        }
    }

    resetCheckinRating() {
        this.currentCheckinRating = 0;
        const stars = document.querySelectorAll('#checkin-rating-stars i');
        stars.forEach(star => {
            star.className = 'fa-regular fa-star';
            star.style.color = '#D1D5DB';
        });
        const label = document.getElementById('checkin-rating-value-label');
        if (label) {
            label.style.display = 'none';
        }
    }

    handleCheckinPhotoSelected(input) {
        const file = input.files[0];
        const label = document.getElementById('checkin-photo-filename-label');
        const previewContainer = document.getElementById('checkin-photo-preview-container');
        const preview = document.getElementById('checkin-photo-preview');
        
        if (!file) {
            this.clearCheckinPhoto();
            return;
        }

        if (label) label.textContent = file.name;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                
                const MAX_WIDTH = 800;
                const MAX_HEIGHT = 600;
                
                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }
                
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
                this.currentCheckinPhotoBase64 = compressedBase64;
                this.currentCheckinPhotoName = file.name;
                
                if (preview) preview.src = compressedBase64;
                if (previewContainer) previewContainer.style.display = 'block';
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    clearCheckinPhoto(e) {
        if (e) e.preventDefault();
        this.currentCheckinPhotoBase64 = null;
        this.currentCheckinPhotoName = '';
        const input = document.getElementById('checkin-photo-input');
        if (input) input.value = '';
        const label = document.getElementById('checkin-photo-filename-label');
        if (label) label.textContent = 'ไม่ได้เลือกไฟล์';
        const previewContainer = document.getElementById('checkin-photo-preview-container');
        if (previewContainer) previewContainer.style.display = 'none';
        const preview = document.getElementById('checkin-photo-preview');
        if (preview) preview.src = '#';
    }

    handleCheckinDocSelected(input) {
        const file = input.files[0];
        const label = document.getElementById('checkin-doc-filename-label');
        
        if (!file) {
            this.currentCheckinDocBase64 = null;
            this.currentCheckinDocName = '';
            this.currentCheckinDocType = '';
            if (label) label.textContent = 'ไม่ได้เลือกไฟล์';
            return;
        }

        if (label) label.textContent = file.name;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            this.currentCheckinDocBase64 = e.target.result;
            this.currentCheckinDocName = file.name;
            this.currentCheckinDocType = file.type;
        };
        reader.readAsDataURL(file);
    }

    async saveCurrentAttendance() {
        await this.saveCurrentAttendanceWithOptions(false);
    }

    async saveCurrentAttendanceWithOptions(isStaging) {
        const week = this.currentWeekInfo.week;
        const todayDate = this.systemDate;
        const scheduleRow = this.currentCheckinSchedule;

        if (!scheduleRow) return;

        if (!this.selectedCheckinClass) {
            alert("กรุณาเลือกชั้นเรียนที่จะทำการสอนก่อนบันทึก!");
            return;
        }

        let uncheckedCount = 0;
        this.currentCheckinStudents.forEach(st => {
            if (!this.attendanceState[st.studentId]) uncheckedCount++;
        });

        if (uncheckedCount > 0 && !isStaging) {
            if (!confirm(`ยังไม่ได้เช็กชื่อนักเรียนของห้อง ${this.selectedCheckinClass} อีก ${uncheckedCount} คน คุณแน่ใจว่าต้องการบันทึกการเช็กชื่อหลัก (Live) หรือไม่?`)) {
                return;
            }
        }

        const studentIdsToSave = this.currentCheckinStudents.map(st => st.studentId);
        const timestamp = new Date().toISOString();
        
        const teacherCheckboxes = document.querySelectorAll('input[name="checkin-teacher-checkbox"]:checked');
        let checkedTeachers = Array.from(teacherCheckboxes).map(cb => cb.value);
        if (checkedTeachers.length === 0 && this.currentUser && this.currentUser.role === 'teacher') {
            checkedTeachers = [this.currentUser.username];
        }

        const rating = this.currentCheckinRating || 5;
        const notesEl = document.getElementById('checkin-evaluation-notes');
        const notes = notesEl ? notesEl.value.trim() : '';

        const studentAttendanceList = [];
        this.currentCheckinStudents.forEach(st => {
            const status = this.attendanceState[st.studentId];
            if (status) {
                studentAttendanceList.push({
                    studentId: st.studentId,
                    status: status
                });
            }
        });

        if (isStaging) {
            const batchId = `${todayDate}_${scheduleRow.baseId}_${this.selectedCheckinClass}`.replace(/\//g, '-');
            const stagingLogObj = {
                batchId: batchId,
                date: todayDate,
                week: week,
                baseId: scheduleRow.baseId,
                classId: this.selectedCheckinClass,
                checkedBy: this.currentUser.username,
                timestamp: timestamp,
                teachers: checkedTeachers,
                rating: rating,
                notes: notes,
                photo: this.currentCheckinPhotoBase64 || null,
                photoName: this.currentCheckinPhotoName || '',
                doc: this.currentCheckinDocBase64 || null,
                docName: this.currentCheckinDocName || '',
                docType: this.currentCheckinDocType || '',
                students: studentAttendanceList,
                semesterId: this.db.activeSemesterId || "1-2569"
            };

            this.db.staging_logs = this.db.staging_logs || [];
            this.db.staging_logs = this.db.staging_logs.filter(log => log.batchId !== batchId);
            this.db.staging_logs.push(stagingLogObj);
            
            if (this.useFirestore) {
                try {
                    await this.firestore.collection('staging_logs').doc(batchId).set(stagingLogObj);
                } catch (e) {
                    console.error("Failed to sync staging log to Firestore:", e);
                }
            }

            this.saveDatabase(false);
            this.showStatusModal('success', 'บันทึกแบบร่างสำเร็จ', `บันทึกร่างข้อมูลเช็กชื่อห้อง <strong>${this.selectedCheckinClass}</strong> เรียบร้อยแล้ว! ข้อมูลจะอยู่ในกล่องพักข้อมูลเพื่อรออนุมัติ`);
            const redirectView = (this.currentUser && this.currentUser.role === 'teacher') ? 'checkin' : 'dashboard';
            this.switchView(redirectView);
        } else {
            this.db.attendance_logs = this.db.attendance_logs.filter(
                log => !(log.date === todayDate && log.baseId === scheduleRow.baseId && studentIdsToSave.includes(log.studentId) && log.semesterId === this.db.activeSemesterId)
            );

            const newAttendanceLogs = [];
            studentAttendanceList.forEach(item => {
                const logObj = {
                    date: todayDate,
                    week: week,
                    baseId: scheduleRow.baseId,
                    studentId: item.studentId,
                    status: item.status,
                    checkedBy: this.currentUser.username,
                    timestamp: timestamp,
                    semesterId: this.db.activeSemesterId || "1-2569"
                };
                this.db.attendance_logs.push(logObj);
                newAttendanceLogs.push(logObj);
            });

            const activityLogId = `${todayDate}_${scheduleRow.baseId}_${this.selectedCheckinClass}`.replace(/\//g, '-');
            const baseActivityLogObj = {
                id: activityLogId,
                date: todayDate,
                week: week,
                baseId: scheduleRow.baseId,
                classId: this.selectedCheckinClass,
                checkedBy: this.currentUser.username,
                timestamp: timestamp,
                teachers: checkedTeachers,
                rating: rating,
                notes: notes,
                photo: this.currentCheckinPhotoBase64 || null,
                photoName: this.currentCheckinPhotoName || '',
                doc: this.currentCheckinDocBase64 || null,
                docName: this.currentCheckinDocName || '',
                docType: this.currentCheckinDocType || '',
                semesterId: this.db.activeSemesterId || "1-2569"
            };

            this.db.base_activity_logs = this.db.base_activity_logs || [];
            this.db.base_activity_logs = this.db.base_activity_logs.filter(log => log.id !== activityLogId);
            this.db.base_activity_logs.push(baseActivityLogObj);

            if (this.useFirestore) {
                try {
                    const batch = this.firestore.batch();
                    
                    studentIdsToSave.forEach(stId => {
                        const docId = `${todayDate}_${scheduleRow.baseId}_${stId}`;
                        const docRef = this.firestore.collection('attendance_logs').doc(docId);
                        batch.delete(docRef);
                    });

                    newAttendanceLogs.forEach(log => {
                        const docId = `${log.date}_${log.baseId}_${log.studentId}`;
                        const docRef = this.firestore.collection('attendance_logs').doc(docId);
                        batch.set(docRef, log);
                    });

                    const actDocRef = this.firestore.collection('base_activity_logs').doc(activityLogId);
                    batch.set(actDocRef, baseActivityLogObj);

                    await batch.commit();
                } catch (e) {
                    console.error("Failed to sync live check-in logs to Firestore:", e);
                }
            }

            this.saveDatabase(false);
            this.showStatusModal('success', 'บันทึกข้อมูลสำเร็จ (Live)', `เช็กชื่อและบันทึกข้อมูลหลักห้อง <strong>${this.selectedCheckinClass}</strong> เรียบร้อยแล้ว!`);
            const redirectView = (this.currentUser && this.currentUser.role === 'teacher') ? 'checkin' : 'dashboard';
            this.switchView(redirectView);
        }
    }

    async syncStagingBatch(batchId) {
        const log = this.db.staging_logs.find(x => x.batchId === batchId);
        if (!log) return;

        const todayDate = log.date;
        const week = log.week;
        const baseId = log.baseId;
        const classId = log.classId;
        const timestamp = log.timestamp;
        const semesterId = log.semesterId;

        const parts = classId.split('/');
        const grade = parts[0];
        const room = parseInt(parts[1]);
        const classStudents = this.db.students.filter(st => st.grade === grade && st.room === room && st.semesterId === semesterId);
        const studentIds = classStudents.map(st => st.studentId);

        this.db.attendance_logs = this.db.attendance_logs.filter(
            al => !(al.date === todayDate && al.baseId === baseId && studentIds.includes(al.studentId) && al.semesterId === semesterId)
        );

        const newAttendanceLogs = [];
        log.students.forEach(stItem => {
            const logObj = {
                date: todayDate,
                week: week,
                baseId: baseId,
                studentId: stItem.studentId,
                status: stItem.status,
                checkedBy: log.checkedBy,
                timestamp: timestamp,
                semesterId: semesterId
            };
            this.db.attendance_logs.push(logObj);
            newAttendanceLogs.push(logObj);
        });

        const activityLogId = `${todayDate}_${baseId}_${classId}`.replace(/\//g, '-');
        const baseActivityLogObj = {
            id: activityLogId,
            date: todayDate,
            week: week,
            baseId: baseId,
            classId: classId,
            checkedBy: log.checkedBy,
            timestamp: timestamp,
            teachers: log.teachers,
            rating: log.rating,
            notes: log.notes,
            photo: log.photo,
            photoName: log.photoName,
            doc: log.doc,
            docName: log.docName,
            docType: log.docType,
            semesterId: semesterId
        };

        this.db.base_activity_logs = this.db.base_activity_logs || [];
        this.db.base_activity_logs = this.db.base_activity_logs.filter(x => x.id !== activityLogId);
        this.db.base_activity_logs.push(baseActivityLogObj);

        this.db.staging_logs = this.db.staging_logs.filter(x => x.batchId !== batchId);

        if (this.useFirestore) {
            try {
                const batch = this.firestore.batch();
                
                studentIds.forEach(stId => {
                    const docId = `${todayDate}_${baseId}_${stId}`;
                    const docRef = this.firestore.collection('attendance_logs').doc(docId);
                    batch.delete(docRef);
                });

                newAttendanceLogs.forEach(al => {
                    const docId = `${al.date}_${al.baseId}_${al.studentId}`;
                    const docRef = this.firestore.collection('attendance_logs').doc(docId);
                    batch.set(docRef, al);
                });

                const actDocRef = this.firestore.collection('base_activity_logs').doc(activityLogId);
                batch.set(actDocRef, baseActivityLogObj);

                const stagingDocRef = this.firestore.collection('staging_logs').doc(batchId);
                batch.delete(stagingDocRef);

                await batch.commit();
            } catch (e) {
                console.error("Failed to sync approved staging batch to Firestore:", e);
            }
        }

        this.saveDatabase(false);
        this.closeModal('staging-details-modal');
        this.loadStagingLogs();
        this.updateStagingBadgeCount();
        this.showStatusModal('success', 'อนุมัติเรียบร้อย', `อนุมัติและซิงก์ข้อมูลชั้นเรียน <strong>${classId}</strong> ขึ้นระบบคลาวด์สำเร็จ!`);
    }

    async deleteStagingBatch(batchId) {
        if (!confirm("คุณแน่ใจว่าต้องการลบดราฟต์นี้ทิ้ง? ข้อมูลที่เช็กชื่อไว้ชั่วคราวจะสูญหาย")) {
            return;
        }

        this.db.staging_logs = this.db.staging_logs.filter(x => x.batchId !== batchId);

        if (this.useFirestore) {
            try {
                await this.firestore.collection('staging_logs').doc(batchId).delete();
            } catch (e) {
                console.error("Failed to delete staging log from Firestore:", e);
            }
        }

        this.saveDatabase(false);
        this.closeModal('staging-details-modal');
        this.loadStagingLogs();
        this.updateStagingBadgeCount();
    }

    async syncAllStagingLogsToCloud() {
        const activeSemesterLogs = this.db.staging_logs ? this.db.staging_logs.filter(log => log.semesterId === (this.db.activeSemesterId || "1-2569")) : [];
        if (activeSemesterLogs.length === 0) {
            alert("ไม่มีข้อมูลเช็กชื่อที่ค้างอยู่ในกล่องพักข้อมูล");
            return;
        }

        if (!confirm(`คุณแน่ใจว่าต้องการอนุมัติและซิงก์ข้อมูลเช็กชื่อทั้งหมดจำนวน ${activeSemesterLogs.length} รายการ ขึ้นระบบคลาวด์ทันที?`)) {
            return;
        }

        const btn = document.getElementById('btn-staging-sync-all');
        const originalText = btn ? btn.innerHTML : '';
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> กำลังซิงค์ทั้งหมด...';
        }

        const logsToSync = [...activeSemesterLogs];
        for (const log of logsToSync) {
            const todayDate = log.date;
            const week = log.week;
            const baseId = log.baseId;
            const classId = log.classId;
            const timestamp = log.timestamp;
            const semesterId = log.semesterId;

            const parts = classId.split('/');
            const grade = parts[0];
            const room = parseInt(parts[1]);
            const classStudents = this.db.students.filter(st => st.grade === grade && st.room === room && st.semesterId === semesterId);
            const studentIds = classStudents.map(st => st.studentId);

            this.db.attendance_logs = this.db.attendance_logs.filter(
                al => !(al.date === todayDate && al.baseId === baseId && studentIds.includes(al.studentId) && al.semesterId === semesterId)
            );

            const newAttendanceLogs = [];
            log.students.forEach(stItem => {
                const logObj = {
                    date: todayDate,
                    week: week,
                    baseId: baseId,
                    studentId: stItem.studentId,
                    status: stItem.status,
                    checkedBy: log.checkedBy,
                    timestamp: timestamp,
                    semesterId: semesterId
                };
                this.db.attendance_logs.push(logObj);
                newAttendanceLogs.push(logObj);
            });

            const activityLogId = `${todayDate}_${baseId}_${classId}`.replace(/\//g, '-');
            const baseActivityLogObj = {
                id: activityLogId,
                date: todayDate,
                week: week,
                baseId: baseId,
                classId: classId,
                checkedBy: log.checkedBy,
                timestamp: timestamp,
                teachers: log.teachers,
                rating: log.rating,
                notes: log.notes,
                photo: log.photo,
                photoName: log.photoName,
                doc: log.doc,
                docName: log.docName,
                docType: log.docType,
                semesterId: semesterId
            };

            this.db.base_activity_logs = this.db.base_activity_logs || [];
            this.db.base_activity_logs = this.db.base_activity_logs.filter(x => x.id !== activityLogId);
            this.db.base_activity_logs.push(baseActivityLogObj);

            this.db.staging_logs = this.db.staging_logs.filter(x => x.batchId !== log.batchId);

            if (this.useFirestore) {
                try {
                    const batch = this.firestore.batch();
                    
                    studentIds.forEach(stId => {
                        const docId = `${todayDate}_${baseId}_${stId}`;
                        const docRef = this.firestore.collection('attendance_logs').doc(docId);
                        batch.delete(docRef);
                    });

                    newAttendanceLogs.forEach(al => {
                        const docId = `${al.date}_${al.baseId}_${al.studentId}`;
                        const docRef = this.firestore.collection('attendance_logs').doc(docId);
                        batch.set(docRef, al);
                    });

                    const actDocRef = this.firestore.collection('base_activity_logs').doc(activityLogId);
                    batch.set(actDocRef, baseActivityLogObj);

                    const stagingDocRef = this.firestore.collection('staging_logs').doc(log.batchId);
                    batch.delete(stagingDocRef);

                    await batch.commit();
                } catch (e) {
                    console.error(`Failed to sync staging log ${log.batchId} in bulk:`, e);
                }
            }
        }

        this.saveDatabase(false);

        if (btn) {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }

        this.loadStagingLogs();
        this.updateStagingBadgeCount();
        this.showStatusModal('success', 'อนุมัติทั้งหมดสำเร็จ', 'อนุมัติและซิงก์ข้อมูลเช็กชื่อทั้งหมดขึ้นเซิร์ฟเวอร์หลักเสร็จสิ้นเรียบร้อยแล้ว!');
    }

    loadStagingLogs() {
        const tbody = document.getElementById('staging-logs-table-body');
        if (!tbody) return;

        this.db.staging_logs = this.db.staging_logs || [];
        const activeSemesterLogs = this.db.staging_logs.filter(log => log.semesterId === (this.db.activeSemesterId || "1-2569"));

        if (activeSemesterLogs.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; color: var(--text-secondary); padding: 24px;">ไม่มีข้อมูลร่างเช็กชื่อรออนุมัติในเทอมนี้</td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = '';
        activeSemesterLogs.forEach(log => {
            const tr = document.createElement('tr');
            const formattedDate = this.formatThaiDate(log.date);
            const formattedTime = new Date(log.timestamp).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
            
            const base = this.db.bases.find(b => b.id === log.baseId);
            const baseName = base ? base.name : log.baseId;
            const teacher = this.db.teachers.find(t => t.username === log.checkedBy);
            const teacherName = teacher ? teacher.name : log.checkedBy;
            
            tr.innerHTML = `
                <td><strong>${formattedDate}</strong> <small style="color:var(--text-secondary);">${formattedTime} น.</small></td>
                <td>สัปดาห์ที่ ${log.week}</td>
                <td><span class="base-badge base-${log.baseId}">${baseName}</span></td>
                <td><strong>${log.classId}</strong></td>
                <td>${teacherName}</td>
                <td><strong>${log.students ? log.students.length : 0}</strong> คน</td>
                <td>
                    <button class="btn btn-outline btn-xs" onclick="app.openStagingDetailsModal('${log.batchId}')">
                        <i class="fa-solid fa-eye"></i> ตรวจสอบ & อนุมัติ
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    openStagingDetailsModal(batchId) {
        const log = this.db.staging_logs.find(x => x.batchId === batchId);
        if (!log) return;

        this.currentReviewStagingBatchId = batchId;

        document.getElementById('staging-detail-date').textContent = `${this.formatThaiDate(log.date)} (${new Date(log.timestamp).toLocaleTimeString('th-TH')} น.)`;
        
        const base = this.db.bases.find(b => b.id === log.baseId);
        const baseName = base ? base.name : log.baseId;
        document.getElementById('staging-detail-base').textContent = baseName;
        document.getElementById('staging-detail-class').textContent = log.classId;
        
        const teacher = this.db.teachers.find(t => t.username === log.checkedBy);
        const teacherName = teacher ? teacher.name : log.checkedBy;
        document.getElementById('staging-detail-teacher').textContent = teacherName;

        const studentListTbody = document.getElementById('staging-detail-student-list');
        if (studentListTbody) {
            studentListTbody.innerHTML = '';
            
            if (log.students && log.students.length > 0) {
                log.students.forEach((stItem) => {
                    const student = this.db.students.find(s => s.studentId === stItem.studentId);
                    const name = student ? student.name : `รหัส: ${stItem.studentId}`;
                    const no = student ? student.no : '-';
                    
                    const statusLabels = {
                        present: '<span class="status-badge" style="background-color: var(--primary-light); color: white;">มาเรียน</span>',
                        absent: '<span class="status-badge" style="background-color: var(--danger); color: white;">ขาด</span>',
                        leave: '<span class="status-badge" style="background-color: #D97706; color: white;">ลา</span>',
                        late: '<span class="status-badge" style="background-color: #4B5563; color: white;">สาย</span>',
                        activity: '<span class="status-badge" style="background-color: #8B5CF6; color: white;">กิจกรรม</span>'
                    };
                    
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td style="text-align: center;">${no}</td>
                        <td>${stItem.studentId}</td>
                        <td><strong>${name}</strong></td>
                        <td style="text-align: center;">${statusLabels[stItem.status] || stItem.status}</td>
                    `;
                    studentListTbody.appendChild(tr);
                });
            } else {
                studentListTbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-secondary);">ไม่มีนักเรียนที่เช็กชื่อ</td></tr>`;
            }
        }

        const extrasContainer = document.getElementById('staging-detail-extras');
        if (extrasContainer) {
            extrasContainer.innerHTML = '';
            
            let teachersListStr = '-';
            if (log.teachers && log.teachers.length > 0) {
                teachersListStr = log.teachers.map(tUsername => {
                    const t = this.db.teachers.find(x => x.username === tUsername);
                    return t ? t.name : tUsername;
                }).join(', ');
            }
            
            let starsHtml = '';
            for (let i = 1; i <= 5; i++) {
                if (i <= log.rating) {
                    starsHtml += '<i class="fa-solid fa-star" style="color: var(--accent); margin-right: 2px;"></i>';
                } else {
                    starsHtml += '<i class="fa-regular fa-star" style="color: #D1D5DB; margin-right: 2px;"></i>';
                }
            }

            let html = `
                <div style="background: var(--gray-light); padding: 12px; border-radius: var(--radius-md); border: 1px solid var(--border-color); display: flex; flex-direction: column; gap: 10px; margin-top: 16px;">
                    <div><strong>ครูประจำฐานปฏิบัติหน้าที่:</strong> <span style="color: var(--text-primary);">${teachersListStr}</span></div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <strong>ประเมินผลกิจกรรม:</strong> 
                        <span style="display: inline-flex;">${starsHtml}</span>
                        <span style="font-weight: 700; color: var(--accent); margin-left: 4px;">${log.rating.toFixed(1)}</span>
                    </div>
                    <div><strong>บันทึกเพิ่มเติม:</strong> <span style="font-style: italic; color: var(--text-primary);">${log.notes || 'ไม่มีบันทึกเพิ่มเติม'}</span></div>
                </div>
            `;
            
            if (log.photo) {
                html += `
                    <div style="margin-top: 16px;">
                        <strong>ภาพถ่ายกิจกรรม:</strong>
                        <div style="margin-top: 8px; max-width: 100%;">
                            <img src="${log.photo}" alt="Staging Photo Preview" style="max-width: 100%; max-height: 250px; border-radius: var(--radius-md); border: 1px solid var(--border-color); box-shadow: var(--shadow-sm);">
                        </div>
                    </div>
                `;
            }

            if (log.doc) {
                html += `
                    <div style="margin-top: 16px; display: flex; align-items: center; gap: 8px; background: #EFF6FF; border: 1px solid #BFDBFE; padding: 10px; border-radius: var(--radius-md);">
                        <i class="fa-solid fa-file-pdf" style="font-size: 24px; color: #2563EB;"></i>
                        <div style="flex: 1;">
                            <div style="font-weight: bold; font-size: 13px; color: #1E40AF; word-break: break-all;">${log.docName || 'เอกสารแนบ'}</div>
                            <div style="font-size: 11px; color: #1E3A8A;">มีข้อมูลเอกสารแนบพร้อมอัปโหลดขึ้นระบบ</div>
                        </div>
                        <a href="${log.doc}" download="${log.docName}" class="btn btn-outline btn-xs" style="background: white; border-color: #BFDBFE; color: #2563EB;"><i class="fa-solid fa-download"></i> ดาวน์โหลดร่าง</a>
                    </div>
                `;
            }
            
            extrasContainer.innerHTML = html;
        }

        this.openModal('staging-details-modal');
    }

    updateStagingBadgeCount() {
        const badge = document.getElementById('staging-logs-count-badge');
        if (!badge) return;

        const count = this.db.staging_logs ? this.db.staging_logs.filter(log => log.semesterId === (this.db.activeSemesterId || "1-2569")).length : 0;
        if (count > 0) {
            badge.textContent = count;
            badge.style.display = 'inline-block';
        } else {
            badge.style.display = 'none';
        }
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
        this.renderExecutiveCards('admin-executives-container');
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
        
        // Reset selections
        this.selectedStudents = [];
        this.selectedTeachers = [];
        const checkAllStudents = document.getElementById('check-all-students');
        if (checkAllStudents) checkAllStudents.checked = false;
        const checkAllTeachers = document.getElementById('check-all-teachers');
        if (checkAllTeachers) checkAllTeachers.checked = false;
        this.updateStudentSelectionUI();
        this.updateTeacherSelectionUI();

        // Update tab buttons style
        const tabs = ['students', 'teachers', 'bases', 'schedule', 'semesters', 'staging', 'import', 'cloud'];
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
        } else if (tabId === 'semesters') {
            this.renderManageSemesters();
        } else if (tabId === 'staging') {
            this.loadStagingLogs();
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

        // Sync master checkbox state
        const master = document.getElementById('check-all-students');
        if (master) {
            const allVisibleSelected = paginated.length > 0 && paginated.every(st => this.selectedStudents.includes(st.studentId));
            master.checked = allVisibleSelected;
        }

        const tbody = document.getElementById('manage-students-table-body');
        tbody.innerHTML = '';

        paginated.forEach(st => {
            const isChecked = this.selectedStudents.includes(st.studentId);
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="text-align: center;">
                    <input type="checkbox" class="student-select-checkbox" value="${st.studentId}" ${isChecked ? 'checked' : ''} onchange="app.handleStudentCheckboxChange(this)">
                </td>
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

        // Sync master checkbox state
        const master = document.getElementById('check-all-teachers');
        if (master) {
            const allVisibleSelected = this.db.teachers.length > 0 && this.db.teachers.every(t => this.selectedTeachers.includes(t.username));
            master.checked = allVisibleSelected;
        }

        this.db.teachers.forEach(t => {
            let roleBadge = '<span class="status-badge info">ครูผู้สอน</span>';
            if (t.role === 'admin') {
                roleBadge = '<span class="status-badge activity" style="background-color:#E0F2FE; color:#0369A1;">แอดมิน</span>';
            } else if (t.role === 'director') {
                roleBadge = '<span class="status-badge activity">ผู้บริหาร</span>';
            }

            let authStatusBadge = '';
            if (t.role === 'admin' || t.role === 'director') {
                authStatusBadge = '<span class="status-badge info" style="background-color:#E2E8F0; color:#475569;">บัญชีระบบ</span>';
            } else {
                if (t.isAuthCreated) {
                    authStatusBadge = '<span class="status-badge success" style="background-color:#DCFCE7; color:#16A34A; font-weight:600;"><i class="fa-solid fa-circle-check"></i> เปิดใช้งานแล้ว</span>';
                } else {
                    authStatusBadge = '<span class="status-badge" style="background-color:#F1F5F9; color:#94A3B8;"><i class="fa-solid fa-clock"></i> รอการล็อกอิน</span>';
                }
            }

            let resetBtn = '';
            if (t.role !== 'admin' && t.role !== 'director') {
                resetBtn = `
                    <button class="btn btn-outline btn-sm" style="color:var(--primary);" onclick="app.resetTeacherPassword('${t.username}')">
                        <i class="fa-solid fa-key"></i> รีเซ็ตรหัส
                    </button>
                `;
            }

            const isChecked = this.selectedTeachers.includes(t.username);
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="text-align: center;">
                    <input type="checkbox" class="teacher-select-checkbox" value="${t.username}" ${isChecked ? 'checked' : ''} onchange="app.handleTeacherCheckboxChange(this)">
                </td>
                <td style="font-family:'Outfit';">${t.username}</td>
                <td style="font-weight:600;">${t.name}</td>
                <td>${roleBadge}</td>
                <td>${authStatusBadge}</td>
                <td>
                    <button class="btn btn-outline btn-sm" onclick="app.openEditTeacherModal('${t.username}')">
                        <i class="fa-solid fa-pen-to-square"></i> แก้ไข
                    </button>
                    ${resetBtn}
                    <button class="btn btn-outline btn-sm" style="color:var(--danger);" onclick="app.deleteTeacher('${t.username}')">
                        <i class="fa-solid fa-trash"></i> ลบ
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    toggleCheckAllStudents(masterCheckbox) {
        const checkboxes = document.querySelectorAll('.student-select-checkbox');
        checkboxes.forEach(cb => {
            cb.checked = masterCheckbox.checked;
            const val = cb.value;
            if (masterCheckbox.checked) {
                if (!this.selectedStudents.includes(val)) {
                    this.selectedStudents.push(val);
                }
            } else {
                this.selectedStudents = this.selectedStudents.filter(id => id !== val);
            }
        });
        this.updateStudentSelectionUI();
    }

    toggleCheckAllTeachers(masterCheckbox) {
        const checkboxes = document.querySelectorAll('.teacher-select-checkbox');
        checkboxes.forEach(cb => {
            cb.checked = masterCheckbox.checked;
            const val = cb.value;
            if (masterCheckbox.checked) {
                if (!this.selectedTeachers.includes(val)) {
                    this.selectedTeachers.push(val);
                }
            } else {
                this.selectedTeachers = this.selectedTeachers.filter(username => username !== val);
            }
        });
        this.updateTeacherSelectionUI();
    }

    handleStudentCheckboxChange(cb) {
        const val = cb.value;
        if (cb.checked) {
            if (!this.selectedStudents.includes(val)) {
                this.selectedStudents.push(val);
            }
        } else {
            this.selectedStudents = this.selectedStudents.filter(id => id !== val);
        }
        
        // Sync master checkbox state
        const master = document.getElementById('check-all-students');
        if (master) {
            const checkboxes = document.querySelectorAll('.student-select-checkbox');
            const allChecked = Array.from(checkboxes).every(x => x.checked);
            master.checked = checkboxes.length > 0 && allChecked;
        }
        this.updateStudentSelectionUI();
    }

    handleTeacherCheckboxChange(cb) {
        const val = cb.value;
        if (cb.checked) {
            if (!this.selectedTeachers.includes(val)) {
                this.selectedTeachers.push(val);
            }
        } else {
            this.selectedTeachers = this.selectedTeachers.filter(username => username !== val);
        }
        
        // Sync master checkbox state
        const master = document.getElementById('check-all-teachers');
        if (master) {
            const checkboxes = document.querySelectorAll('.teacher-select-checkbox');
            const allChecked = Array.from(checkboxes).every(x => x.checked);
            master.checked = checkboxes.length > 0 && allChecked;
        }
        this.updateTeacherSelectionUI();
    }

    updateStudentSelectionUI() {
        const count = this.selectedStudents.length;
        const btn = document.getElementById('btn-delete-selected-students');
        const countEl = document.getElementById('selected-students-count');
        if (btn && countEl) {
            if (count > 0) {
                btn.style.display = 'inline-block';
                countEl.textContent = count;
            } else {
                btn.style.display = 'none';
            }
        }
    }

    updateTeacherSelectionUI() {
        const count = this.selectedTeachers.length;
        const btn = document.getElementById('btn-delete-selected-teachers');
        const countEl = document.getElementById('selected-teachers-count');
        if (btn && countEl) {
            if (count > 0) {
                btn.style.display = 'inline-block';
                countEl.textContent = count;
            } else {
                btn.style.display = 'none';
            }
        }
    }

    async deleteSelectedStudents() {
        const count = this.selectedStudents.length;
        if (count === 0) return;
        
        if (confirm(`คุณแน่ใจว่าต้องการลบข้อมูลนักเรียนที่เลือกทั้งหมดจำนวน ${count} คน ใช่หรือไม่?\n(ประวัติการเข้าเรียนของนักเรียนกลุ่มนี้จะถูกลบไปด้วย)`)) {
            // Filter out logs associated with these students too
            this.db.students = this.db.students.filter(st => !this.selectedStudents.includes(st.studentId));
            this.db.attendance_logs = this.db.attendance_logs.filter(log => !this.selectedStudents.includes(log.studentId));
            
            if (this.useFirestore) {
                try {
                    const promises = this.selectedStudents.map(studentId => 
                        this.firestore.collection('attendance_logs').where('studentId', '==', studentId).get()
                    );
                    const snapshots = await Promise.all(promises);
                    const batch = this.firestore.batch();
                    let countOps = 0;
                    
                    snapshots.forEach(snapshot => {
                        snapshot.docs.forEach(doc => {
                            batch.delete(doc.ref);
                            countOps++;
                        });
                    });
                    
                    if (countOps > 0) {
                        await batch.commit();
                    }
                } catch (e) {
                    console.error("Failed to delete selected student logs from Firestore:", e);
                }
            }

            this.saveDatabase(false);
            this.logAudit(`Bulk deleted ${count} students`);
            
            // Reset selection
            this.selectedStudents = [];
            this.updateStudentSelectionUI();
            
            const master = document.getElementById('check-all-students');
            if (master) master.checked = false;
            
            this.renderManageStudents();
            this.showStatusModal('success', 'ลบข้อมูลสำเร็จ', `ทำการลบข้อมูลนักเรียนจำนวน ${count} คน เรียบร้อยแล้ว`);
        }
    }

    deleteSelectedTeachers() {
        const count = this.selectedTeachers.length;
        if (count === 0) return;

        // Safety check to prevent deletion of protected system accounts
        const protectedUsernames = ['director', 'deputy1', 'deputy2', 'admin'];
        const selectedProtected = this.selectedTeachers.filter(username => protectedUsernames.includes(username));
        
        if (selectedProtected.length > 0) {
            alert(`ไม่สามารถลบบัญชีผู้บริหารหรือผู้ดูแลระบบหลักได้! (${selectedProtected.join(', ')})`);
            return;
        }

        if (confirm(`คุณแน่ใจว่าต้องการลบข้อมูลคุณครูที่เลือกทั้งหมดจำนวน ${count} ท่าน ใช่หรือไม่?`)) {
            // Remove teachers
            this.db.teachers = this.db.teachers.filter(t => !this.selectedTeachers.includes(t.username));
            
            this.saveDatabase();
            this.logAudit(`Bulk deleted ${count} teachers`);
            
            // Reset selection
            this.selectedTeachers = [];
            this.updateTeacherSelectionUI();
            
            const master = document.getElementById('check-all-teachers');
            if (master) master.checked = false;
            
            this.renderManageTeachers();
            this.showStatusModal('success', 'ลบข้อมูลสำเร็จ', `ทำการลบข้อมูลคุณครูจำนวน ${count} ท่าน เรียบร้อยแล้ว`);
        }
    }

    // Sub-tab: Bases CRUD
    renderManageBases() {
        const tbody = document.getElementById('manage-bases-table-body');
        tbody.innerHTML = '';

        this.db.bases.forEach(b => {
            // Build class-room mapping badges
            const classRooms = b.classRooms || {};
            const entries = Object.entries(classRooms);
            let classRoomHtml = '';
            if (entries.length === 0) {
                classRoomHtml = `<span style="font-size:12px; color:var(--text-secondary); font-style:italic;">ยังไม่ได้กำหนด</span>`;
            } else {
                classRoomHtml = entries.map(([cls, room]) =>
                    `<span class="status-badge info" style="margin:2px; font-size:11px; display:inline-flex; align-items:center; gap:4px;">
                        <i class="fa-solid fa-users" style="font-size:9px;"></i>${cls}
                        <i class="fa-solid fa-arrow-right" style="font-size:9px; opacity:0.6;"></i>
                        <i class="fa-solid fa-door-open" style="font-size:9px;"></i>${room}
                    </span>`
                ).join('');
            }

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="font-weight:700; color:var(--primary-dark);">${b.name}</td>
                <td><i class="fa-solid fa-location-dot"></i> ${b.defaultRoom}</td>
                <td style="max-width: 220px;">
                    <div style="display:flex; flex-wrap:wrap; gap:2px; margin-bottom:4px;">${classRoomHtml}</div>
                    <button class="btn btn-outline btn-sm" style="font-size:11px; padding: 3px 8px; color:var(--primary);" onclick="app.openManageBaseClassRoomsModal('${b.id}')">
                        <i class="fa-solid fa-door-open"></i> ${entries.length > 0 ? 'แก้ไขห้องเรียน' : 'เพิ่มห้องเรียน'}
                    </button>
                </td>
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

    async deleteStudent(studentId) {
        if (confirm(`คุณแน่ใจว่าต้องการลบรายชื่อนักเรียน รหัส ${studentId} หรือไม่?`)) {
            this.db.students = this.db.students.filter(s => s.studentId !== studentId);
            this.db.attendance_logs = this.db.attendance_logs.filter(log => log.studentId !== studentId);
            
            if (this.useFirestore) {
                try {
                    const snapshot = await this.firestore.collection('attendance_logs').where('studentId', '==', studentId).get();
                    const batch = this.firestore.batch();
                    snapshot.docs.forEach(doc => batch.delete(doc.ref));
                    await batch.commit();
                } catch (e) {
                    console.error("Failed to delete student logs from Firestore:", e);
                }
            }

            this.saveDatabase(false);
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
            const defaultPassword = passwordVal || username;
            if (defaultPassword.length < 6) {
                alert("สำหรับความปลอดภัย รหัสผู้ใช้งานหรือรหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร!");
                return;
            }
            const newTeacher = { username, name, role };
            if (passwordVal) {
                newTeacher.password = passwordVal;
            }
            this.db.teachers.push(newTeacher);
            this.logAudit(`Added teacher: ${name} (Username: ${username})`);
        } else { // Edit
            if (passwordVal && passwordVal.length < 6) {
                alert("รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร!");
                return;
            }
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
        if (username === 'director' || username === 'admin' || username === 'deputy1' || username === 'deputy2') {
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

    async resetTeacherPassword(username) {
        const teacher = this.db.teachers.find(t => t.username === username);
        if (!teacher) {
            this.showStatusModal('error', 'ไม่พบรายชื่อครู', `ไม่พบครูผู้สอนชื่อผู้ใช้: ${username}`);
            return;
        }

        const confirmReset = confirm(`คุณต้องการรีเซ็ตรหัสผ่านของครู ${teacher.name} ใช่หรือไม่?\nรหัสผ่านจะถูกตั้งค่ากลับเป็นรหัสผ่านเริ่มต้น (123456)`);
        if (!confirmReset) return;

        const defaultPassword = "123456";
        teacher.password = defaultPassword;
        teacher.isAuthCreated = false;

        try {
            await this.saveDatabase(false);
            
            // Show custom alert warning the admin about deleting the Firebase Auth user
            const msg = `
                <div style="text-align: left; line-height: 1.6;">
                    <p>ระบบได้รีเซ็ตรหัสผ่านในฐานข้อมูลคลาวด์และเครื่องเป็น <strong>${defaultPassword}</strong> เรียบร้อยแล้ว</p>
                    <div style="background-color: #FFF3CD; border-left: 4px solid #FFC107; padding: 12px; margin-top: 12px; border-radius: 4px;">
                        <strong style="color: #856404; display: block; margin-bottom: 6px;"><i class="fa-solid fa-triangle-exclamation"></i> ขั้นตอนสำคัญสำหรับผู้ดูแลระบบ (Admin)</strong>
                        <p style="margin: 0; font-size: 13px; color: #664d03;">
                            เนื่องจากนโยบายความปลอดภัยของระบบคลาวด์ Firebase 
                            <strong>คุณต้องเข้าสู่ระบบ Firebase Console (Authentication) และทำการลบบัญชีผู้ใช้ของครูท่านนี้ออก</strong> 
                            เพื่อให้ระบบยอมให้ครูเข้าสู่ระบบด้วยรหัสผ่านใหม่นี้เป็นครั้งแรก (ระบบจะสร้างบัญชีความปลอดภัยบนคลาวด์ให้ครูใหม่โดยอัตโนมัติเมื่อครูทำรายการล็อกอินในครั้งถัดไป)
                        </p>
                    </div>
                </div>
            `;
            this.showStatusModal('success', 'รีเซ็ตรหัสผ่านสำเร็จ', msg);
            this.renderManageTeachers();
        } catch (e) {
            console.error("Failed to reset teacher password:", e);
            this.showStatusModal('error', 'รีเซ็ตรหัสผ่านไม่สำเร็จ', `เกิดข้อผิดพลาดในการบันทึกข้อมูล: ${e.message}`);
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
            this.db.bases.push({ id: newId, name, defaultRoom: room, defaultTeacher: teacherNameStr, teacherId: teacherIdStr, classRooms: {} });
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

    // ─── BASE CLASS-ROOM MAPPING MANAGEMENT ───────────────────────────────────

    /**
     * Open the modal for managing per-class room assignments of a base.
     * Populates the modal with existing classRooms entries.
     */
    openManageBaseClassRoomsModal(baseId) {
        const b = this.db.bases.find(x => x.id === baseId);
        if (!b) return;

        document.getElementById('base-classrooms-form-id').value = baseId;
        document.getElementById('base-classrooms-modal-title').innerHTML =
            `<i class="fa-solid fa-door-open"></i> ห้องเรียนประจำฐาน: ${b.name}`;
        document.getElementById('base-classrooms-modal-desc').textContent =
            `สถานที่เรียนหลัก: ${b.defaultRoom}`;

        // Populate existing rows
        const container = document.getElementById('base-classrooms-rows-container');
        container.innerHTML = '';

        const classRooms = b.classRooms || {};
        const entries = Object.entries(classRooms);

        if (entries.length === 0) {
            // Start with one blank row
            this._appendBaseClassRoomRow(container, '', '');
        } else {
            entries.forEach(([cls, room]) => {
                this._appendBaseClassRoomRow(container, cls, room);
            });
        }

        this.openModal('base-classrooms-modal');
    }

    /**
     * Append a single input-pair row to the classrooms container.
     * Called both when opening the modal and when admin clicks "+ เพิ่ม".
     */
    _appendBaseClassRoomRow(container, clsValue, roomValue) {
        const row = document.createElement('div');
        row.className = 'base-classrooms-row';
        row.style.cssText = 'display: grid; grid-template-columns: 1fr 1fr 36px; gap: 8px; align-items: center;';
        row.innerHTML = `
            <input type="text" class="base-cr-cls-input"
                placeholder="เช่น ม.4/6"
                value="${clsValue}"
                style="padding: 8px 10px; border: 1px solid var(--border-color); border-radius: var(--radius-sm); font-size:13px; width:100%;">
            <input type="text" class="base-cr-room-input"
                placeholder="เช่น ห้อง 2101"
                value="${roomValue}"
                style="padding: 8px 10px; border: 1px solid var(--border-color); border-radius: var(--radius-sm); font-size:13px; width:100%;">
            <button type="button" onclick="app.removeBaseClassRoomRow(this)"
                style="background: none; border: 1px solid var(--danger); color: var(--danger); border-radius: var(--radius-sm); width: 32px; height: 32px; cursor: pointer; display:flex; align-items:center; justify-content:center;">
                <i class="fa-solid fa-xmark" style="font-size:12px;"></i>
            </button>
        `;
        container.appendChild(row);
    }

    /** Add a blank row when admin clicks "+ เพิ่มกลุ่มชั้นเรียน" */
    addBaseClassRoomRow() {
        const container = document.getElementById('base-classrooms-rows-container');
        this._appendBaseClassRoomRow(container, '', '');
        // Scroll to bottom so new row is visible
        container.scrollTop = container.scrollHeight;
    }

    /** Remove the row whose delete-button was clicked */
    removeBaseClassRoomRow(btn) {
        const row = btn.closest('.base-classrooms-row');
        if (row) row.remove();
    }

    /**
     * Read all rows from the modal, build classRooms map, save to db.bases,
     * and sync rotation_schedule entries for this base.
     */
    saveBaseClassRoomsFromModal() {
        const baseId = document.getElementById('base-classrooms-form-id').value;
        const b = this.db.bases.find(x => x.id === baseId);
        if (!b) return;

        const rows = document.querySelectorAll('#base-classrooms-rows-container .base-classrooms-row');
        const newClassRooms = {};
        let hasError = false;

        rows.forEach(row => {
            const cls = row.querySelector('.base-cr-cls-input').value.trim();
            const room = row.querySelector('.base-cr-room-input').value.trim();
            if (cls && room) {
                newClassRooms[cls] = room;
            } else if (cls || room) {
                // Partially filled — flag error
                hasError = true;
            }
        });

        if (hasError) {
            this.showStatusModal('error', 'ข้อมูลไม่ครบ', 'กรุณากรอกทั้งกลุ่มชั้นเรียนและห้องเรียนให้ครบทุกแถว หรือลบแถวที่ไม่ต้องการออก');
            return;
        }

        // Update db.bases
        b.classRooms = newClassRooms;

        // Sync rotation_schedule entries: update classRooms mapping for matching entries
        if (this.db.rotation_schedule) {
            this.db.rotation_schedule.forEach(sch => {
                if (sch.baseId === baseId) {
                    // Merge: keep existing per-class overrides, overwrite from new mapping
                    const updatedRooms = {};
                    // For attending classes, apply the new classRooms map
                    const attending = sch.attendingClasses || [];
                    attending.forEach(cls => {
                        const clsKey = `${cls.grade}/${cls.room}`;
                        if (newClassRooms[clsKey]) {
                            updatedRooms[clsKey] = newClassRooms[clsKey];
                        } else if (sch.classRooms && sch.classRooms[clsKey]) {
                            updatedRooms[clsKey] = sch.classRooms[clsKey];
                        }
                    });
                    sch.classRooms = updatedRooms;
                }
            });
        }

        this.saveDatabase(false, ['bases', 'rotation_schedule']);
        this.closeModal('base-classrooms-modal');
        this.renderManageBases();
        this.logAudit(`Updated classRooms for base: ${b.name} (${Object.keys(newClassRooms).length} entries)`);
        this.showStatusModal('success', 'บันทึกสำเร็จ', `กำหนดห้องเรียนสำหรับฐาน "${b.name}" จำนวน ${Object.keys(newClassRooms).length} กลุ่มชั้นเรียนเรียบร้อย`);
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
                const newTeacher = { username, name, role, password: password || "123456" };
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
            { username: "deputy2", name: "นายสมศักดิ์ รักเรียน", role: "director", password: "deputy2password" }
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
                    this.saveDatabase(true);
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

        // Reset and draw image to canvas
        const canvas = document.getElementById('ocr-grid-canvas');
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const noImageText = document.getElementById('ocr-no-image-text');
        if (noImageText) noImageText.style.display = 'none';

        const img = new Image();
        img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
        };
        const objectUrl = URL.createObjectURL(file);
        img.src = objectUrl;

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
        ).then(({ data: { text, words } }) => {
            statusLabel.textContent = "ประมวลผลรูปภาพเสร็จสิ้น! กำลังจำแนกปฏิทินรายสัปดาห์...";
            percentLabel.textContent = "100%";
            progressBar.style.width = "100%";
            rawTextArea.value = text;

            // Draw bounding boxes of detected words on canvas
            if (words && words.length > 0) {
                ctx.strokeStyle = '#22C55E';
                ctx.lineWidth = 3;
                ctx.fillStyle = 'rgba(34, 197, 94, 0.15)';
                words.forEach(word => {
                    const { x0, y0, x1, y1 } = word.bbox;
                    const w = x1 - x0;
                    const h = y1 - y0;
                    ctx.fillRect(x0, y0, w, h);
                    ctx.strokeRect(x0, y0, w, h);
                });
            }

            // Analyze text to extract schedule draft
            const parsedData = this.parseOcrTextToCalendar(text);
            
            // Render draft to review table
            this.renderOcrReviewTable(parsedData);

            document.getElementById('btn-save-ocr-import').disabled = false;
            statusLabel.innerHTML = "<span style='color:var(--success); font-weight:700;'><i class='fa-solid fa-circle-check'></i> ถอดรหัสตารางเรียนเสร็จสมบูรณ์! กรุณารีวิวตรวจสอบระดับชั้นด้านขวาก่อนกดบันทึก</span>";
        }).catch(err => {
            console.error(err);
            statusLabel.innerHTML = "<span style='color:var(--danger); font-weight:700;'><i class='fa-solid fa-triangle-exclamation'></i> การประมวลผลรูปภาพล้มเหลว กรุณาตรวจสอบคุณภาพรูปภาพแล้วอัปโหลดใหม่อีกครั้ง</span>";
            if (noImageText) noImageText.style.display = 'block';
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }).finally(() => {
            inputElement.value = ''; // Reset input element
            URL.revokeObjectURL(objectUrl);
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

        if (baseId === 'base4' && grade === 'ม.4') {
            const classesList = [];
            const classRooms = {};
            if (!isWeekB) {
                classesList.push("ม.4/1", "ม.4/6", "ม.4/7");
                classRooms["ม.4/1"] = "ห้อง 2101";
                classRooms["ม.4/6"] = "ห้อง 2101";
                classRooms["ม.4/7"] = "ไก่ไข่อารมณ์ดี";
            } else {
                classesList.push("ม.4/2", "ม.4/5", "ม.4/3", "ม.4/4");
                classRooms["ม.4/2"] = "ห้อง 2201";
                classRooms["ม.4/5"] = "ห้อง 2201";
                classRooms["ม.4/3"] = "ห้อง 2102-2103";
                classRooms["ม.4/4"] = "ห้อง 2102-2103";
            }
            const label = !isWeekB
                ? "ม.4/7 (ไก่ไข่อารมณ์ดี) | ม.4/1, ม.4/6 (ห้อง 2101)"
                : "ม.4/2, ม.4/5 (ห้อง 2201) | ม.4/3, ม.4/4 (ห้อง 2102-2103)";
            return {
                classes: classesList,
                classRooms: classRooms,
                classesLabel: label
            };
        }

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

        if (baseId === 'base7') { // หลู่ส่างกานเครือ เกื้อบุญ
            const cls = allGradeClasses[grade] || [];
            const rooms = {};
            cls.forEach(c => { rooms[c] = "หอประชุมสุภเมธี"; });
            return {
                classes: cls,
                classRooms: rooms,
                classesLabel: `${grade} (หอประชุมสุภเมธี)`
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
                group1.push("ม.4/1", "ม.4/2", "ม.4/7");
                group2.push("ม.4/5", "ม.4/6");
                group3.push("ม.4/3", "ม.4/4");
            } else if (grade === 'ม.5') {
                group1.push("ม.5/1", "ม.5/6");
                group2.push("ม.5/2", "ม.5/5");
                group3.push("ม.5/3", "ม.5/4");
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
            roomD = isJunior ? "ห้อง 1107" : "";
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

    // ═══════════════════════════════════════════════════════════════════
    //  CALENDAR VIEW  (view-calendar)
    // ═══════════════════════════════════════════════════════════════════

    renderCalendar() {
        const filterWeek  = document.getElementById('cal-filter-week');
        const filterBase  = document.getElementById('cal-filter-base');
        const filterGrade = document.getElementById('cal-filter-grade');
        const filterDate  = document.getElementById('cal-filter-date');

        // Populate week filter options once
        if (filterWeek && filterWeek.options.length <= 1) {
            const weeks = [...new Set(this.db.rotation_schedule.map(s => s.week))].sort((a,b)=>a-b);
            weeks.forEach(w => {
                const opt = document.createElement('option');
                opt.value = w;
                opt.textContent = `สัปดาห์ที่ ${w}`;
                filterWeek.appendChild(opt);
            });
        }

        // Populate base filter options once
        if (filterBase && filterBase.options.length <= 1) {
            this.db.bases.forEach(b => {
                const opt = document.createElement('option');
                opt.value = b.id;
                opt.textContent = b.name;
                filterBase.appendChild(opt);
            });
        }

        // Get filter values
        const selWeek  = filterWeek  ? filterWeek.value  : 'all';
        const selBase  = filterBase  ? filterBase.value  : 'all';
        const selGrade = filterGrade ? filterGrade.value : 'all';
        const selDate  = filterDate  ? filterDate.value  : '';

        // Filter schedule
        let items = this.db.rotation_schedule.filter(s => {
            if (selWeek !== 'all' && s.week !== parseInt(selWeek)) return false;
            if (selBase !== 'all' && s.baseId !== selBase) return false;
            if (selGrade !== 'all' && !s.classes.includes(selGrade)) return false;
            if (selDate) {
                const d = new Date(selDate);
                const start = s.startDate ? new Date(s.startDate) : null;
                const end   = s.endDate   ? new Date(s.endDate)   : null;
                if (start && end && (d < start || d > end)) return false;
            }
            return !s.isEmpty;
        });

        // Sort by week then base
        items.sort((a,b) => a.week !== b.week ? a.week - b.week : a.baseName.localeCompare(b.baseName));

        // Check which view mode is active
        const gridWrapper     = document.getElementById('cal-grid-wrapper');
        const timelineWrapper = document.getElementById('cal-timeline-wrapper');
        const isGrid = gridWrapper && gridWrapper.style.display !== 'none';

        if (isGrid) {
            this._renderCalendarGrid(items);
        } else {
            this._renderCalendarTimeline(items);
        }
    }

    _renderCalendarGrid(items) {
        const container = document.getElementById('calendar-board-container');
        if (!container) return;

        if (items.length === 0) {
            container.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:40px; color:var(--text-secondary);">
                <i class="fa-solid fa-calendar-xmark" style="font-size:40px; opacity:0.3; display:block; margin-bottom:12px;"></i>
                ไม่พบข้อมูลตารางกิจกรรมตามตัวกรองที่เลือก
            </div>`;
            return;
        }

        const baseColors = ['#2E7D32','#1565C0','#6A1B9A','#BF360C','#00695C','#E65100','#4E342E'];

        container.innerHTML = items.map((s, i) => {
            const color = baseColors[this.db.bases.findIndex(b => b.id === s.baseId) % baseColors.length] || '#2E7D32';
            const logs = this.db.attendance_logs ? this.db.attendance_logs.filter(l => l.week === s.week && l.baseId === s.baseId) : [];
            const hasLog = logs.length > 0;
            const isSpecial = s.isSpecial;

            return `<div class="card" style="border-left: 4px solid ${color}; cursor: pointer; transition: transform 0.15s, box-shadow 0.15s;"
                onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 6px 20px rgba(0,0,0,0.12)'"
                onmouseout="this.style.transform='';this.style.boxShadow=''"
                onclick="app.showActivityDetails(${i}, ${JSON.stringify(s).replace(/"/g,'&quot;')})">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px; margin-bottom:10px;">
                    <span class="status-badge" style="background:${color}20; color:${color}; font-size:11px;">สัปดาห์ที่ ${s.week}</span>
                    ${isSpecial ? `<span class="status-badge warning" style="font-size:10px;">${s.classes}</span>` :
                      hasLog ? `<span class="status-badge success" style="font-size:10px;"><i class="fa-solid fa-check"></i> เช็กแล้ว</span>` :
                      `<span class="status-badge" style="font-size:10px; opacity:0.6;">ยังไม่เช็ก</span>`}
                </div>
                <div style="font-weight:700; font-size:14px; color:${color}; margin-bottom:6px;">${s.baseName}</div>
                <div style="font-size:12px; color:var(--text-secondary); margin-bottom:4px;"><i class="fa-solid fa-users" style="width:14px;"></i> ${s.classes}</div>
                <div style="font-size:12px; color:var(--text-secondary); margin-bottom:4px;"><i class="fa-solid fa-location-dot" style="width:14px;"></i> ${s.room}</div>
                <div style="font-size:11px; color:var(--text-secondary); margin-top:6px; opacity:0.8;"><i class="fa-regular fa-calendar" style="width:14px;"></i> ${s.dates || '-'}</div>
            </div>`;
        }).join('');
    }

    _renderCalendarTimeline(items) {
        const container = document.getElementById('timeline-flow-container');
        if (!container) return;

        if (items.length === 0) {
            container.innerHTML = `<p style="text-align:center; color:var(--text-secondary); padding:40px;">ไม่พบข้อมูลตารางกิจกรรม</p>`;
            return;
        }

        // Group by week
        const byWeek = {};
        items.forEach(s => {
            if (!byWeek[s.week]) byWeek[s.week] = { dates: s.dates, items: [] };
            byWeek[s.week].items.push(s);
        });

        container.innerHTML = Object.entries(byWeek).map(([week, data]) => `
            <div style="display:flex; gap:16px; margin-bottom:24px; align-items:flex-start;">
                <div style="flex-shrink:0; width:90px; text-align:right; padding-top:6px;">
                    <div style="font-weight:700; color:var(--primary); font-size:13px;">สัปดาห์ที่ ${week}</div>
                    <div style="font-size:11px; color:var(--text-secondary);">${data.dates || ''}</div>
                </div>
                <div style="position:relative; flex-shrink:0; display:flex; flex-direction:column; align-items:center;">
                    <div style="width:12px; height:12px; border-radius:50%; background:var(--primary); border:2px solid white; box-shadow:0 0 0 2px var(--primary); z-index:1;"></div>
                    <div style="width:2px; flex:1; background:var(--border-color); min-height:40px;"></div>
                </div>
                <div style="flex:1; display:flex; flex-wrap:wrap; gap:8px; padding-bottom:8px;">
                    ${data.items.map(s => `
                        <div style="background:var(--bg-secondary); border:1px solid var(--border-color); border-radius:var(--radius-md); padding:10px 14px; font-size:12px; min-width:160px; flex:1;">
                            <div style="font-weight:700; color:var(--primary-dark); margin-bottom:4px;">${s.baseName}</div>
                            <div style="color:var(--text-secondary);">${s.classes}</div>
                            <div style="color:var(--text-secondary);"><i class="fa-solid fa-location-dot"></i> ${s.room}</div>
                        </div>`).join('')}
                </div>
            </div>`
        ).join('');
    }

    switchCalendarMode(mode) {
        const grid     = document.getElementById('cal-grid-wrapper');
        const timeline = document.getElementById('cal-timeline-wrapper');
        const btnGrid  = document.getElementById('btn-cal-mode-grid');
        const btnTime  = document.getElementById('btn-cal-mode-timeline');

        if (mode === 'grid') {
            if (grid)     grid.style.display     = 'block';
            if (timeline) timeline.style.display = 'none';
            if (btnGrid)  { btnGrid.classList.add('btn-primary'); btnGrid.classList.remove('btn-outline'); }
            if (btnTime)  { btnTime.classList.remove('btn-primary'); btnTime.classList.add('btn-outline'); }
        } else {
            if (grid)     grid.style.display     = 'none';
            if (timeline) timeline.style.display = 'block';
            if (btnGrid)  { btnGrid.classList.remove('btn-primary'); btnGrid.classList.add('btn-outline'); }
            if (btnTime)  { btnTime.classList.add('btn-primary'); btnTime.classList.remove('btn-outline'); }
        }
        this.renderCalendar();
    }

    resetCalendarFilters() {
        const ids = ['cal-filter-week', 'cal-filter-base', 'cal-filter-grade', 'cal-filter-date'];
        ids.forEach(id => {
            const el = document.getElementById(id);
            if (el) { if (el.tagName === 'INPUT') el.value = ''; else el.value = 'all'; }
        });
        this.renderCalendar();
    }

    showActivityDetails(idx, scheduleItem) {
        // Try to open the existing rotation-detail-modal or activity-details-modal
        const modal = document.getElementById('activity-details-modal') || document.getElementById('rotation-detail-modal');
        if (!modal) return;

        const titleEl   = modal.querySelector('#activity-detail-title, #rotation-detail-title');
        const contentEl = modal.querySelector('#activity-detail-body, #rotation-detail-body');

        if (titleEl) titleEl.textContent = `${scheduleItem.baseName} — สัปดาห์ที่ ${scheduleItem.week}`;
        if (contentEl) {
            contentEl.innerHTML = `
                <div style="display:flex; flex-direction:column; gap:12px; font-size:14px;">
                    <div><strong>ช่วงวันที่:</strong> ${scheduleItem.dates || '-'}</div>
                    <div><strong>ระดับชั้นเรียน:</strong> ${scheduleItem.classes}</div>
                    <div><strong>ห้องเรียน/สถานที่:</strong> ${scheduleItem.room}</div>
                    <div><strong>ครูผู้สอน:</strong> ${scheduleItem.teacherName || '-'}</div>
                    ${scheduleItem.isSpecial ? `<div class="status-badge warning" style="align-self:flex-start;">${scheduleItem.classes}</div>` : ''}
                </div>`;
        }

        const modalId = modal.id;
        this.openModal(modalId);
    }

    // ═══════════════════════════════════════════════════════════════════
    //  BASES DIRECTORY VIEW  (view-bases)
    // ═══════════════════════════════════════════════════════════════════

    renderBases() {
        this.showBasesGrid();
    }

    showBasesGrid() {
        const gridWrapper   = document.getElementById('bases-grid-wrapper');
        const detailWrapper = document.getElementById('base-detail-wrapper');
        if (gridWrapper)   gridWrapper.style.display   = 'block';
        if (detailWrapper) detailWrapper.style.display = 'none';

        const container = document.getElementById('bases-cards-container');
        if (!container) return;

        const baseColors = [
            { bg: 'linear-gradient(135deg,#1B5E20,#388E3C)', icon: 'fa-microchip',     label: 'ฐานที่ 1' },
            { bg: 'linear-gradient(135deg,#0D47A1,#1976D2)', icon: 'fa-book-open',      label: 'ฐานที่ 2' },
            { bg: 'linear-gradient(135deg,#4A148C,#7B1FA2)', icon: 'fa-water',          label: 'ฐานที่ 3' },
            { bg: 'linear-gradient(135deg,#BF360C,#E64A19)', icon: 'fa-seedling',       label: 'ฐานที่ 4' },
            { bg: 'linear-gradient(135deg,#004D40,#00796B)', icon: 'fa-mushroom',       label: 'ฐานที่ 5' },
            { bg: 'linear-gradient(135deg,#E65100,#F57C00)', icon: 'fa-landmark',       label: 'ฐานที่ 6' },
            { bg: 'linear-gradient(135deg,#3E2723,#6D4C41)', icon: 'fa-masks-theater',  label: 'ฐานที่ 7' },
        ];

        container.innerHTML = this.db.bases.map((b, idx) => {
            const style = baseColors[idx] || baseColors[0];
            const scheduleCount = this.db.rotation_schedule.filter(s => s.baseId === b.id && !s.isSpecial && !s.isEmpty).length;
            const logCount = this.db.attendance_logs ? this.db.attendance_logs.filter(l => l.baseId === b.id).length : 0;
            const teachers = (b.teacherId || '').split(',').length;

            return `<div class="card" style="overflow:hidden; cursor:pointer; transition:transform 0.2s, box-shadow 0.2s;"
                onmouseover="this.style.transform='translateY(-4px)';this.style.boxShadow='0 12px 32px rgba(0,0,0,0.15)'"
                onmouseout="this.style.transform='';this.style.boxShadow=''"
                onclick="app.showBaseDetails('${b.id}')">
                <div style="background:${style.bg}; color:white; padding:20px 20px 16px; position:relative; overflow:hidden;">
                    <div style="position:absolute; right:-12px; top:-12px; font-size:70px; opacity:0.12;">
                        <i class="fa-solid ${style.icon}"></i>
                    </div>
                    <span style="font-size:11px; opacity:0.8; background:rgba(255,255,255,0.2); padding:3px 8px; border-radius:20px;">${style.label}</span>
                    <h3 style="font-size:17px; font-weight:800; margin:8px 0 4px; line-height:1.3;">${b.name}</h3>
                    <p style="font-size:12px; opacity:0.9; margin:0;"><i class="fa-solid fa-location-dot"></i> ${b.defaultRoom}</p>
                </div>
                <div style="padding:14px 16px; display:flex; justify-content:space-between; align-items:center;">
                    <div style="display:flex; gap:16px; font-size:12px; color:var(--text-secondary);">
                        <span><i class="fa-solid fa-chalkboard-user" style="color:var(--primary);"></i> ${teachers} ท่าน</span>
                        <span><i class="fa-solid fa-calendar-check" style="color:var(--primary);"></i> ${scheduleCount} สัปดาห์</span>
                        <span><i class="fa-solid fa-clipboard-check" style="color:var(--primary);"></i> ${logCount} บันทึก</span>
                    </div>
                    <i class="fa-solid fa-chevron-right" style="color:var(--text-light); font-size:12px;"></i>
                </div>
            </div>`;
        }).join('');
    }

    showBaseDetails(baseId) {
        const b = this.db.bases.find(x => x.id === baseId);
        if (!b) return;

        const gridWrapper   = document.getElementById('bases-grid-wrapper');
        const detailWrapper = document.getElementById('base-detail-wrapper');
        if (gridWrapper)   gridWrapper.style.display   = 'none';
        if (detailWrapper) detailWrapper.style.display = 'block';

        // Header
        const bIdx = this.db.bases.indexOf(b);
        const el = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
        const elHtml = (id, val) => { const e = document.getElementById(id); if (e) e.innerHTML = val; };

        el('base-detail-badge',   `ฐานการเรียนรู้ที่ ${bIdx + 1}`);
        el('base-detail-name',    b.name);
        el('base-detail-room-info', `📍 สถานที่ประจำ: ${b.defaultRoom}`);

        // Attendance stats
        const logs = this.db.attendance_logs ? this.db.attendance_logs.filter(l => l.baseId === baseId) : [];
        let totalPct = 0, pctCount = 0;
        logs.forEach(log => {
            if (log.totalStudents > 0) { totalPct += (log.presentCount / log.totalStudents) * 100; pctCount++; }
        });
        el('base-detail-avg-attendance', pctCount > 0 ? `${(totalPct/pctCount).toFixed(1)}%` : 'N/A');

        // Teachers list
        const teacherIds = (b.teacherId || '').split(',').map(x => x.trim()).filter(Boolean);
        const teacherContainer = document.getElementById('base-detail-teachers-list');
        if (teacherContainer) {
            teacherContainer.innerHTML = teacherIds.length === 0
                ? `<p style="color:var(--text-secondary); font-size:13px;">ยังไม่มีข้อมูลครู</p>`
                : teacherIds.map(tid => {
                    const t = this.db.teachers.find(x => x.username === tid);
                    const name = t ? t.name : tid;
                    const role = t ? t.role : '';
                    return `<div style="display:flex; align-items:center; gap:10px; padding:8px 0; border-bottom:1px solid var(--border-color);">
                        <div style="width:36px; height:36px; border-radius:50%; background:var(--primary); color:white; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:14px; flex-shrink:0;">
                            ${name.replace('นาง','').replace('นาย','').charAt(0)}
                        </div>
                        <div>
                            <div style="font-weight:600; font-size:13px;">${name}</div>
                            <div style="font-size:11px; color:var(--text-secondary);">${role === 'admin' ? 'ผู้ดูแลระบบ' : 'ครูประจำฐาน'}</div>
                        </div>
                    </div>`;
                }).join('');
        }

        // Responsible grades
        const baseSchedules = this.db.rotation_schedule.filter(s => s.baseId === baseId && !s.isEmpty && !s.isSpecial);
        const allClasses = [...new Set(baseSchedules.flatMap(s => s.attendingClasses || []))];
        const grades = [...new Set(allClasses.map(c => {
            if (typeof c === 'string') return c.split('/')[0];
            return `${c.grade}`;
        }))].sort();
        el('base-detail-responsible-grades', grades.length > 0 ? grades.join(', ') : 'ทุกระดับชั้น (หมุนฐาน)');

        // Class-room mapping
        const crContainer = document.getElementById('base-detail-classrooms-list');
        if (crContainer) {
            const classRooms = b.classRooms || {};
            const crEntries = Object.entries(classRooms);
            crContainer.innerHTML = crEntries.length === 0
                ? `<span style="font-size:12px; color:var(--text-secondary); font-style:italic;">ยังไม่ได้กำหนดห้องเรียนแยกกลุ่ม</span>`
                : crEntries.map(([cls, room]) =>
                    `<span class="status-badge info" style="font-size:11px;">${cls} → ${room}</span>`
                ).join('');
        }

        // Schedule table
        const schedTbody = document.getElementById('base-detail-schedule-table-body');
        if (schedTbody) {
            schedTbody.innerHTML = baseSchedules.length === 0
                ? `<tr><td colspan="4" style="text-align:center; color:var(--text-secondary);">ไม่มีตารางสอน</td></tr>`
                : baseSchedules.map(s => `
                    <tr>
                        <td>สัปดาห์ที่ ${s.week}</td>
                        <td>${s.classes}</td>
                        <td>${s.room}</td>
                        <td><span class="status-badge" style="font-size:11px;">${s.dates || '-'}</span></td>
                    </tr>`).join('');
        }

        // History table
        const histTbody = document.getElementById('base-detail-history-table-body');
        if (histTbody) {
            histTbody.innerHTML = logs.length === 0
                ? `<tr><td colspan="5" style="text-align:center; color:var(--text-secondary);">ยังไม่มีประวัติการเช็กชื่อ</td></tr>`
                : logs.slice().reverse().slice(0, 20).map(log => {
                    const pct = log.totalStudents > 0 ? Math.round((log.presentCount / log.totalStudents) * 100) : 0;
                    const color = pct >= 80 ? 'var(--success)' : pct >= 60 ? '#D97706' : 'var(--danger)';
                    return `<tr>
                        <td>${this.formatThaiDateShort(log.date)}</td>
                        <td>สัปดาห์ ${log.week || '-'}</td>
                        <td>${log.className || '-'}</td>
                        <td>${log.teacherName || '-'} ${log.rating ? `⭐${log.rating}` : ''}</td>
                        <td style="text-align:center; color:${color}; font-weight:700;">${pct}%</td>
                    </tr>`;
                }).join('');
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    //  SEARCH VIEW  (view-search)
    // ═══════════════════════════════════════════════════════════════════

    renderSearch() {
        // Populate base filter once
        const baseFilter = document.getElementById('search-filter-base');
        if (baseFilter && baseFilter.options.length <= 1) {
            this.db.bases.forEach(b => {
                const opt = document.createElement('option');
                opt.value = b.id;
                opt.textContent = b.name;
                baseFilter.appendChild(opt);
            });
        }
        // Trigger a search if there's an existing query
        const q = document.getElementById('search-query-input');
        if (q && q.value.trim()) this.searchActivities();
    }

    searchActivities() {
        const query     = (document.getElementById('search-query-input')?.value || '').trim().toLowerCase();
        const baseFilter= document.getElementById('search-filter-base')?.value  || 'all';
        const gradeFilter=document.getElementById('search-filter-grade')?.value || 'all';

        let items = this.db.rotation_schedule.filter(s => {
            if (s.isEmpty) return false;
            if (baseFilter !== 'all' && s.baseId !== baseFilter) return false;
            if (gradeFilter !== 'all' && !s.classes.includes(gradeFilter)) return false;
            if (!query) return true;

            const fields = [
                s.baseName, s.classes, s.room, s.teacherName, s.dates,
                `สัปดาห์ ${s.week}`, s.baseId
            ].map(v => (v || '').toLowerCase());
            return fields.some(f => f.includes(query));
        });

        const countEl = document.getElementById('search-results-count');
        if (countEl) countEl.textContent = items.length;

        const container = document.getElementById('search-results-container');
        if (!container) return;

        if (items.length === 0) {
            container.innerHTML = `<p style="text-align:center; color:var(--text-secondary); margin:30px 0;">
                ${query ? `ไม่พบผลลัพธ์สำหรับ "<strong>${query}</strong>"` : 'ป้อนคำค้นหาเพื่อสืบค้นข้อมูลกิจกรรม'}
            </p>`;
            return;
        }

        const baseColors = ['#2E7D32','#1565C0','#6A1B9A','#BF360C','#00695C','#E65100','#4E342E'];
        container.innerHTML = items.slice(0, 50).map(s => {
            const color = baseColors[this.db.bases.findIndex(b => b.id === s.baseId) % baseColors.length] || '#2E7D32';
            return `<div class="card" style="border-left:4px solid ${color}; display:flex; align-items:center; gap:16px; padding:14px 18px; cursor:pointer;"
                onclick="app.switchView('calendar')">
                <div style="flex-shrink:0; width:48px; height:48px; border-radius:var(--radius-md); background:${color}20; display:flex; align-items:center; justify-content:center;">
                    <i class="fa-solid fa-school" style="color:${color}; font-size:20px;"></i>
                </div>
                <div style="flex:1; min-width:0;">
                    <div style="font-weight:700; color:${color}; margin-bottom:2px;">${s.baseName}</div>
                    <div style="font-size:13px; color:var(--text-secondary);">
                        <span><i class="fa-solid fa-users"></i> ${s.classes}</span>
                        &nbsp;·&nbsp;
                        <span><i class="fa-solid fa-location-dot"></i> ${s.room}</span>
                    </div>
                </div>
                <div style="text-align:right; flex-shrink:0;">
                    <div style="font-weight:700; color:var(--primary);">สัปดาห์ที่ ${s.week}</div>
                    <div style="font-size:11px; color:var(--text-secondary);">${s.dates || ''}</div>
                </div>
            </div>`;
        }).join('');
    }

    clearSearchFilters() {
        const q = document.getElementById('search-query-input');
        if (q) q.value = '';
        const bf = document.getElementById('search-filter-base');
        if (bf) bf.value = 'all';
        const gf = document.getElementById('search-filter-grade');
        if (gf) gf.value = 'all';
        const container = document.getElementById('search-results-container');
        if (container) container.innerHTML = `<p style="text-align:center; color:var(--text-secondary); margin:20px 0;">ป้อนข้อมูลลงในช่องค้นหาเพื่อสืบค้นข้อมูลกิจกรรมการเรียนรู้แบบละเอียด</p>`;
        const countEl = document.getElementById('search-results-count');
        if (countEl) countEl.textContent = '0';
    }

    // ═══════════════════════════════════════════════════════════════════
    //  SEMESTER MANAGEMENT  (manage-sub-semesters)
    // ═══════════════════════════════════════════════════════════════════

    renderManageSemesters() {
        const tbody = document.getElementById('manage-semesters-table-body');
        if (!tbody) return;

        const semesters = this.db.semesters || [];
        if (semesters.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--text-secondary); padding:20px;">ยังไม่มีข้อมูลภาคเรียน — กด "เพิ่มภาคเรียนใหม่" เพื่อเพิ่ม</td></tr>`;
            return;
        }

        tbody.innerHTML = semesters.map(sem => {
            const isActive = sem.active === true;
            const parts = (sem.id || '').split('-');
            const term = parts[0] || '1';
            const year = parts[1] || '2569';
            return `<tr>
                <td style="font-weight:700;">${sem.name || sem.id}</td>
                <td>${year}</td>
                <td>ภาคเรียนที่ ${term}</td>
                <td style="text-align:center;">
                    ${isActive
                        ? `<span class="status-badge success"><i class="fa-solid fa-circle-check"></i> กำลังใช้งาน</span>`
                        : `<button class="btn btn-outline btn-sm" onclick="app.setActiveSemester('${sem.id}')">
                            <i class="fa-solid fa-check"></i> ตั้งเป็นภาคเรียนปัจจุบัน
                           </button>`}
                </td>
                <td style="text-align:center;">
                    ${isActive
                        ? `<span style="font-size:12px; color:var(--text-secondary); font-style:italic;">ภาคเรียนที่ใช้งานอยู่</span>`
                        : `<button class="btn btn-outline btn-sm" style="color:var(--danger);" onclick="app.deleteSemester('${sem.id}')">
                            <i class="fa-solid fa-trash"></i> ลบ
                           </button>`}
                </td>
            </tr>`;
        }).join('');
    }

    openAddSemesterModal() {
        const yearInput  = document.getElementById('sem-form-year');
        const termSelect = document.getElementById('sem-form-term');
        const labelInput = document.getElementById('sem-form-label');

        // Set sensible defaults: next year
        const nextYear = new Date().getFullYear() + 543 + 1;
        if (yearInput)  yearInput.value  = nextYear;
        if (termSelect) termSelect.value = '1';
        if (labelInput) labelInput.value = `ภาคเรียนที่ 1/${nextYear}`;

        // Auto-update label when inputs change
        const updateLabel = () => {
            const y = yearInput?.value || nextYear;
            const t = termSelect?.value || '1';
            if (labelInput) labelInput.value = `ภาคเรียนที่ ${t}/${y}`;
        };
        if (yearInput)  yearInput.oninput  = updateLabel;
        if (termSelect) termSelect.onchange = updateLabel;

        this.openModal('semester-modal');
    }

    saveSemesterFromForm() {
        const year  = parseInt(document.getElementById('sem-form-year')?.value);
        const term  = document.getElementById('sem-form-term')?.value || '1';
        const label = document.getElementById('sem-form-label')?.value?.trim();

        if (!year || isNaN(year) || year < 2560 || year > 2600) {
            this.showStatusModal('error', 'ข้อมูลไม่ถูกต้อง', 'กรุณากรอกปีการศึกษา พ.ศ. ที่ถูกต้อง (เช่น 2570)');
            return;
        }

        const newId = `${term}-${year}`;
        if (!this.db.semesters) this.db.semesters = [];

        if (this.db.semesters.find(s => s.id === newId)) {
            this.showStatusModal('error', 'มีข้อมูลซ้ำ', `ภาคเรียนที่ ${term}/${year} มีอยู่ในระบบแล้ว`);
            return;
        }

        this.db.semesters.push({ id: newId, name: label || `ภาคเรียนที่ ${term}/${year}`, active: false });
        this.saveDatabase(false, ['semesters']);
        this.closeModal('semester-modal');
        this.renderManageSemesters();
        this.logAudit(`Added semester: ${newId}`);
        this.showStatusModal('success', 'เพิ่มภาคเรียนสำเร็จ', `ภาคเรียนที่ ${term}/${year} ถูกเพิ่มเข้าสู่ระบบแล้ว`);
    }

    setActiveSemester(semId) {
        if (!this.db.semesters) return;
        this.db.semesters.forEach(s => { s.active = (s.id === semId); });
        this.db.activeSemesterId = semId;
        this.saveDatabase(false, ['semesters']);
        this.renderManageSemesters();
        this.logAudit(`Set active semester: ${semId}`);
        this.showStatusModal('success', 'เปลี่ยนภาคเรียนสำเร็จ', `ตั้ง ${semId} เป็นภาคเรียนที่ใช้งานอยู่แล้ว`);
    }

    deleteSemester(semId) {
        if (!confirm(`ต้องการลบภาคเรียน ${semId} ใช่หรือไม่?`)) return;
        if (!this.db.semesters) return;
        this.db.semesters = this.db.semesters.filter(s => s.id !== semId);
        this.saveDatabase(false, ['semesters']);
        this.renderManageSemesters();
        this.logAudit(`Deleted semester: ${semId}`);
    }

    // ═══════════════════════════════════════════════════════════════════
    //  ADMIN CHECKIN ROOM MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════

    /** Open modal so admin can add a class + student list to a base's checkin */
    openCheckinAdminRoomModal() {
        const modal = document.getElementById('checkin-admin-room-modal');
        if (!modal) return;

        // Populate base select
        const baseSelect = document.getElementById('car-form-base');
        if (baseSelect) {
            baseSelect.innerHTML = '<option value="">-- เลือกฐานการเรียนรู้ --</option>';
            this.db.bases.forEach(b => {
                const opt = document.createElement('option');
                opt.value = b.id;
                opt.textContent = b.name;
                baseSelect.appendChild(opt);
            });
        }

        // Populate class/grade select
        const clsSelect = document.getElementById('car-form-class');
        if (clsSelect) {
            clsSelect.innerHTML = '<option value="">-- เลือกชั้นเรียน --</option>';
            const classes = [...new Set(this.db.students.map(s => `${s.grade}/${s.room}`))].sort();
            classes.forEach(c => {
                const opt = document.createElement('option');
                opt.value = c;
                opt.textContent = c;
                clsSelect.appendChild(opt);
            });
        }

        const roomInput = document.getElementById('car-form-room');
        if (roomInput) roomInput.value = '';

        this.openModal('checkin-admin-room-modal');
    }

    /** Save admin-defined class-room assignment to the selected base and update checkin */
    saveCheckinAdminRoom() {
        const baseId = document.getElementById('car-form-base')?.value;
        const cls    = document.getElementById('car-form-class')?.value;
        const room   = document.getElementById('car-form-room')?.value?.trim();

        if (!baseId || !cls) {
            this.showStatusModal('error', 'ข้อมูลไม่ครบ', 'กรุณาเลือกฐานการเรียนรู้และชั้นเรียน');
            return;
        }

        // Save classRoom mapping to db.bases
        const b = this.db.bases.find(x => x.id === baseId);
        if (b) {
            if (!b.classRooms) b.classRooms = {};
            b.classRooms[cls] = room || b.defaultRoom;
        }

        this.saveDatabase(false, ['bases']);
        this.closeModal('checkin-admin-room-modal');
        this.renderManageBases();
        this.showStatusModal('success', 'บันทึกสำเร็จ',
            `กำหนดห้องเรียน "${room || b?.defaultRoom}" ให้กลุ่ม "${cls}" ที่ฐาน "${b?.name}" แล้ว`);
        this.logAudit(`Admin assigned class ${cls} → ${room} at base ${baseId}`);
    }

    // =========================================================================
    //  TEACHER HISTORY VIEW
    // =========================================================================

    renderTeacherHistory() {
        const tbody = document.getElementById('teacher-history-tbody');
        if (!tbody) return;

        // Find bases assigned to this teacher
        const myBases = this.db.bases.filter(b => {
            const ids = (b.teacherId || "").split(',').map(x => x.trim());
            return ids.includes(this.currentUser.username);
        });
        const myBaseIds = myBases.map(b => b.id);
        
        // Show base info in banner
        const baseInfoLabel = document.getElementById('teacher-history-base-info');
        if (baseInfoLabel) {
            if (myBases.length > 0) {
                baseInfoLabel.innerHTML = `<i class="fa-solid fa-leaf"></i> ฐานเรียนรู้: ${myBases.map(b => b.name).join(', ')}`;
            } else {
                baseInfoLabel.innerHTML = `<i class="fa-solid fa-leaf"></i> ฐานเรียนรู้: ทุกฐานเรียนรู้ (ยังไม่ได้สังกัดฐานประจำ)`;
            }
        }

        // Setup base select dropdown if multiple bases
        const baseSelectGroup = document.getElementById('teacher-history-base-select-group');
        const baseSelect = document.getElementById('teacher-history-base-select');
        if (myBases.length > 1) {
            if (baseSelectGroup) baseSelectGroup.style.display = 'flex';
            if (baseSelect && baseSelect.children.length === 0) {
                baseSelect.innerHTML = '<option value="all">ทุกฐานของฉัน</option>' + myBases.map(b => `<option value="${b.id}">${b.name}</option>`).join('');
                baseSelect.addEventListener('change', () => this.renderTeacherHistory());
            }
        } else {
            if (baseSelectGroup) baseSelectGroup.style.display = 'none';
        }

        // Setup week selector filter
        const weekSelect = document.getElementById('teacher-history-week-select');
        if (weekSelect && weekSelect.children.length <= 1) {
            // Populate weeks 1 to 20
            let html = '<option value="all">ทุกสัปดาห์</option>';
            for (let i = 1; i <= 20; i++) {
                html += `<option value="${i}">สัปดาห์ที่ ${i}</option>`;
            }
            weekSelect.innerHTML = html;
            weekSelect.addEventListener('change', () => this.renderTeacherHistory());
        }

        // Setup class selector filter
        const classSelect = document.getElementById('teacher-history-class-select');
        if (classSelect && classSelect.children.length <= 1) {
            // Populate classes ม.1 to ม.6
            let html = '<option value="all">ทุกระดับชั้น</option>';
            for (let i = 1; i <= 6; i++) {
                html += `<option value="ม.${i}">ม.${i}</option>`;
            }
            classSelect.innerHTML = html;
            classSelect.addEventListener('change', () => this.renderTeacherHistory());
        }

        // Search event listener
        const searchInput = document.getElementById('teacher-history-search');
        if (searchInput && !searchInput.dataset.bound) {
            searchInput.dataset.bound = "true";
            searchInput.addEventListener('input', () => this.renderTeacherHistory());
        }

        // Get filters values
        const selectedBase = baseSelect ? baseSelect.value : 'all';
        const selectedWeek = weekSelect ? weekSelect.value : 'all';
        const selectedClass = classSelect ? classSelect.value : 'all';
        const searchVal = searchInput ? searchInput.value.trim().toLowerCase() : '';

        // Gather all session logs (both live activity logs and staging logs)
        let liveLogs = this.db.base_activity_logs || [];
        let draftLogs = this.db.staging_logs || [];

        // Add visual identifiers
        liveLogs = liveLogs.map(l => ({ ...l, isStaging: false }));
        draftLogs = draftLogs.map(l => ({ ...l, isStaging: true }));

        // Combine logs
        let allLogs = [...draftLogs, ...liveLogs];

        // Filter by teacher's base or checkedBy
        allLogs = allLogs.filter(log => {
            // Must belong to teacher's bases or checked by teacher
            const matchesTeacher = myBaseIds.includes(log.baseId) || log.checkedBy === this.currentUser.username;
            if (!matchesTeacher) return false;

            // Filter by base dropdown
            if (selectedBase !== 'all' && log.baseId !== selectedBase) return false;

            // Filter by week select
            if (selectedWeek !== 'all' && String(log.week) !== selectedWeek) return false;

            // Filter by class select
            if (selectedClass !== 'all') {
                if (!log.classId.startsWith(selectedClass)) return false;
            }

            // Filter by search query
            if (searchVal) {
                const baseObj = this.db.bases.find(b => b.id === log.baseId);
                const baseName = baseObj ? baseObj.name : '';
                const teacherObj = this.db.teachers.find(t => t.username === log.checkedBy);
                const teacherName = teacherObj ? teacherObj.name : '';
                const fields = [
                    log.date, `สัปดาห์ ${log.week}`, log.classId, baseName, teacherName, log.notes || ''
                ].map(v => v.toLowerCase());
                if (!fields.some(f => f.includes(searchVal))) return false;
            }

            return true;
        });

        // Sort by timestamp descending
        allLogs.sort((a, b) => b.timestamp - a.timestamp);

        // Update count badge
        const countLabel = document.getElementById('teacher-history-count-label');
        if (countLabel) {
            countLabel.textContent = `${allLogs.length} บันทึก`;
        }

        // Render table rows
        tbody.innerHTML = '';
        if (allLogs.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:var(--text-secondary); padding: 24px;">ไม่พบประวัติการเช็กชื่อ</td></tr>`;
            return;
        }

        allLogs.forEach(log => {
            // Calculate stats
            let total = 0, present = 0;
            if (log.isStaging) {
                total = log.students ? log.students.length : 0;
                present = log.students ? log.students.filter(s => s.status === 'present' || s.status === 'late').length : 0;
            } else {
                const parts = log.classId.split('/');
                const grade = parts[0];
                const room = parseInt(parts[1]);
                const classStudents = this.db.students.filter(st => st.grade === grade && st.room === room && st.semesterId === log.semesterId);
                const studentIds = new Set(classStudents.map(st => st.studentId));
                const sessionLogs = this.db.attendance_logs.filter(al => 
                    al.date === log.date && 
                    al.baseId === log.baseId && 
                    studentIds.has(al.studentId) &&
                    al.semesterId === log.semesterId
                );
                total = sessionLogs.length;
                present = sessionLogs.filter(al => al.status === 'present' || al.status === 'late').length;
            }

            const pct = total > 0 ? Math.round((present / total) * 100) : 0;
            const pctColor = pct >= 80 ? 'var(--success)' : pct >= 60 ? '#D97706' : 'var(--danger)';
            
            const teacherObj = this.db.teachers.find(t => t.username === log.checkedBy);
            const teacherName = teacherObj ? teacherObj.name : log.checkedBy;

            const baseObj = this.db.bases.find(b => b.id === log.baseId);
            const baseName = baseObj ? baseObj.name : log.baseId;

            const ratingVal = log.rating || 0;
            let starsHtml = '';
            for (let i = 1; i <= 5; i++) {
                if (i <= ratingVal) {
                    starsHtml += '<i class="fa-solid fa-star" style="color: var(--accent); margin-right: 1px; font-size: 11px;"></i>';
                }
            }
            if (ratingVal > 0) starsHtml += ` <span style="font-size: 11px; font-weight:700; color: var(--accent);">${ratingVal.toFixed(1)}</span>`;
            else starsHtml = '<span style="color: var(--text-light); font-size:11px;">-</span>';

            const statusBadge = log.isStaging 
                ? '<span class="status-badge" style="background-color: #FFEEDB; color: #D97706; border: 1px solid #FCD34D; font-size:10px;">ร่าง (Staging)</span>'
                : '<span class="status-badge" style="background-color: #E6F4EA; color: #137333; border: 1px solid #A8DAB5; font-size:10px;">Live</span>';

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>
                    <div style="font-weight:600;">${this.formatThaiDateShort(log.date)}</div>
                    <div style="margin-top:2px;">${statusBadge}</div>
                </td>
                <td>สัปดาห์ ${log.week || '-'}</td>
                <td>
                    <div style="font-weight:600; color:var(--primary-dark);">${log.classId}</div>
                    <div style="font-size:11px; color:var(--text-secondary); margin-top:2px;">${baseName}</div>
                </td>
                <td style="font-weight:600;">${present} / ${total} คน</td>
                <td style="color:${pctColor}; font-weight:700;">${pct}%</td>
                <td>${teacherName}</td>
                <td>${starsHtml}</td>
                <td style="text-align:center;">
                    <button class="btn btn-outline btn-xs" onclick="app.openHistoryDetailsModal('${log.id || log.batchId}', ${log.isStaging})">
                        <i class="fa-solid fa-circle-info"></i> ดูข้อมูล / ไฟล์แนบ
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    openHistoryDetailsModal(logId, isStaging) {
        let log;
        if (isStaging) {
            log = this.db.staging_logs.find(x => x.batchId === logId);
        } else {
            log = this.db.base_activity_logs.find(x => x.id === logId);
        }
        if (!log) return;

        document.getElementById('history-detail-date').textContent = `${this.formatThaiDate(log.date)} (${new Date(log.timestamp).toLocaleTimeString('th-TH')} น.)`;
        
        const base = this.db.bases.find(b => b.id === log.baseId);
        const baseName = base ? base.name : log.baseId;
        document.getElementById('history-detail-base').textContent = baseName;
        document.getElementById('history-detail-class').textContent = log.classId;
        
        const teacher = this.db.teachers.find(t => t.username === log.checkedBy);
        const teacherName = teacher ? teacher.name : log.checkedBy;
        document.getElementById('history-detail-teacher').textContent = teacherName;

        const studentListTbody = document.getElementById('history-detail-student-list');
        if (studentListTbody) {
            studentListTbody.innerHTML = '';
            
            let studentsList = [];
            if (isStaging) {
                studentsList = log.students || [];
            } else {
                // Live: fetch from attendance_logs
                const parts = log.classId.split('/');
                const grade = parts[0];
                const room = parseInt(parts[1]);
                const classStudents = this.db.students.filter(st => st.grade === grade && st.room === room && st.semesterId === log.semesterId);
                const studentIds = new Set(classStudents.map(st => st.studentId));
                
                const sessionLogs = this.db.attendance_logs.filter(al => 
                    al.date === log.date && 
                    al.baseId === log.baseId && 
                    studentIds.has(al.studentId) &&
                    al.semesterId === log.semesterId
                );
                
                studentsList = sessionLogs.map(al => ({
                    studentId: al.studentId,
                    status: al.status
                }));
            }

            if (studentsList.length > 0) {
                studentsList.forEach((stItem) => {
                    const student = this.db.students.find(s => s.studentId === stItem.studentId);
                    const name = student ? student.name : `รหัส: ${stItem.studentId}`;
                    const no = student ? student.no : '-';
                    
                    const statusLabels = {
                        present: '<span class="status-badge" style="background-color: var(--primary-light); color: white;">มาเรียน</span>',
                        absent: '<span class="status-badge" style="background-color: var(--danger); color: white;">ขาด</span>',
                        leave: '<span class="status-badge" style="background-color: #D97706; color: white;">ลา</span>',
                        late: '<span class="status-badge" style="background-color: #4B5563; color: white;">สาย</span>',
                        activity: '<span class="status-badge" style="background-color: #8B5CF6; color: white;">กิจกรรม</span>'
                    };
                    
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td style="text-align: center;">${no}</td>
                        <td>${stItem.studentId}</td>
                        <td><strong>${name}</strong></td>
                        <td style="text-align: center;">${statusLabels[stItem.status] || stItem.status}</td>
                    `;
                    studentListTbody.appendChild(tr);
                });
            } else {
                studentListTbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-secondary);">ไม่มีนักเรียนที่เช็กชื่อ</td></tr>`;
            }
        }

        const extrasContainer = document.getElementById('history-detail-extras');
        if (extrasContainer) {
            extrasContainer.innerHTML = '';
            
            let teachersListStr = '-';
            if (log.teachers && log.teachers.length > 0) {
                teachersListStr = log.teachers.map(tUsername => {
                    const t = this.db.teachers.find(x => x.username === tUsername);
                    return t ? t.name : tUsername;
                }).join(', ');
            }
            
            let starsHtml = '';
            const ratingVal = log.rating || 0;
            for (let i = 1; i <= 5; i++) {
                if (i <= ratingVal) {
                    starsHtml += '<i class="fa-solid fa-star" style="color: var(--accent); margin-right: 2px;"></i>';
                } else {
                    starsHtml += '<i class="fa-regular fa-star" style="color: #D1D5DB; margin-right: 2px;"></i>';
                }
            }

            let html = `
                <div style="background: var(--gray-light); padding: 12px; border-radius: var(--radius-md); border: 1px solid var(--border-color); display: flex; flex-direction: column; gap: 10px; margin-top: 16px;">
                    <div><strong>ครูประจำฐานปฏิบัติหน้าที่:</strong> <span style="color: var(--text-primary);">${teachersListStr}</span></div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <strong>ประเมินผลกิจกรรม:</strong> 
                        <span style="display: inline-flex;">${starsHtml}</span>
                        <span style="font-weight: 700; color: var(--accent); margin-left: 4px;">${ratingVal.toFixed(1)}</span>
                    </div>
                    <div><strong>บันทึกเพิ่มเติม:</strong> <span style="font-style: italic; color: var(--text-primary);">${log.notes || 'ไม่มีบันทึกเพิ่มเติม'}</span></div>
                </div>
            `;
            
            if (log.photo) {
                html += `
                    <div style="margin-top: 16px;">
                        <strong>ภาพถ่ายกิจกรรม:</strong>
                        <div style="margin-top: 8px; max-width: 100%;">
                            <img src="${log.photo}" alt="History Photo Preview" style="max-width: 100%; max-height: 250px; border-radius: var(--radius-md); border: 1px solid var(--border-color); box-shadow: var(--shadow-sm);">
                        </div>
                    </div>
                `;
            }

            if (log.doc) {
                html += `
                    <div style="margin-top: 16px; display: flex; align-items: center; gap: 8px; background: #EFF6FF; border: 1px solid #BFDBFE; padding: 10px; border-radius: var(--radius-md);">
                        <i class="fa-solid fa-file-pdf" style="font-size: 24px; color: #2563EB;"></i>
                        <div style="flex: 1;">
                            <div style="font-weight: bold; font-size: 13px; color: #1E40AF; word-break: break-all;">${log.docName || 'เอกสารแนบ'}</div>
                            <div style="font-size: 11px; color: #1E3A8A;">มีข้อมูลเอกสารแนบประกอบรายการ</div>
                        </div>
                        <a href="${log.doc}" download="${log.docName}" class="btn btn-outline btn-xs" style="background: white; border-color: #BFDBFE; color: #2563EB;"><i class="fa-solid fa-download"></i> ดาวน์โหลด</a>
                    </div>
                `;
            }
            
            extrasContainer.innerHTML = html;
        }

        this.openModal('history-details-modal');
    }
}

// Global App Instance
let app;
window.addEventListener('DOMContentLoaded', () => {
    app = new AttendanceApp();
});
