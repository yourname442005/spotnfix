# SpotnFix

### Smart Civic Issue Reporting and Resolution Platform

SpotnFix is a full-stack civic engagement platform that allows citizens to report public issues, administrators to verify and assign those issues, and department/field workers to resolve them.

The platform provides a complete report lifecycle:

```text
Citizen Reports Issue
        ↓
     PENDING
        ↓
     VERIFIED
        ↓
      ASSIGNED
        ↓
    IN_PROGRESS
        ↓
     RESOLVED
```

The system also includes role-based access control, secure session authentication, image evidence processing, report assignment, profile management, and automated security/regression testing.

---

## Table of Contents

- [Features](#features)
- [System Architecture](#system-architecture)
- [Application Workflow](#application-workflow)
- [User Roles](#user-roles)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Requirements](#requirements)
- [Development Environment](#development-environment)
- [VS Code Extensions](#vs-code-extensions)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [Available Portals](#available-portals)
- [Authentication and Security](#authentication-and-security)
- [Report Lifecycle](#report-lifecycle)
- [Image Processing](#image-processing)
- [API Overview](#api-overview)
- [Testing](#testing)
- [Development Workflow](#development-workflow)
- [Troubleshooting](#troubleshooting)
- [Git and Contribution Guidelines](#git-and-contribution-guidelines)
- [Future Improvements](#future-improvements)

---

# Features

## Citizen Portal

Citizens can:

- Create an account
- Log in securely
- Submit civic issue reports
- Upload photographic evidence
- View submitted reports
- Track report status
- View report statistics
- View and update their profile
- Log out securely

---

## Admin Portal

Administrators can:

- Register and log in
- View citizen reports
- Verify submitted reports
- Reject invalid reports
- View registered department managers
- Assign verified reports to department managers
- View assignment status
- View and update their profile
- Log out securely

---

## Department Manager / Field Worker Portal

Department managers can:

- Register and log in
- View only reports assigned to them
- View report details
- Start work on an assigned report
- Mark reports as resolved
- View and update their profile
- Log out securely

---

## Security Features

SpotnFix includes:

- Server-managed sessions
- Opaque cryptographically secure session tokens
- HttpOnly session cookies
- SameSite cookie protection
- Secure cookies in production
- Role-based authorization
- Profile ownership checks
- Report ownership checks
- Department-manager assignment authorization
- Password hashing with bcrypt
- Legacy plaintext-password migration
- Session invalidation on logout
- Session expiration
- Canonical report status validation
- Illegal state-transition protection
- Input validation
- ObjectId validation
- Security regression tests
- Protection against IDOR/BOLA/BFLA-style access issues

---

# System Architecture

SpotnFix follows a traditional client-server architecture.

```text
                         ┌─────────────────────┐
                         │      Browser        │
                         └──────────┬──────────┘
                                    │
              ┌─────────────────────┼─────────────────────┐
              │                     │                     │
              ▼                     ▼                     ▼
      ┌──────────────┐      ┌──────────────┐      ┌──────────────┐
      │    Citizen   │      │    Admin     │      │      DM      │
      │    Portal    │      │    Portal    │      │    Portal    │
      └──────┬───────┘      └──────┬───────┘      └──────┬───────┘
             │                     │                     │
             └─────────────────────┼─────────────────────┘
                                   │
                              HTTP / Fetch
                                   │
                                   ▼
                         ┌─────────────────────┐
                         │   Express Server    │
                         │     server.js       │
                         └──────────┬──────────┘
                                    │
              ┌─────────────────────┼─────────────────────┐
              │                     │                     │
              ▼                     ▼                     ▼
      ┌──────────────┐      ┌──────────────┐      ┌──────────────┐
      │ Authentication│      │ Authorization│      │ Report       │
      │ & Sessions    │      │ & Roles      │      │ Lifecycle    │
      └──────────────┘      └──────────────┘      └──────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    │                               │
                    ▼                               ▼
             ┌──────────────┐               ┌──────────────┐
             │   MongoDB    │               │    Python    │
             │   Database   │               │ Image Engine │
             └──────────────┘               └──────┬───────┘
                                                   │
                                                   ▼
                                            ┌──────────────┐
                                            │ Pillow /     │
                                            │ Metadata     │
                                            └──────────────┘
```

---

# Application Architecture

The project is divided into several logical layers.

## 1. Frontend Layer

The frontend consists of static HTML, CSS and JavaScript portals.

```text
landing_page/
user/
admin/
dm/
shared/
```

Each portal communicates with the Express backend using the shared API client.

---

## 2. Backend Layer

The main backend entry point is:

```text
server.js
```

It handles:

- Express configuration
- Static file serving
- Authentication
- Session management
- Authorization
- User management
- Report creation
- Report retrieval
- Report lifecycle transitions
- Admin verification
- DM assignment
- Profile management
- Image uploads
- Python image-processing integration

---

## 3. Business Logic Layer

Reusable backend logic is kept under:

```text
lib/
```

Important modules include:

### `lib/sessions.js`

Responsible for:

- Session token generation
- Session hashing
- Session creation
- Session lookup
- Session expiration
- Session destruction

---

### `lib/passwords.js`

Responsible for:

- Password hashing
- Password verification
- Secure password comparison
- Legacy password migration

---

### `lib/reportLifecycle.js`

Contains the canonical report state machine.

Example:

```text
PENDING
   │
   ├──► VERIFIED
   │       │
   │       └──► ASSIGNED
   │                │
   │                └──► IN_PROGRESS
   │                         │
   │                         └──► RESOLVED
   │
   └──► REJECTED
```

Illegal transitions are rejected by the backend.

---

### `lib/python.js`

Handles Python interpreter resolution.

The application supports platform-specific Python commands and checks that the required Python dependencies are available before processing images.

---

# Application Workflow

## Complete Report Lifecycle

### Step 1: Citizen

The citizen submits:

```text
Issue description
Location
Category
Image evidence
```

The backend creates a report with:

```text
status = PENDING
```

---

### Step 2: Admin Verification

The administrator reviews the report.

Possible actions:

```text
PENDING → VERIFIED
PENDING → REJECTED
```

---

### Step 3: Assignment

A verified report can be assigned to a department manager.

```text
VERIFIED → ASSIGNED
```

The assignment records:

- Department manager ID
- Department manager name
- Department
- Assigning admin
- Assignment timestamp

---

### Step 4: Department Manager

The assigned manager sees the report.

```text
ASSIGNED → IN_PROGRESS
```

---

### Step 5: Resolution

After completing the work:

```text
IN_PROGRESS → RESOLVED
```

The system records resolution metadata such as:

- Completing manager
- Resolution notes
- Resolution timestamp
- Updated timestamp

---

# User Roles

| Role | Main Responsibility |
|---|---|
| Citizen | Submit and track civic reports |
| Admin | Verify, reject and assign reports |
| Department Manager | Work on assigned reports and resolve them |

The backend never trusts a role supplied by the frontend.

The authenticated role comes from the server-side session.

---

# Technology Stack

## Backend

- Node.js
- Express.js
- MongoDB
- Mongoose / MongoDB driver
- bcryptjs
- Multer
- Native Node.js crypto APIs

## Frontend

- HTML5
- CSS3
- Vanilla JavaScript
- Fetch API

## Image Processing

- Python
- Pillow
- PyMongo

Image processing is used for metadata/evidence processing including:

- Image validation
- EXIF metadata
- Timestamp extraction
- GPS metadata
- Image age validation
- Evidence storage

## Testing

- Node.js built-in test runner
- API tests
- Authentication tests
- Security tests
- Report lifecycle tests
- Browser-based E2E testing

## Database

MongoDB is used as the primary application database.

---

# Project Structure

```text
SIH/
│
├── admin/
│   ├── admin-portal.html
│   ├── admin-portal.js
│   ├── assignments.html
│   ├── assignments.js
│   └── ...
│
├── dm/
│   ├── dm-portal.html
│   ├── dm-portal.js
│   └── ...
│
├── user/
│   ├── page1.html
│   ├── ...
│   └── public/
│
├── landing_page/
│   ├── index.html
│   ├── ...
│   └── ...
│
├── shared/
│   └── api-config.js
│
├── lib/
│   ├── passwords.js
│   ├── python.js
│   ├── reportLifecycle.js
│   ├── sessions.js
│   └── ...
│
├── test/
│   ├── auth.session.test.js
│   ├── passwords.test.js
│   ├── python.test.js
│   ├── reportLifecycle.test.js
│   ├── reportWorkflow.api.test.js
│   ├── profileAuthorization.api.test.js
│   ├── adminDmDirectory.api.test.js
│   └── ...
│
├── security-tests/
│   └── authorization.test.js
│
├── uploads/
│
├── server.js
├── process.py
├── package.json
├── package-lock.json
├── requirements.txt
├── .gitignore
└── README.md
```

---

# Requirements

A new developer needs the following installed.

## Required Software

### 1. Git

Install Git:

```bash
git --version
```

---

### 2. Node.js

Node.js is required for the Express backend.

Recommended:

```text
Node.js 20 LTS or newer
```

Verify:

```bash
node --version
npm --version
```

---

### 3. Python

Python is required for image metadata processing.

Recommended:

```text
Python 3.11+
```

The project has also been tested with newer Python versions.

Verify:

```bash
python3 --version
```

On Windows:

```powershell
python --version
```

---

### 4. MongoDB

SpotnFix requires MongoDB.

You can use either:

- MongoDB Community Server running locally
- MongoDB Atlas

For local development, the application expects MongoDB on:

```text
mongodb://127.0.0.1:27017/
```

The application database is:

```text
sih_database
```

Verify that MongoDB is running before starting SpotnFix.

---

### 5. Modern Web Browser

Recommended:

- Google Chrome
- Microsoft Edge
- Mozilla Firefox
- Safari

Chrome is recommended for development and browser testing.

---

# Development Environment

The project can be developed using:

- VS Code
- Cursor
- Antigravity
- OpenCode
- Any modern JavaScript/Python IDE

VS Code is recommended for contributors who want a simple setup.

---

# VS Code Extensions

The following extensions are recommended.

## Required / Strongly Recommended

### JavaScript and Node.js

**ESLint**

Extension:

```text
dbaeumer.vscode-eslint
```

Useful for JavaScript linting and code quality.

---

### Python

**Python**

Extension:

```text
ms-python.python
```

Required for a good Python development experience.

---

### Python IntelliSense

**Pylance**

Extension:

```text
ms-python.vscode-pylance
```

Provides:

- Autocomplete
- Type checking
- Import detection
- Python diagnostics

---

### MongoDB

**MongoDB for VS Code**

Extension:

```text
mongodb.mongodb-vscode
```

Useful for:

- Connecting to MongoDB
- Browsing databases
- Inspecting collections
- Running MongoDB queries

---

### Git

**GitLens**

Extension:

```text
eamodio.gitlens
```

Optional but useful for:

- Commit history
- Blame information
- Branch inspection
- Repository navigation

---

### API Testing

**REST Client**

Extension:

```text
humao.rest-client
```

Optional.

Useful for testing API endpoints directly from VS Code.

---

### Formatting

**Prettier**

Extension:

```text
esbenp.prettier-vscode
```

Optional but recommended for consistent formatting.

---

# Installation

Clone the repository:

```bash
git clone https://github.com/yourname442005/spotnfix.git
```

Move into the project:

```bash
cd spotnfix
```

Install Node.js dependencies:

```bash
npm install
```

---

# Python Setup

Create a Python virtual environment.

## macOS / Linux

```bash
python3 -m venv .venv
```

Activate it:

```bash
source .venv/bin/activate
```

---

## Windows

Create the environment:

```powershell
python -m venv .venv
```

Activate it:

```powershell
.venv\Scripts\activate
```

---

## Install Python dependencies

```bash
pip install -r requirements.txt
```

Verify Pillow:

```bash
python3 -c "from PIL import Image; print('Pillow OK')"
```

Verify PyMongo:

```bash
python3 -c "import pymongo; print('PyMongo OK')"
```

On Windows, use `python` instead of `python3` if required.

---

# MongoDB Setup

## Option 1: Local MongoDB

Start MongoDB locally.

The application uses:

```text
mongodb://127.0.0.1:27017/sih_database
```

No cloud database is required for local development.

---

## Option 2: MongoDB Atlas

If using MongoDB Atlas, configure the MongoDB connection string through your local environment/configuration.

### IMPORTANT

Never commit:

```text
.env
```

or MongoDB passwords/API credentials into Git.

Use `.gitignore` for local secrets.

---

# Configuration

The backend supports configuration through environment variables.

Example:

```bash
export MONGODB_URI="mongodb://127.0.0.1:27017/sih_database"
export PORT=5001
```

On Windows PowerShell:

```powershell
$env:MONGODB_URI="mongodb://127.0.0.1:27017/sih_database"
$env:PORT="5001"
```

The default development server port is:

```text
5001
```

The frontend uses the shared API configuration:

```text
shared/api-config.js
```

Authenticated requests automatically include the session cookie.

---

# Running the Application

From the project root:

```bash
npm start
```

If the project is configured to use the direct server entry point:

```bash
node server.js
```

The server should become available at:

```text
http://localhost:5001
```

---

# Available Portals

## Landing Page

```text
http://localhost:5001/
```

---

## Citizen Portal

```text
http://localhost:5001/user
```

---

## Admin Portal

```text
http://localhost:5001/admin
```

---

## Department Manager Portal

```text
http://localhost:5001/dm
```

---

# Authentication

SpotnFix uses server-managed session authentication.

The flow is:

```text
User Login
    ↓
Express validates credentials
    ↓
Secure random session token generated
    ↓
Only token hash stored in MongoDB
    ↓
Raw token sent as HttpOnly cookie
    ↓
Browser automatically sends cookie
    ↓
Express resolves session
    ↓
req.auth populated
    ↓
Role authorization
```

The cookie is named:

```text
sih_session
```

The session is not stored in localStorage.

Frontend JavaScript cannot read the HttpOnly cookie.

---

# Authorization Model

Every protected request is checked against the server-side session.

Example:

```text
Citizen session
    ↓
Citizen-only endpoint
    ↓
Allowed
```

But:

```text
Citizen session
    ↓
Admin endpoint
    ↓
403 Forbidden
```

Similarly:

```text
DM A
    ↓
DM B's assigned report
    ↓
403 Forbidden
```

The frontend cannot simply change:

```text
userId
adminId
dmId
```

to impersonate another account.

The backend determines the authenticated actor from the session.

---

# Report Lifecycle

SpotnFix uses a canonical state machine.

```text
                  ┌──────────────┐
                  │    PENDING   │
                  └──────┬───────┘
                         │
              ┌──────────┴──────────┐
              ▼                     ▼
        ┌───────────┐         ┌──────────┐
        │  VERIFIED │         │ REJECTED │
        └─────┬─────┘         └──────────┘
              │
              ▼
        ┌───────────┐
        │  ASSIGNED │
        └─────┬─────┘
              │
              ▼
        ┌─────────────┐
        │ IN_PROGRESS │
        └──────┬──────┘
               │
               ▼
         ┌───────────┐
         │  RESOLVED │
         └───────────┘
```

An `ESCALATED` state is also supported.

Illegal transitions are rejected by the backend with an appropriate error response.

---

# Image Processing

Citizen reports can contain image evidence.

The Node.js backend receives the uploaded image and invokes the Python image-processing pipeline.

```text
Browser
   │
   │ Image Upload
   ▼
Express / Multer
   │
   ▼
Python Processor
   │
   ├── Image validation
   ├── EXIF extraction
   ├── Timestamp extraction
   ├── GPS extraction
   └── Metadata processing
   │
   ▼
MongoDB / Evidence Storage
```

Python dependencies are defined in:

```text
requirements.txt
```

The primary image-processing library is:

```text
Pillow
```

MongoDB access from Python uses:

```text
PyMongo
```

---

# API Overview

The backend exposes REST-style endpoints for authentication, profiles, reports and administration.

## Authentication

```text
POST /api/signup
POST /api/login

POST /api/admin/register
POST /api/admin/login

POST /api/dm/register
POST /api/dm/login

POST /api/logout
```

---

## Citizen

```text
GET /api/user/profile/:userId
PUT /api/user/profile/:userId

GET /api/user/reports/:userId

POST /api/store-issue
POST /api/upload-image
```

---

## Admin

```text
GET /api/admin/profile/:adminId
PUT /api/admin/profile/:adminId

GET /api/admin/reports

GET /api/admin/dms

PUT /api/admin/reports/:reportId/status

POST /api/admin/reports/:reportId/assign
```

---

## Department Manager

```text
GET /api/dm/profile/:dmId
PUT /api/dm/profile/:dmId

GET /api/dm/reports

PUT /api/dm/reports/:reportId/status
```

All protected endpoints require an authenticated session and appropriate role authorization.

---

# Testing

SpotnFix contains automated tests covering:

- Authentication
- Sessions
- Password handling
- Report lifecycle
- Report API workflows
- Profile authorization
- Admin/DM functionality
- Security authorization
- Python integration

---

## Run the complete test suite

```bash
npm test
```

Expected current result:

```text
114/114 tests passing
```

---

## Run security tests

```bash
npm run test:security
```

Expected current result:

```text
15/15 tests passing
```

---

## JavaScript syntax check

For the backend:

```bash
node --check server.js
```

---

## Python syntax check

```bash
python3 -m py_compile process.py
```

---

# Browser End-to-End Testing

The complete application workflow has been verified through a real browser.

The primary E2E scenario is:

```text
Citizen
  │
  ├── Register/Login
  │
  ├── Submit civic report
  │
  ▼
Admin
  │
  ├── View report
  ├── Verify report
  └── Assign DM
  │
  ▼
Department Manager
  │
  ├── View assigned report
  ├── Start Work
  └── Mark Resolved
  │
  ▼
Citizen
  │
  └── See RESOLVED report
```

Security behavior was also verified for:

- Unauthenticated requests
- Wrong-role requests
- Profile ID mismatch
- Unauthorized report access
- Duplicate assignment
- Illegal status transitions
- Unknown reports
- Missing assignment information
- Logout/session invalidation

---

# Development Workflow

Recommended workflow for contributors:

## 1. Clone

```bash
git clone https://github.com/yourname442005/spotnfix.git
cd spotnfix
```

## 2. Install dependencies

```bash
npm install
```

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## 3. Start MongoDB

Make sure MongoDB is running locally or configure an appropriate MongoDB URI.

## 4. Start the application

```bash
npm start
```

## 5. Test

```bash
npm test
npm run test:security
```

## 6. Develop

Make changes in the appropriate portal/backend directory.

## 7. Verify

Before committing:

```bash
npm test
npm run test:security
```

Also verify the relevant browser workflow.

---

# Important Development Rules

## Do not trust frontend identity

Never use a frontend-provided:

```text
userId
adminId
dmId
role
```

as the authoritative identity.

The backend session is the source of truth.

---

## Do not store passwords in localStorage

Passwords must never be stored in:

```text
localStorage
sessionStorage
cookies accessible to JavaScript
```

---

## Do not commit secrets

Never commit:

```text
.env
database passwords
API keys
tokens
private keys
cloud credentials
production credentials
```

The repository ignores local backup files and other development-only artifacts.

---

## Do not bypass lifecycle validation

Do not directly update:

```text
status
```

in the frontend or database to bypass the report state machine.

Use the appropriate API endpoint.

---

# Troubleshooting

## MongoDB connection error

If you see an error similar to:

```text
MongoServerSelectionError
```

check that MongoDB is running.

For local MongoDB, verify:

```text
mongodb://127.0.0.1:27017/
```

---

## Port already in use

Check port 5001:

### macOS / Linux

```bash
lsof -i :5001
```

Kill the process if necessary:

```bash
kill <PID>
```

Or use another port:

```bash
PORT=5002 npm start
```

---

## Python not found

Check:

```bash
python3 --version
```

If necessary, specify the Python executable through the project's supported Python configuration.

On Windows:

```powershell
python --version
```

---

## Pillow not found

Activate the virtual environment:

```bash
source .venv/bin/activate
```

Then:

```bash
pip install -r requirements.txt
```

Verify:

```bash
python3 -c "from PIL import Image; print('Pillow OK')"
```

---

## PyMongo not found

Run:

```bash
pip install pymongo
```

or reinstall all Python dependencies:

```bash
pip install -r requirements.txt
```

---

## Session problems after changing backend configuration

Log out and log back in.

If necessary, clear the site's cookies for:

```text
localhost
```

The application uses the `sih_session` HttpOnly cookie for authentication.

---

## Frontend receives 401

A `401 Unauthorized` normally means the browser does not have a valid session.

Try:

1. Log in again.
2. Verify the backend is running.
3. Verify the request is going to the correct server.
4. Check that cookies are enabled.
5. Check the browser's Network tab.

---

## Frontend receives 403

A `403 Forbidden` normally means the session is authenticated but does not have permission for the requested resource.

Examples:

```text
Citizen → Admin endpoint
DM A → DM B's report
User A → User B's profile
```

These requests are intentionally rejected.

---

# Database Collections

The application uses MongoDB for persistent data.

Depending on the current database state, collections include data for:

```text
users
admins
dms
reports
sessions
```

and other application-specific data created by the backend.

Do not manually modify production report statuses unless you fully understand the lifecycle rules.

---

# Security Architecture

The security model can be summarized as:

```text
                    Browser
                       │
                       ▼
                Session Cookie
                HttpOnly + Lax
                       │
                       ▼
              Express Middleware
                       │
                       ▼
              Session Validation
                       │
                       ▼
                  req.auth
                       │
             ┌─────────┴─────────┐
             ▼                   ▼
           Role              Ownership
         Validation           Checks
             │                   │
             └─────────┬─────────┘
                       ▼
                 API Handler
                       │
                       ▼
                    MongoDB
```

The backend therefore follows:

```text
Authentication
      ↓
Authorization
      ↓
Ownership validation
      ↓
Business-rule validation
      ↓
Database operation
```

---

# Current Project Verification

The current main branch has passed the following verification gates:

```text
Automated tests             114 / 114   PASS
Security tests               15 / 15    PASS
JavaScript syntax checks                PASS
Python syntax checks                    PASS
Frontend inline-script checks           PASS
Browser E2E workflow                    PASS
Git working tree                        CLEAN
```

The verified core workflow is:

```text
Citizen
   ↓
Create Report
   ↓
PENDING
   ↓
Admin Verification
   ↓
VERIFIED
   ↓
Admin Assignment
   ↓
ASSIGNED
   ↓
DM Start Work
   ↓
IN_PROGRESS
   ↓
DM Resolution
   ↓
RESOLVED
   ↓
Citizen sees resolution
```

---

# Future Improvements

Potential future improvements include:

- Advanced UI/UX redesign
- Responsive mobile-first improvements
- Real-time notifications
- Email/SMS notifications
- Advanced admin analytics
- Geographic issue visualization
- Map-based reporting
- Department performance analytics
- Report prioritization
- AI-assisted issue categorization
- Duplicate issue detection
- Image-based issue classification
- Production deployment
- Rate limiting
- Additional CSRF protection
- Password reset functionality
- Account recovery
- Audit logging
- Production monitoring
- Automated CI/CD

---

# Contributing

1. Fork the repository.
2. Create a feature branch.

```bash
git checkout -b feature/your-feature
```

3. Install dependencies.
4. Make your changes.
5. Run the test suites.

```bash
npm test
npm run test:security
```

6. Test the relevant browser workflow.
7. Commit your changes.

```bash
git add .
git commit -m "feat: describe your change"
```

8. Push your branch.

```bash
git push origin feature/your-feature
```

9. Open a Pull Request.

---

# License

This project is currently maintained as an academic / hackathon project.

Add an explicit open-source license here if the project is intended to be distributed under one.

---

# Authors

**SpotnFix Development Team**

Built as a civic technology platform for reporting, managing and resolving public issues.

---

## Quick Start

For experienced developers, the shortest setup is:

```bash
git clone https://github.com/yourname442005/spotnfix.git
cd spotnfix

npm install

python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

npm start
```

Then open:

```text
http://localhost:5001/
```

Run tests with:

```bash
npm test
npm run test:security
```

---

**SpotnFix: Report. Verify. Assign. Resolve.**
