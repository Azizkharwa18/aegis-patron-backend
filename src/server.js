import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import Redis from 'ioredis';
import { Queue } from 'bullmq';
import knex from 'knex';

const fastify = Fastify({ logger: true });

await fastify.register(cors, { origin: '*' });
await fastify.register(websocket);

const db = knex({
  client: 'pg',
  connection: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/aegis_patron'
});

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const vendorQueue = new Queue('vendor-forwarding-queue', { connection: redis });

const PLATFORM_ESCROW_ACCOUNT = '#8840-2910-4491';

fastify.get('/api/v1/bills/deck', async (request, reply) => {
  return { bills: [] };
});

fastify.post('/api/v1/bills', async (request, reply) => {
  return { status: 'created', bill: request.body };
});

fastify.post('/api/v1/bills/:id/swipe-down', async (request, reply) => {
  const { id } = request.params;
  return { status: 'passed', billId: id };
});

fastify.get('/api/v1/bills/stubs', async (request, reply) => {
  return { stubs: [] };
});

fastify.post('/api/v1/settlements/swipe-up-lock', async (request, reply) => {
  const { billId } = request.body || {};
  const lockKey = `lock:bill:${billId}`;
  const acquired = await redis.set(lockKey, 'locked', 'NX', 'EX', 300);
  if (!acquired) {
    return reply.status(409).send({ error: 'Bill already locked by another patron' });
  }
  return { status: 'locked', lockKey, expiresIn: 300 };
});

fastify.post('/api/v1/settlements/checkout-transfer', async (request, reply) => {
  const { billId, patronId, amount, vendorBankDetails } = request.body || {};
  
  const [deposit] = await db('escrow_deposits').insert({
    bill_id: billId,
    patron_id: patronId,
    amount,
    escrow_account: PLATFORM_ESCROW_ACCOUNT,
    status: 'COMPLETED',
    created_at: new Date()
  }).returning('*');

  await vendorQueue.add('forward-payment', {
    depositId: deposit ? deposit.id : 1,
    billId,
    patronId,
    amount,
    vendorBankDetails,
    escrowAccount: PLATFORM_ESCROW_ACCOUNT
  });

  return {
    status: 'success',
    escrowAccount: PLATFORM_ESCROW_ACCOUNT,
    deposit
  };
});

const start = async () => {
  try {
    await fastify.listen({ port: process.env.PORT || 3000, host: '0.0.0.0' });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
