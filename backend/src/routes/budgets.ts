import { Router } from 'express';
import { body, query, param } from 'express-validator';
import { requireAuth } from '../middleware/requireAuth';
import { validateRequest } from '../middleware/validateRequest';
import { Request, Response } from 'express';
import { BudgetService } from '../services/budgetService';
import { Budget } from '../types/budget';

const router = Router();

// Apply authentication middleware to all budget routes
router.use(requireAuth);

// GET /api/budgets - Get all budgets
router.get('/',
  [
    query(['category', 'sortBy', 'sortOrder']).optional(),
    query(['periodStart', 'periodEnd'])
      .optional()
      .isISO8601()
      .withMessage('Invalid date format'),
    validateRequest
  ],
  async (req: Request, res: Response) => {
    try {
      const userId = (req.user as { id: string }).id;
      const category = req.query.category as string;
      const sortBy = req.query.sortBy as keyof Budget;
      const sortOrder = req.query.sortOrder as 'asc' | 'desc';
      const periodStart = req.query.periodStart ? new Date(req.query.periodStart as string) : undefined;
      const periodEnd = req.query.periodEnd ? new Date(req.query.periodEnd as string) : undefined;

      const filters = {
        userId,
        ...(category && { category }),
        ...(periodStart && { periodStart }),
        ...(periodEnd && { periodEnd })
      };

      const sort = sortBy ? { field: sortBy, order: sortOrder || 'asc' } : undefined;

      const budgets = await BudgetService.getAllBudgets(userId, filters, sort);
      res.json(budgets);
    } catch (error) {
      console.error('Error fetching budgets:', error);
      res.status(500).json({ message: 'Failed to fetch budgets' });
    }
  }
);

// POST /api/budgets - Create a new budget
router.post('/',
  [
    body('category')
      .trim()
      .notEmpty()
      .withMessage('Category is required')
      .isLength({ max: 100 })
      .withMessage('Category must be at most 100 characters'),
    body('amount')
      .isNumeric()
      .withMessage('Amount must be a number')
      .custom((value) => {
        if (value <= 0) {
          throw new Error('Amount must be greater than 0');
        }
        return true;
      }),
    body('period_start')
      .isISO8601()
      .withMessage('Invalid start date format'),
    body('period_end')
      .isISO8601()
      .withMessage('Invalid end date format')
      .custom((value, { req }) => {
        const startDate = new Date(req.body.period_start);
        const endDate = new Date(value);
        if (endDate <= startDate) {
          throw new Error('End date must be after start date');
        }
        return true;
      }),
    validateRequest
  ],
  async (req: Request, res: Response) => {
    try {
      const userId = (req.user as { id: string }).id;
      const budget = await BudgetService.createBudget(userId, {
        category: req.body.category,
        amount: parseFloat(req.body.amount),
        periodStart: new Date(req.body.period_start),
        periodEnd: new Date(req.body.period_end)
      });

      res.status(201).json(budget);
    } catch (error) {
      console.error('Error creating budget:', error);
      res.status(500).json({ message: 'Failed to create budget' });
    }
  }
);

// PUT /api/budgets/:id - Update a budget
router.put('/:id',
  [
    param('id').notEmpty().withMessage('Budget ID is required'),
    body('category')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('Category cannot be empty')
      .isLength({ max: 100 })
      .withMessage('Category must be at most 100 characters'),
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
    body('period_start')
      .optional()
      .isISO8601()
      .withMessage('Invalid start date format'),
    body('period_end')
      .optional()
      .isISO8601()
      .withMessage('Invalid end date format')
      .custom((value, { req }) => {
        if (value && req.body.period_start) {
          const startDate = new Date(req.body.period_start);
          const endDate = new Date(value);
          if (endDate <= startDate) {
            throw new Error('End date must be after start date');
          }
        }
        return true;
      }),
    validateRequest
  ],
  async (req: Request, res: Response) => {
    try {
      const userId = (req.user as { id: string }).id;
      const budgetId = req.params.id;
      const updateData = {
        ...(req.body.category && { category: req.body.category }),
        ...(req.body.amount && { amount: parseFloat(req.body.amount) }),
        ...(req.body.spent && { spent: parseFloat(req.body.spent) }),
        ...(req.body.period_start && { periodStart: new Date(req.body.period_start) }),
        ...(req.body.period_end && { periodEnd: new Date(req.body.period_end) })
      };

      const budget = await BudgetService.updateBudget(budgetId, userId, updateData);
      res.json(budget);
    } catch (error) {
      console.error('Error updating budget:', error);
      if (error instanceof Error && error.message === 'Budget not found or unauthorized') {
        res.status(404).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'Failed to update budget' });
      }
    }
  }
);

// DELETE /api/budgets/:id - Delete a budget
router.delete('/:id',
  [
    param('id').notEmpty().withMessage('Budget ID is required'),
    validateRequest
  ],
  async (req: Request, res: Response) => {
    try {
      const userId = (req.user as { id: string }).id;
      const budgetId = req.params.id;

      await BudgetService.deleteBudget(budgetId, userId);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting budget:', error);
      if (error instanceof Error && error.message === 'Budget not found or unauthorized') {
        res.status(404).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'Failed to delete budget' });
      }
    }
  }
);

// GET /api/budgets/:id/transactions - Get transactions for a specific budget
router.get('/:id/transactions',
  [
    param('id').notEmpty().withMessage('Budget ID is required'),
    query(['page', 'limit']).optional().isInt().toInt(),
    validateRequest
  ],
  async (req: Request, res: Response) => {
    try {
      const userId = (req.user as { id: string }).id;
      const budgetId = req.params.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const result = await BudgetService.getBudgetTransactions(
        budgetId,
        userId,
        page,
        limit
      );

      res.json(result);
    } catch (error) {
      console.error('Error fetching budget transactions:', error);
      if (error instanceof Error && error.message === 'Budget not found or unauthorized') {
        res.status(404).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'Failed to fetch budget transactions' });
      }
    }
  }
);

export default router; 