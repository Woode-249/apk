# Factory Management Application

## Overview

This is a full-stack factory management application with a Node.js/Express backend API and a Flutter mobile/web frontend. The system manages factory workers and their monthly work records, including salary and expense tracking. The application supports role-based access with admin and worker roles, where admins can manage users and workers can submit their monthly records.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Backend Architecture
- **Framework**: Node.js with Express.js for REST API
- **Data Storage**: File-based JSON storage using local files (`users.json` and `records.json`)
- **Middleware**: CORS enabled for cross-origin requests, body-parser for JSON parsing
- **Authentication**: Simple code-based authentication without JWT tokens
- **API Structure**: RESTful endpoints for user management and record operations

### Frontend Architecture
- **Primary Frontend**: Flutter application with multi-platform support (iOS, Android, Web, Windows, Linux, macOS)
- **State Management**: Provider pattern for state management
- **Local Storage**: SQLite database integration with sqflite package
- **Alternative Web Interface**: Simple HTML/CSS/JavaScript interface in `flutter_web/` directory
- **Internationalization**: Includes intl package for localization support

### Data Models
- **Users**: ID, name, code (authentication), role (admin/worker)
- **Records**: ID, userId, month, year, daysWorked, salary, expenses, notes, timestamp

### File-Based Storage
- Users and records are stored in JSON files within a `data/` directory
- Automatic initialization with default admin user (admin123)
- No database server required - all data persists in local files

### Cross-Platform Support
The Flutter application includes platform-specific configurations for:
- iOS with Xcode project files and assets
- Android support (implied by Flutter structure)
- Windows with CMake build system
- Linux with CMake build system and GTK dependencies
- macOS with Xcode project files
- Web deployment with manifest and service worker support

## External Dependencies

### Backend Dependencies
- **Express.js**: Web framework for API endpoints
- **CORS**: Cross-origin resource sharing middleware
- **body-parser**: JSON request parsing middleware
- **Node.js fs module**: File system operations for JSON data persistence

### Flutter Dependencies
- **cupertino_icons**: iOS-style icons
- **provider**: State management solution
- **sqflite**: SQLite database for local storage
- **path_provider**: File system path access
- **intl**: Internationalization and localization

### Development Tools
- **flutter_lints**: Code linting rules
- **flutter_test**: Testing framework

### Platform-Specific Dependencies
- **Windows**: Visual Studio build tools, CMake
- **Linux**: GTK+ 3.0, GLib, GIO libraries
- **macOS**: Xcode development tools

The application uses a hybrid storage approach where the backend uses file-based JSON storage while the Flutter app can optionally use SQLite for local caching and offline functionality.