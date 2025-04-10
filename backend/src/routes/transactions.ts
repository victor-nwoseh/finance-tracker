import { Router } from 'express';
import { body, query, param } from 'express-validator';
import { requireAuth } from '../middleware/requireAuth';
import { validateRequest } from '../middleware/validateRequest';
import { Request, Response } from 'express';
import { TransactionService } from '../services/transactionService';
import { Transaction, TransactionSortOptions } from '../types/transaction';

const router = Router();

// Apply authentication middleware to all transaction routes
router.use(requireAuth);

// GET /api/transactions - Get all transactions with pagination/filtering/sorting
router.get('/',
  [
    query(['page', 'limit', 'sortBy', 'sortOrder', 'category', 'startDate', 'endDate']).optional(),
    validateRequest
  ],
  async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const category = req.query.category as string;
      const sortBy = req.query.sortBy as keyof Transaction;
      const sortOrder = req.query.sortOrder as 'asc' | 'desc';
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

      // Get user ID from auth middleware
      const userId = (req.user as { id: string }).id;

      const filters = {
        userId,
        ...(category && { category }),
        ...(startDate && { startDate }),
        ...(endDate && { endDate })
      };

      const sort: TransactionSortOptions | undefined = sortBy ? { field: sortBy, order: sortOrder || 'desc' } : undefined;

      const result = await TransactionService.getAllTransactions(
        userId,
        page,
        limit,
        filters,
        sort
      );

      res.json(result);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      res.status(500).json({ message: 'Failed to fetch transactions' });
    }
  }
);

// POST /api/transactions - Create a new transaction
router.post('/',
  [
    body('amount')
      .isNumeric()
      .withMessage('Amount must be a number')
      .custom((value) => {
        if (value <= 0) {
          throw new Error('Amount must be greater than 0');
        }
        return true;
      }),
    body('category')
      .trim()
      .notEmpty()
      .withMessage('Category is required')
      .isLength({ max: 100 })
      .withMessage('Category must be at most 100 characters'),
    body('description')
      .optional()
      .trim()
      .isString()
      .isLength({ max: 500 })
      .withMessage('Description must be at most 500 characters'),
    body('date')
      .isISO8601()
      .withMessage('Invalid date format')
      .custom((value) => {
        const date = new Date(value);
        if (date > new Date()) {
          throw new Error('Transaction date cannot be in the future');
        }
        return true;
      }),
    validateRequest
  ],
  async (req: Request, res: Response) => {
    try {
      const userId = (req.user as { id: string }).id;
      const { amount, category, description, date } = req.body;

      const transaction = await TransactionService.createTransaction(userId, {
        amount: parseFloat(amount),
        category,
        description,
        date: new Date(date)
      });

      res.status(201).json(transaction);
    } catch (error) {
      console.error('Error creating transaction:', error);
      res.status(500).json({ message: 'Failed to create transaction' });
    }
  }
);

// PUT /api/transactions/:id - Update a transaction
router.put('/:id',
  [
    param('id').notEmpty().withMessage('Transaction ID is required'),
    body('amount')
      .optional()
      .isNumeric()
      .withMessage('Amount must be a number')
      .custom((value) => {
        if (value && value <= 0) {
          throw new Error('Amount must be greater than 0');
        }
        return true;
      }),
    body('category')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('Category cannot be empty')
      .isLength({ max: 100 })
      .withMessage('Category must be at most 100 characters'),
    body('description')
      .optional()
      .trim()
      .isString()
      .isLength({ max: 500 })
      .withMessage('Description must be at most 500 characters'),
    body('date')
      .optional()
      .isISO8601()
      .withMessage('Invalid date format')
      .custom((value) => {
        if (value) {
          const date = new Date(value);
          if (date > new Date()) {
            throw new Error('Transaction date cannot be in the future');
          }
        }
        return true;
      }),
    validateRequest
  ],
  async (req: Request, res: Response) => {
    try {
      const userId = (req.user as { id: string }).id;
      const transactionId = req.params.id;
      const updateData = req.body;

      // Convert amount to number if provided
      if (updateData.amount) {
        updateData.amount = parseFloat(updateData.amount);
      }

      // Convert date to Date object if provided
      if (updateData.date) {
        updateData.date = new Date(updateData.date);
      }

      const transaction = await TransactionService.updateTransaction(
        transactionId,
        userId,
        updateData
      );

      res.json(transaction);
    } catch (error) {
      console.error('Error updating transaction:', error);
      if (error instanceof Error && error.message === 'Transaction not found or unauthorized') {
        res.status(404).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'Failed to update transaction' });
      }
    }
  }
);

// DELETE /api/transactions/:id - Delete a transaction
router.delete('/:id',
  [
    param('id').notEmpty().withMessage('Transaction ID is required'),
    validateRequest
  ],
  async (req: Request, res: Response) => {
    try {
      const userId = (req.user as { id: string }).id;
      const transactionId = req.params.id;

      await TransactionService.deleteTransaction(transactionId, userId);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting transaction:', error);
      if (error instanceof Error && error.message === 'Transaction not found or unauthorized') {
        res.status(404).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'Failed to delete transaction' });
      }
    }
  }
);

export default router; 