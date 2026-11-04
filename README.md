# aegis-patron-backend
Aegis Patron# aegis-patron-backend

Aegis Patron Backend API & Escrow Worker built with Node.js, Fastify, Knex.js, PostgreSQL 16, and Redis 7 (ioredis & BullMQ) for the Aegis Patron bill-settlement app.

## Setup Instructions

1. Start infrastructure services:
docker compose up -d

2. Install dependencies:
npm install

3. Run database migrations:
npx knex migrate:latest

4. Start development server:
npm run dev Backend API &amp; Escrow Worker (Node.js, Fastify, Knex, PostgreSQL, Redis)
