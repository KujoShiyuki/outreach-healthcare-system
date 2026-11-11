# Outreach Healthcare Care System

A comprehensive healthcare management system designed for nursing care and outreach patient services, featuring role-based authentication, patient & nurse management, service packages, and slip payment verification.

---

## 🛠️ Tech Stack

### Backend
- **Language & Framework:** Java 17+, Spring Boot
- **Database:** MySQL
- **ORM / Persistence:** Spring Data JPA / Hibernate
- **Security:** Spring Security & JWT (JSON Web Tokens)
- **Build Tool:** Maven (`mvnw`)

### Frontend
- **Framework:** React 18
- **Build Tool:** Vite
- **Styling:** Tailwind CSS, PostCSS
- **State Management & Routing:** React Router DOM, Lucide Icons

---

## 📂 Project Structure

```text
├── backend/                  # Spring Boot REST API
│   ├── src/
│   │   └── main/
│   │       ├── java/         # Controllers, Services, Repositories, Entities
│   │       └── resources/
│   │           └── application.properties.example # Config template
│   ├── pom.xml               # Maven dependencies
│   └── mvnw / mvnw.cmd       # Maven Wrapper
├── frontend/                 # React + Vite Frontend
│   ├── src/                  # Components, Pages, Assets
│   ├── package.json          # Node dependencies
│   ├── tailwind.config.js    # Tailwind configuration
│   └── vite.config.js        # Vite configuration & API proxy
├── .gitignore
└── README.md
```

---

## 🚀 Getting Started

Follow these steps to set up and run the project locally.

### 1. Prerequisites
- **Java Development Kit (JDK 17+)**
- **Node.js (v18+) & npm**
- **MySQL Server**

---

### 2. Database & Backend Setup

1. **Start MySQL** and create a database:
   ```sql
   CREATE DATABASE `Outreach Healthcare Care System` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

2. **Configure Application Properties:**
   Go to `backend/src/main/resources/`, duplicate `application.properties.example` and rename it to `application.properties`:
   ```bash
   cp backend/src/main/resources/application.properties.example backend/src/main/resources/application.properties
   ```
   Open `application.properties` and update your database credentials:
   ```properties
   spring.datasource.username=root
   spring.datasource.password=YOUR_MYSQL_PASSWORD
   jwt.secret=YOUR_LONG_JWT_SECRET_KEY
   ```

3. **Run the Backend:**
   ```bash
   cd backend
   # On Windows:
   .\mvnw.cmd spring-boot:run
   # On Linux/macOS:
   ./mvnw spring-boot:run
   ```
   The backend will start at: `http://localhost:4000`

---

### 3. Frontend Setup

1. **Install dependencies:**
   ```bash
   cd frontend
   npm install
   ```

2. **Start the development server:**
   ```bash
   npm run dev
   ```
   The frontend will run at: `http://localhost:5173`

---

## 🔒 Security Note
Never commit real credentials, database passwords, or JWT secrets to version control. Always keep `application.properties` in your `.gitignore` and supply configuration via environment variables or local configuration templates.
