# ⚡ **Sessionist** — SR Tracker

<p align="center">
  <img src="logo_final.png" alt="Sessionist Logo" width="120" />
</p>

<p align="center">
  <b>Master your medical & academic lectures with spaced repetition and active recall.</b>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Version-1.0.1-blue.svg?style=for-the-badge" alt="Version 1.0.1" />
  <img src="https://img.shields.io/badge/React-19.0-61DAFB.svg?style=for-the-badge&logo=react" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-5.7-3178C6.svg?style=for-the-badge&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind-CSS-38B2AC.svg?style=for-the-badge&logo=tailwind-css" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Capacitor-Mobile-119EFF.svg?style=for-the-badge&logo=capacitor" alt="Capacitor" />
</p>

---

## 🌟 Key Features

- **🧠 NotebookLM-Grade AI Flashcard Generator**: Automatically extracts high-yield testable concepts, medical formulas, and definitions from PDF slides and text notes using Google Gemini 2.0 & 1.5.
- **📅 Spaced Repetition Review Engine**: Daily review system with automated due-today counters, past mistake tracking, and retention statistics.
- **📚 Lecture Library & Log**: Complete course organization by Subject, Module, and Lecture Status.
- **☁️ Real-time Cloud Sync**: Instant cross-device synchronization between web browser and native Android app.
- **🎨 Modern Dynamic Theme Engine**: Smooth glassmorphism, accent color customization, Light Mode, Dark Mode, and OLED Pitch-Black theme.

---

## 📱 Live Web App & Downloads

- 🌐 **Live Web Version**: [https://yourusername.github.io/TTracker](https://yourusername.github.io/TTracker) *(Online 24/7)*
- 📦 **Download Android APK**: [Release v1.0.1 APK](../../releases/latest)

---

## 🛠️ Tech Stack

- **Frontend Core**: React 19, TypeScript, Tailwind CSS, Vite
- **AI Integration**: Google Gemini API (2.0 Flash & 1.5 Flash REST v1 API)
- **Mobile Engine**: Capacitor (Android Native WebView)
- **Backend / Database**: Firebase Authentication & Firestore Realtime Cloud Storage
- **UI & Icons**: Lucide React, Canvas Confetti

---

## 🚀 Quick Start & Development

### 1. Clone the repository
```bash
git clone https://github.com/yourusername/TTracker.git
cd TTracker
```

### 2. Install dependencies
```bash
npm install
```

### 3. Run Development Server
```bash
npm run dev
```
Open `http://localhost:5173` in your browser.

### 4. Build for Production & Android APK
```bash
# Build Web Bundle & Sync to Capacitor Android
npm run cap:build
```
Then open Android Studio:
```bash
npx cap open android
```

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

<p align="center">
  Built with ❤️ for Students
</p>
