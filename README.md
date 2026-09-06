# 🚀 Dealflow360

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-14+-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue?logo=typescript)
![Prisma](https://img.shields.io/badge/Prisma-ORM-1B222D?logo=prisma)
![Tailwind](https://img.shields.io/badge/Tailwind_CSS-Neo--Brutalist-38B2AC?logo=tailwind-css)

Welcome to **Dealflow360**, an advanced, AI-powered B2B Deal and Quotation Management System developed by **Team 488**. This platform is designed to streamline the entire lifecycle of business-to-business transactions, from initial quotation and AI-driven negotiation to fulfillment, invoicing, and subscription management.

Designed with a striking **Neo-brutalist UI theme**, Dealflow360 not only delivers robust backend logic through its specialized business engines but also provides a highly engaging and intuitive user experience.

---

## 📑 Table of Contents

1. [Project Overview & Explanations](#-project-overview--explanations)
2. [Key Use Cases](#-key-use-cases)
3. [Architecture & Business Logic](#-architecture--business-logic)
4. [Tech Stack & Required Tools](#-tech-stack--required-tools)
5. [Setup Instructions](#-setup-instructions)
6. [Contributors & Works](#-contributors--works)

---

## 📖 Project Overview & Explanations

Dealflow360 acts as a central hub for sales teams, administrators, and customers. It replaces fragmented quoting tools and spreadsheets with a unified system that handles complex business rules.

The application is split into three main access areas:

- **Admin Dashboard:** For internal teams to configure discount rules, upsell rules, warehouse inventory, and approval workflows.
- **Sales/Agent Dashboard:** For managing quotations, tracking deal health, evaluating risk, and processing orders and invoices.
- **Customer Portal:** A dedicated, secure portal for clients to review quotes, negotiate terms, accept offers, and manage their profiles.

### The AI Advantage

A standout feature of Dealflow360 is its integration of AI engines. The system uses AI to analyze quotes, evaluate deal health, and generate natural language explanations for complex pricing and risk factors. This empowers sales representatives to make data-backed decisions swiftly.

---

## 🎯 Key Use Cases

Dealflow360 is built to handle the most demanding B2B sales scenarios:

- **Dynamic Quotation & Negotiation:** Sales reps can generate complex quotes with multiple product variants. Customers can review and negotiate these quotes directly through the Customer Portal.
- **Intelligent Upselling:** The system evaluates current carts/quotes and automatically suggests logical upsells based on configurable rules.
- **Deal Health & Risk Assessment:** Before a quote is finalized, the `risk.engine` and `deal-health.engine` analyze the margins and customer history to assign a health score and flag potential risks.
- **Automated Approvals:** Quotes that exceed certain discount ceilings or risk thresholds are automatically routed through an approval workflow (`approval.engine`).
- **Multi-Warehouse Fulfillment:** Once an order is confirmed, the system can bulk-allocate inventory across different warehouses and manage fulfillment states.
- **Subscription & Billing Management:** Handles recurring billing, subscription plans, and invoice generation, complete with PDF and XLS export capabilities.

---

## 🏗 Architecture & Business Logic

The project follows a robust, modular architecture built on the Next.js App Router.

- **Service Layer (`src/lib/services/`):** Handles database interactions and CRUD operations for entities like approvals, audits, billing, and fulfillment.
- **Engine Layer (`src/lib/engines/`):** Encapsulates the core business logic. Key engines include:
  - `pricing.engine.ts` & `discount.engine.ts`: Calculates final prices based on price lists and discount ceilings.
  - `margin.engine.ts`: Ensures profitability rules are met.
  - `ai-explanation.engine.ts`: Interfaces with AI to explain deal metrics.
- **Security & Authentication (`src/lib/auth/`):** Implements Role-Based Access Control (RBAC), JWT sessions, secure password hashing, and rate limiting to protect API endpoints.

---

## 🛠 Tech Stack & Required Tools

To run and contribute to Dealflow360, you will need the following tools and technologies:

### Frontend

- **Framework:** Next.js (App Router paradigm)
- **Language:** TypeScript
- **Styling:** Tailwind CSS with PostCSS, customized for a Neo-brutalist aesthetic (`neo-brutalist-theme-guide.md`)
- **Icons & Assets:** Custom SVG assets (e.g., `globe.svg`, `window.svg`)

### Backend

- **API:** Next.js API Routes (`src/app/api/...`)
- **Database ORM:** Prisma (`schema.prisma`)
- **Authentication:** Custom JWT and session management with RBAC
- **File Exports:** PDF and Excel (XLS) generation for reports

### Prerequisites

- **Node.js** (v18.x or higher recommended)
- **npm** or **yarn** (project uses `package-lock.json`, so `npm` is preferred)
- **PostgreSQL** (or a compatible SQL database supported by Prisma)

---

## ⚙️ Setup Instructions

Follow these steps to get the Dealflow360 development environment running on your local machine:

### 1. Clone the Repository

```bash
git clone <repository-url>
cd team-488-dealflow360/frontend
```

### 2. Install Dependencies

Ensure you are in the `frontend` directory, then install the required NPM packages:

```bash
npm install
```

### 3. Environment Variables

Create a `.env` file in the `frontend` directory. You will need to configure your database connection string and application secrets:

```env
# Database configuration
DATABASE_URL="postgresql://user:password@localhost:5432/dealflow360?schema=public"

# Authentication Secrets
JWT_SECRET="your-super-secret-jwt-key"

# AI Provider Keys (if applicable)
AI_API_KEY="your-ai-api-key"
```

### 4. Database Setup & Prisma

Initialize the database schema and run the seed script to populate initial data (like admin accounts, demo products, and mock warehouses):

```bash
# Generate Prisma Client
npx prisma generate

# Apply database migrations
npx prisma migrate dev

# Seed the database
npx prisma db seed
```

### 5. Run the Development Server

Start the Next.js development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to view the application.

---

## 👥 Contributors & Works

Dealflow360 is proudly built by **Team 488**.

- **Frontend Development:** Implemented the responsive, Neo-brutalist dashboard and customer portal interfaces.
- **Backend & Database:** Designed the Prisma schema, API routes, and RBAC middleware.
- **Business Logic Engineers:** Architected the engine layer (`margin`, `pricing`, `risk`, `AI`) to ensure complex B2B rules are scalable and maintainable.

> **Note:** For detailed contributor guidelines, AI agent prompts, and architecture diagrams, please refer to the `md-docs/` and `AGENTS.md` / `CLAUDE.md` files located in the repository.

---

*README automatically generated for Dealflow360.*
