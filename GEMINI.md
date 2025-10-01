# GEMINI.md

## Project Overview

This project, named **DocBare**, is a modern legal AI platform for agentic RAG (Retrieval-Augmented Generation), chat, and document analysis. It is built with a comprehensive stack that includes:

*   **Frontend:** Next.js 14 (App Router, React)
*   **Backend:** Next.js API Routes, Prisma ORM, Firestore
*   **AI:** DeepSeek LLM, OpenAI Embeddings, Vertex AI Vector Search
*   **Storage:** Google Cloud Storage, PostgreSQL, Firestore
*   **Auth:** NextAuth.js (Google OAuth, Credentials)

The application features a sophisticated database schema managed with Prisma, which includes models for users, subscriptions, chat sessions, documents, and more. It also has a "PleadSmart" feature, which appears to be a distinct part of the application with its own set of database models.

## Building and Running

### 1. Installation

To get started, clone the repository and install the dependencies:

```bash
git clone <your-repo-url>
cd docbare
npm install
```

### 2. Environment Variables

Before running the application, you need to set up your environment variables. A `.env.example` file is provided in the root directory. Create a `.env` file and populate it with the necessary credentials for services like your database, Google Cloud, and OpenAI.

### 3. Database Migration

This project uses Prisma for database management. To create and apply migrations, run the following command:

```bash
npx prisma migrate dev
```

### 4. Running the Application

To run the application in development mode, use the following command:

```bash
npm run dev
```

This will start the development server at `http://localhost:3000`.

### 5. Building for Production

To build the application for production, use the following command:

```bash
npm run build
```

### 6. Starting the Production Server

To start the production server, use the following command:

```bash
npm run start
```

## Testing

The project includes both end-to-end and unit tests.

*   **End-to-End Tests:** Playwright is used for end-to-end testing. The test files are located in the `e2e/` directory.
*   **Unit Tests:** Jest is used for unit testing. The configuration file is `jest.config.js`.
*   **Running Tests:** To run the tests, use the following command:

    ```bash
    npm run test
    ```

## Development Conventions

*   **Language:** The project is written in TypeScript.
*   **Database:** A PostgreSQL database is used with Prisma as the ORM. The database schema is defined in `prisma/schema.prisma`.
*   **Authentication:** Authentication is handled by NextAuth.js. The authentication options are configured in `lib/authOptions.ts`.
*   **API Routes:** The backend API is built with Next.js API Routes, located in the `app/api/` directory.
*   **Styling:** The project uses Tailwind CSS for styling. The configuration file is `tailwind.config.js`.
*   **Linting:** ESLint is used for linting. The configuration file is `eslint.config.mjs`.
*   **Cloud Services:** The project is tightly integrated with Google Cloud Platform (GCP) for services like Firestore, Document AI, and Vertex AI.
