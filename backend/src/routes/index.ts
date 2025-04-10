import { Router } from 'express';
import authRoutes from './auth';
import transactionRoutes from './transactions';
import budgetRoutes from './budgets';
import potRoutes from './pots';
import recurringBillRoutes from './recurring-bills';

const router = Router();

/**
 * @swagger
 * /:
 *   get:
 *     tags:
 *       - Health
 *     summary: API health check
 *     responses:
 *       200:
 *         description: API is running
 */
router.get('/', (req, res) => {
  res.json({ message: 'Finance Tracker API is running' });
});

// Authentication routes
router.use('/api/auth', authRoutes);

// Transaction routes
router.use('/api/transactions', transactionRoutes);

// Budget routes
router.use('/api/budgets', budgetRoutes);

// Savings pot routes
router.use('/api/pots', potRoutes);

// Recurring bill routes
router.use('/api/recurring-bills', recurringBillRoutes);

export default router;