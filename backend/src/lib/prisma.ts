// Database client singleton
// Why singleton? Prevents creating multiple database connections
// which would exhaust connection limits

import { PrismaClient } from '@prisma/client';

// Create single instance
const prisma = new PrismaClient();

export default prisma;
