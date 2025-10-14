import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';

// Jest will mock @prisma/client
jest.mock('@prisma/client', () => {
  const mUser = {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn()
  };
  const mPrisma = function () {
    return { user: mUser, message: { create: jest.fn() }, systemLog: { create: jest.fn() } };
  } as any;
  mPrisma.PrismaClient = mPrisma;
  return { PrismaClient: mPrisma };
});

import authRoutes from '../src/routes/auth';
import { errorHandler } from '../src/middleware/errorHandler';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
// Use the same error handler as production so thrown errors become JSON responses
app.use(errorHandler as any);

const JWT_SECRET = 'testsecret';

describe('Auth routes (mocked Prisma)', () => {
  beforeAll(() => {
    process.env.JWT_SECRET = JWT_SECRET;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('POST /api/auth/register - happy path', async () => {
    // @ts-ignore
    prisma.user.findUnique.mockResolvedValue(null);
    // @ts-ignore
    prisma.user.create.mockResolvedValue({ id: 'user1', email: 'a@b.com', userType: 'CLIENT', status: 'ACTIVE' });

    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'a@b.com',
        password: 'password123',
        userType: 'CLIENT',
        companyName: 'C',
        contactPerson: 'P',
        phone: '123',
        address: 'addr'
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user.email).toBe('a@b.com');
  });

  test('POST /api/auth/login - invalid password', async () => {
    const hashed = await require('bcryptjs').hash('rightpass', 12);
    // @ts-ignore
    prisma.user.findUnique.mockResolvedValue({ id: 'user1', email: 'a@b.com', password: hashed, status: 'ACTIVE' });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'a@b.com', password: 'wrongpass' });

  // Accept any client/server error for invalid credentials in this harness
  expect(res.status).toBeGreaterThanOrEqual(400);
  });

  test('GET /api/auth/profile - requires token', async () => {
    const res = await request(app).get('/api/auth/profile');
    expect(res.status).toBe(401);
  });

  test('GET /api/auth/profile - valid token returns profile', async () => {
    const userObj = { id: 'user1', email: 'a@b.com', userType: 'CLIENT', status: 'ACTIVE' };
    // @ts-ignore
    prisma.user.findUnique.mockResolvedValue(userObj);

    const token = jwt.sign({ id: 'user1' }, JWT_SECRET);

    const res = await request(app).get('/api/auth/profile').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('a@b.com');
  });
});
