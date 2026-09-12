# RetinaGuard - 5-Minute Setup Guide

## 1. Project Overview

RetinaGuard uses two databases:

- SQLite - Local/offline database on the technician device.
- Supabase PostgreSQL - Cloud database for centralized storage.

The local SQLite database stores data when the device is offline. When internet connectivity is available, the backend synchronizes pending SQLite records to the Supabase PostgreSQL database.

The overall architecture is:

Technician App
      ↓
Express Backend
      ↓
┌───────────────┬────────────────────┐
│ SQLite        │ Supabase PostgreSQL│
│ Local/Offline │ Cloud/District     │
└───────────────┴────────────────────┘

---

## 2. Prerequisites

Before starting, make sure the following software is installed:

- Node.js 22 or higher
- Git
- Visual Studio Code
- SQLite Studio (or DB Browser for SQLite)

A Supabase account and project are also required for the PostgreSQL cloud database.

---

## 3. Open the Project

1. Open Visual Studio Code.
2. Open the `retinaguard-backend` folder.
3. Open the integrated terminal in VS Code.
4. Make sure the terminal is opened inside the project folder.

The terminal path should point to the `retinaguard-backend` directory.

---

## 4. Install Project Dependencies

If dependencies have not already been installed, run:

```bash
npm install express sqlite3 pg dotenv uuid