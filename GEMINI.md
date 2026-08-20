# Project Overview

This is a 3D Bomberman-style game built with Angular and Three.js for the frontend. The backend is a Node.js server using Express, with Server-Side Rendering (SSR) for the Angular application.

## Key Technologies

-   **Frontend**: Angular, TypeScript, Three.js for 3D graphics.
-   **Backend**: Node.js, Express.js.
-   **Database**: PostgreSQL with Prisma as the ORM.
-   **Authentication**: Passport.js with Google and Microsoft OAuth strategies.
-   **Payments**: Woovi for PIX payments, including charge creation and webhook handling.
-   **Real-time Communication**: Socket.io for real-time features.
-   **Testing**: Vitest for unit tests.

## Project Structure

-   `src/app`: Contains the Angular frontend application code.
-   `src/server.ts`: The entry point for the Express backend server. It handles SSR, API routes, authentication, and Socket.io.
-   `src/routes`: Contains the API route definitions, such as `paymentRoutes.ts`.
-   `prisma`: Contains the database schema (`schema.prisma`) and configuration.
-   `public`: Static assets for the application.

## Building and Running

### Prerequisites
- Node.js and npm
- A PostgreSQL database.

### Setup
1.  Install dependencies: `npm install`
2.  Set up your environment variables by copying `.env.example` to `.env` and filling in the required values (database URL, OAuth credentials, etc.).
3.  Run database migrations: `npm run migrate:dev`

### Development
-   To start the Angular development server:
    ```bash
    npm start
    ```
-   To run the backend server with SSR:
    ```bash
    npm run dev:ssr
    ```

### Production
-   To build the application:
    ```bash
    npm run build
    ```
-   To start the production server:
    ```bash
    npm run serve:ssr:bomberman
    ```

## Testing

-   To run unit tests:
    ```bash
    npm test
    ```

## Database

The project uses Prisma to manage the database schema and queries.

-   **Schema**: The database schema is defined in `prisma/schema.prisma`.
-   **Migrations**:
    -   To create a new migration after schema changes: `npx prisma migrate dev --name <migration-name>`
    -   To apply migrations to the database: `npm run migrate`
-   **Prisma Client**:
    -   After any change to the `schema.prisma` file, you need to regenerate the Prisma client:
        ```bash
        npm run generate
        ```

## Development Conventions

-   **Coding Style**: The project uses Prettier for code formatting.
-   **API Routes**: Backend API routes are prefixed with `/api`.
-   **Authentication**: User authentication is handled via sessions, with user data being available in `req.user` in authenticated routes.
-   **Security**: Sensitive user information like tax identification is encrypted before being stored in the database. The encryption logic is in `src/utils/encryption.util.ts`.
-   **Real-time Events**: Socket.io is used to push real-time updates to clients (e.g., payment confirmation). The server emits events to specific rooms (named after user emails).
