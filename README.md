# SigmaGPT 🤖

A modern, full-stack AI conversation platform with a sleek, responsive UI, powered by **Google Gemini** (with OpenAI fallback) and **MySQL** (with MongoDB and local persistent storage fallback).

---

## 🌟 Key Features

- **Multi-AI Engine**: Powered primarily by Google Gemini (Free tier, fast & intelligent) with automatic fallback to OpenAI.
- **Robust Storage Architecture**:
  - 🐬 **MySQL**: Relational storage (viewable & manageable directly in MySQL Workbench).
  - 🍃 **MongoDB**: Document database support (optional).
  - 📁 **Local Storage**: Automatic fallback to persistent local JSON storage if databases are unavailable.
- **Search & Thread Management**: Search past conversations, rename threads, and switch between chats seamlessly.
- **Apple-inspired UI**: Clean typography, code syntax highlighting, and responsive sidebar navigation.

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- Node.js (v18 or higher)
- (Optional) MySQL or MongoDB installed locally

### 2. Backend Setup
1. Open a terminal and navigate to `Backend`:
   ```bash
   cd Backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create your `.env` configuration file from the template:
   ```bash
   cp .env.example .env
   ```
4. Add your API key in `Backend/.env`:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```
5. Start the backend server:
   ```bash
   npm run dev
   ```
   Backend will run on `http://localhost:8080`.

---

### 3. Frontend Setup
1. Open a new terminal and navigate to `Frontend`:
   ```bash
   cd Frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
4. Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🛡️ Environment Variables Guide

### Backend (`Backend/.env`)
| Variable | Description | Default |
|---|---|---|
| `GEMINI_API_KEY` | Google Gemini API Key (Recommended) | - |
| `OPENAI_API_KEY` | OpenAI API Key (Optional fallback) | - |
| `MYSQL_HOST` | MySQL hostname | `localhost` |
| `MYSQL_PORT` | MySQL port | `3306` |
| `MYSQL_USER` | MySQL username | `root` |
| `MYSQL_PASSWORD` | MySQL password | `""` |
| `MYSQL_DATABASE` | MySQL database name | `sigmagpt` |
| `MONGODB_URI` | MongoDB connection string (Optional) | `mongodb://localhost:27017/sigmagpt` |
| `PORT` | Backend server port | `8080` |

### Frontend (`Frontend/.env`)
| Variable | Description | Default |
|---|---|---|
| `VITE_API_URL` | Backend server base URL | `http://localhost:8080` |

---

## 👥 Authors & Credits
Made with ♥ by **Ayushi & Bhuwan**

