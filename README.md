# GeoAttend — GPS-Based Automated Attendance Manager

> A full-stack mobile application for automating classroom attendance using real-time GPS geofencing. Built with React Native (Expo), Firebase Realtime Database, and the Haversine geolocation algorithm.

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Firebase Data Model](#firebase-data-model)
- [Core Algorithms](#core-algorithms)
- [App Flow](#app-flow)
  - [Authentication Flow](#authentication-flow)
  - [Student Attendance Flow](#student-attendance-flow)
  - [Teacher Session Flow](#teacher-session-flow)
- [Project Structure](#project-structure)
- [Screen Breakdown](#screen-breakdown)
- [Getting Started](#getting-started)
- [Known Limitations & Future Work](#known-limitations--future-work)

---

## Overview

GeoAttend replaces manual paper-based or QR-code attendance with an automated, location-verified system. A teacher starts a session from their dashboard, which activates a geofence around the classroom. Students physically present within the geofenced boundary can mark their own attendance in real time. If a student is outside the boundary, the check-in button is disabled — preventing proxy attendance.

The system supports two distinct user roles (Student and Teacher), real-time synchronization across all connected clients via Firebase, and cross-platform deployment on iOS, Android, and Web from a single codebase.

---

## Key Features

### Student
| Feature | Description |
|---|---|
| Role-based Login | Secure login with persistent session via AsyncStorage |
| Dashboard | Subject-level attendance overview with a snap carousel, percentage badges, and a "classes needed to reach 75%" calculator |
| GPS Check-In | Real-time location tracking; attendance button only activates when inside the classroom geofence and a session is active |
| Attendance Table | Full list of subjects with attended/total counts, percentages, and color-coded status |
| Profile | View enrolled subjects, student ID (SRN), branch; update password |
| Auto-Login | Previous session is restored on app relaunch via AsyncStorage |

### Teacher
| Feature | Description |
|---|---|
| Class Dashboard | View all assigned classes with room number and schedule |
| Session Control | Start and end attendance sessions with a single tap |
| Live Attendance Count | Real-time count of students who have checked in, updated as they mark attendance |
| LIVE Indicator | Visual "LIVE" pill on class cards when a session is active |
| Multi-class Support | Manage multiple classes, each with their own independent sessions and geofences |

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     React Native (Expo)                  │
│  ┌──────────────┐   ┌─────────────────┐                 │
│  │  Student UI  │   │   Teacher UI    │                 │
│  │  (Tab Nav)   │   │  (Stack Screen) │                 │
│  └──────┬───────┘   └───────┬─────────┘                 │
│         │                   │                           │
│  ┌──────▼───────────────────▼─────────┐                 │
│  │          React Navigation          │                 │
│  │   Stack Navigator (App.js)         │                 │
│  └──────────────────┬─────────────────┘                 │
│                     │                                   │
│  ┌──────────────────▼─────────────────┐                 │
│  │         Firebase JS SDK v7         │                 │
│  │   Realtime Database (on/off/set)   │                 │
│  └──────────────────┬─────────────────┘                 │
└─────────────────────┼───────────────────────────────────┘
                       │  WebSocket (persistent connection)
┌─────────────────────▼───────────────────────────────────┐
│            Firebase Realtime Database                    │
│    /users  /teachers  /classes  /sessions  /attendance  │
└─────────────────────────────────────────────────────────┘

Device Layer:
  expo-location → GPS coordinates → Haversine calculation → geofence result
  AsyncStorage  → session token (SRNToken, userRole)
```

**State Management:** Component-level `useState` hooks. No Redux or Context API — state is intentionally kept local and hydrated from Firebase listeners (`on('value', ...)`) which automatically push updates to all connected devices.

---

## Tech Stack

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| Language | JavaScript (JSX) | ES2019+ | Application logic |
| Framework | React Native | ~16.9.0 | Cross-platform mobile UI |
| Build Toolchain | Expo | ~37.0.3 | Managed workflow, OTA updates |
| Navigation | React Navigation | 4.3.7 | Stack + Bottom Tab navigators |
| Backend / DB | Firebase Realtime DB | 7.9.0 | Real-time data sync, NoSQL |
| Location | expo-location | ~8.1.0 | GPS coordinates, permissions |
| Persistence | AsyncStorage | 1.9.0 | Session token storage |
| UI — Carousel | react-native-snap-carousel | 3.9.0 | Subject attendance cards |
| UI — Modals | react-native-modalbox | 2.0.0 | Bottom-sheet dialogs |
| UI — Icons | react-native-vector-icons | 6.6.0 | Material, Feather, AntDesign |
| Animations | react-native-reanimated | 1.8.0 | Gesture-driven animations |
| Utilities | lodash | 4.17.19 | Data manipulation helpers |
| Build Config | Babel (babel-preset-expo) | ~8.1.0 | JSX/ES transpilation |

**Target Platforms:** iOS, Android, Web (via Expo managed workflow)

---

## Firebase Data Model

The entire backend runs on Firebase Realtime Database. Below is the canonical document schema.

```
/students/{uid}
├── name:            string
├── SRN:             string          // Student Roll Number (login ID)
├── branch:          string
├── profilePic:      string (URL)
├── password:        string
├── enrolledClasses: string[]        // Array of classId references
├── subjects:        { subjectId: subjectName, ... }
└── attendance:      { subjectId: { "YYYY-MM-DD": "1"|"0", ... }, ... }

/teachers/{uid}
├── name:            string
├── employeeId:      string          // Teacher login ID
├── password:        string
└── classes:         string[]        // Array of classId references

/classes/{classId}
├── name:            string
├── subject:         string
├── room:            string
├── schedule:
│   ├── days:        string          // e.g., "Mon, Wed, Fri"
│   ├── startTime:   string
│   └── endTime:     string
├── geofence:
│   ├── lat:         number          // Classroom latitude
│   ├── lon:         number          // Classroom longitude
│   └── radius:      number          // Radius in meters (default: 100)
└── sessions:        { sessionId: SessionObject, ... }

/classes/{classId}/sessions/{sessionId}
├── active:          boolean         // true = session open for check-ins
├── startTime:       TIMESTAMP       // Firebase server timestamp
├── endTime:         TIMESTAMP       // Set when teacher ends session
└── attendance:      { studentId: AttendanceRecord, ... }

AttendanceRecord:
├── markedAt:        TIMESTAMP
├── accuracy:        number          // GPS accuracy in meters
└── status:          "present"
```

**Real-time Listeners used:**
- `db.ref('/users/{uid}').on('value')` — HomeScreen, ProfileScreen live sync
- `db.ref('/classes/{id}/sessions').on('value')` — TeacherDashboard live session state
- `db.ref('/classes/{id}/sessions/{sid}/attendance').on('value')` — live student count
- `db.ref('/classes/{id}').once('value')` — geofence coordinates on check-in

---

## Core Algorithms

### Haversine Distance Formula (`src/utils/geofence.js`)

Calculates the great-circle distance between two GPS coordinates on the Earth's surface.

```
a = sin²(Δlat/2) + cos(lat1) × cos(lat2) × sin²(Δlon/2)
c = 2 × atan2(√a, √(1−a))
distance = R × c            where R = 6,371,000 m (Earth radius)
```

**Geofence check:** `isInsideGeofence(userLocation, classLocation, radius)`
Returns `{ inside: boolean, distance: number }`. Attendance marking is only permitted when `inside === true`.

### Attendance Threshold Calculator (`src/screens/HomeScreen.js`)

Computes the minimum number of additional consecutive classes a student must attend to cross the 75% threshold:

```
classesNeeded = Math.max(0, Math.ceil((17 × total − 20 × attended) / 3))
```

Derived by solving: `(attended + x) / (total + x) ≥ 0.75` for `x`.

### Status Classifier

```
≥ 85%  → EXCELLENT  (green)
≥ 75%  → GOOD       (yellow/amber)
 < 75%  → LOW        (red)
```

---

## App Flow

### Authentication Flow

```
App Launch
    │
    ▼
AsyncStorage.getItem('SRNToken')
    ├── Token found ──→ Restore session ──→ Navigate to role home
    └── No token ──────→ LoginScreen
                              │
                        Role toggle (Student / Teacher)
                              │
                        Enter ID + Password
                              │
                        Query Firebase /students or /teachers
                              │
                        Validate credentials locally
                              ├── Match → Store token → Navigate to home
                              └── No match → Show error
```

### Student Attendance Flow

```
Student opens "Check-In" tab (GeofenceScreen)
    │
    ▼
Request location permission
    ├── Denied → Show "error" state with settings prompt
    └── Granted → Begin GPS watch (high accuracy, 3s/5m threshold)
                        │
                        ▼
                 Fetch enrolledClasses from Firebase
                        │
                        ▼
                 For each class, check /classes/{id}/sessions
                 where active === true
                        ├── No active session → Show "no_session" state
                        └── Active session found
                                    │
                                    ▼
                             Fetch class geofence (lat, lon, radius)
                                    │
                                    ▼
                             Continuous GPS position updates
                                    │
                             Haversine(userPos, classPos)
                                    ├── distance > radius → "outside" state
                                    └── distance ≤ radius → "inside" state
                                                    │
                                                    ▼
                                            "Mark Attendance" button enabled
                                                    │
                                             Student taps button
                                                    │
                                                    ▼
                                   Check if already marked for this session
                                                    ├── Already marked → Show confirmation
                                                    └── Not marked → Write to Firebase
                                                                  /classes/{id}/sessions/{sid}/attendance/{uid}
                                                                  { markedAt, accuracy, status: "present" }
```

### Teacher Session Flow

```
Teacher opens TeacherDashboard
    │
    ▼
Fetch /teachers/{uid}/classes → array of classIds
    │
    ▼
For each classId:
  - Fetch /classes/{id} (name, room, schedule, geofence)
  - Listen to /classes/{id}/sessions (active session detection)
  - If active session → listen to /sessions/{sid}/attendance (live count)
    │
    ▼
Render class cards (with LIVE indicator if session active)
    │
    ▼
Teacher taps "Start Session"
    │
    ▼
db.ref('/classes/{id}/sessions').push({
  active: true,
  startTime: ServerValue.TIMESTAMP
})
    │
    ▼
Firebase listener triggers → all enrolled students' GeofenceScreen
sees active session → check-in becomes available
    │
    ▼
Teacher taps "End Session"
    │
    ▼
db.ref('/classes/{id}/sessions/{sid}').update({
  active: false,
  endTime: ServerValue.TIMESTAMP
})
```

---

## Project Structure

```
automated-attendance-manager-react-native/
│
├── App.js                    # Root component — Stack Navigator setup, header config
├── app.json                  # Expo config (app name, icons, permissions, bundle ID)
├── babel.config.js           # Transpilation config
├── package.json              # Dependency manifest
│
├── assets/
│   ├── icon.png              # App icon (launcher)
│   ├── splash.png            # Splash screen (teal #00796B)
│   ├── loginLogo.png         # Branding on login screen
│   └── profilePic.png        # Default avatar placeholder
│
└── src/
    ├── config.js             # Firebase initialization and config object
    │
    ├── screens/
    │   ├── LoginScreen.js        # Branding wrapper, renders LoginForm
    │   ├── LoginForm.js          # Auth logic: credential validation, AsyncStorage
    │   ├── AppHome.js            # Bottom tab navigator (student interface)
    │   ├── HomeScreen.js         # Student dashboard: carousel, stats, threshold calc
    │   ├── AttendanceScreen.js   # Subject list with attendance percentages
    │   ├── GeofenceScreen.js     # GPS check-in: permission, geofence, session lookup
    │   ├── ProfileScreen.js      # Student profile view, password update, logout
    │   ├── TeacherDashboard.js   # Teacher class list, session start/end, live count
    │   └── ModalContent.js       # Attendance detail bottom sheet (placeholder)
    │
    └── utils/
        └── geofence.js           # calculateDistance() and isInsideGeofence()
```

---

## Screen Breakdown

### LoginScreen + LoginForm

- `KeyboardAvoidingView` wraps the form to prevent keyboard overlap on both iOS and Android.
- Role selection toggle determines which Firebase path is queried (`/students` vs `/teachers`).
- On successful login, `global.user` and `global.userRole` are set, and `SRNToken` is written to AsyncStorage to enable auto-login.

### HomeScreen (Student Dashboard)

- Subscribes to `/users/{uid}` with a persistent Firebase listener for live data.
- `react-native-snap-carousel` renders a horizontally scrollable card per subject, each showing the subject name, percentage, and classes-needed badge.
- Overall status (EXCELLENT / GOOD / LOW) is computed from aggregate attendance across all subjects.
- A GPS availability badge indicates whether a check-in session is currently active.

### GeofenceScreen (GPS Check-In)

- Uses `expo-location` `watchPositionAsync` with `accuracy: HIGH`, `distanceInterval: 5`, `timeInterval: 3000`.
- Implements a state machine: `requesting → searching → inside/outside/no_session/error`.
- Shows GPS accuracy in real time; displays a warning badge if accuracy exceeds 50m.
- On "Mark Attendance" tap, verifies session is still active and the student hasn't already checked in before writing the Firebase record.

### AttendanceScreen

- Flat list of all subjects; each row renders subject name, ID, attended/total counts, and a color-coded percentage pill.
- A `react-native-modalbox` bottom sheet is wired up for drill-down detail (placeholder for future implementation).

### TeacherDashboard

- Fetches teacher's class list on mount; attaches real-time listeners per class.
- Session start writes a new child node under `/sessions/`; end updates the existing node.
- Live attendance count is derived from `Object.keys(attendanceSnapshot.val() || {}).length`.
- `LIVE` pill animates green when `active === true` for the class's current session.

### ProfileScreen

- Renders SRN, branch, enrolled subjects, and a masked password field.
- Edit password flow opens an inline modal; updates `/users/{uid}/password` on Firebase.
- Logout clears `AsyncStorage`, nullifies `global.user` and `global.userRole`, and navigates back to the Login stack.

---

## Getting Started

### Prerequisites

- Node.js 12+
- Expo CLI: `npm install -g expo-cli`
- A Firebase project with Realtime Database enabled
- (For iOS builds) macOS with Xcode
- (For Android builds) Android Studio with SDK

### Installation

```bash
git clone https://github.com/<your-username>/automated-attendance-manager-react-native.git
cd automated-attendance-manager-react-native
npm install
```

### Firebase Setup

1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com).
2. Enable **Realtime Database** and set the rules to allow read/write for authenticated users (or as appropriate for your environment).
3. Open `src/config.js` and replace the placeholder values with your Firebase project credentials:

```js
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
};
```

4. Populate the database with at least one student and teacher record following the [Firebase Data Model](#firebase-data-model) schema above.

### Running the App

```bash
# Start the Expo development server
npm start

# Open on a connected Android device or emulator
npm run android

# Open on iOS Simulator (macOS only)
npm run ios

# Open in a web browser
npm run web
```

Scan the QR code with the **Expo Go** app on your physical device for the fastest development loop.

### Android Permissions

The following permissions are declared in `app.json` and will be requested at runtime:

```
ACCESS_FINE_LOCATION
ACCESS_COARSE_LOCATION
ACCESS_BACKGROUND_LOCATION
```

---

## Known Limitations & Future Work

| Area | Current State | Recommended Improvement |
|---|---|---|
| Authentication | Credentials validated client-side against plain-text Firebase records | Migrate to Firebase Authentication (Email/Password or Phone OTP) |
| Password Storage | Plain-text in Realtime Database | Hash with bcrypt server-side or use Firebase Auth entirely |
| Database Security Rules | Open read/write (development) | Implement Firebase Security Rules scoped per user role |
| Attendance Validation | Client-side only; no server-side geofence verification | Add Firebase Cloud Functions to re-validate GPS coordinates on write |
| Session Token | Raw SRN stored in AsyncStorage | Use Firebase Auth UID tokens with expiry |
| Expo SDK | SDK 37 (end of life) | Upgrade to SDK 50+ for latest APIs and security patches |
| Offline Support | No offline queue | Implement Firebase offline persistence (`enablePersistence()`) |
| Attendance Analytics | Basic percentage display | Add charts (Victory Native or react-native-chart-kit) for trend analysis |
| Push Notifications | Not implemented | Use Expo Notifications to alert students when a session starts |
| Admin Panel | No web dashboard | Build a React web app for institution-level reporting |

---

## License

Private — all rights reserved.

---

*Built with React Native + Expo + Firebase*
