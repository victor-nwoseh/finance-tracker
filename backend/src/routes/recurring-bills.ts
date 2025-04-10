import { Router } from 'express';
import { body, query, param } from 'express-validator';
import { requireAuth } from '../middleware/requireAuth';
import { validateRequest } from '../middleware/validateRequest';
import { Request, Response } from 'express';
import { RecurringBillService } from '../services/recurringBillService';
import { RecurringBill, RecurringBillSortOptions, RecurringBillStatus } from '../types/recurring-bill';

const router = Router();

// Apply authentication middleware to all recurring bills routes
router.use(requireAuth);

// GET /api/recurring-bills - Get all recurring bills with search/sorting
router.get('/',
  [
    query(['search', 'sortBy', 'sortOrder', 'status', 'category']).optional(),
    validateRequest
  ],
  async (req: Request, res: Response) => {
    try {
      const userId = (req.user as { id: string }).id;
      const search = req.query.search as string;
      const sortBy = req.query.sortBy as keyof RecurringBill;
      const sortOrder = req.query.sortOrder as 'asc' | 'desc';
      const status = req.query.status as RecurringBillStatus;
      const category = req.query.category as string;

      const filters = {
        userId,
        ...(search && { search }),
        ...(status && { status }),
        ...(category && { category })
      };

      const sort: RecurringBillSortOptions | undefined = 
        sortBy ? { field: sortBy, order: sortOrder || 'asc' } : undefined;

      const result = await RecurringBillService.getAllRecurringBills(
        userId,
        filters,
        sort
      );

      res.json(result);
    } catch (error) {
      console.error('Error fetching recurring bills:', error);
      res.status(500).json({ message: 'Failed to fetch recurring bills' });
    }
  }
);

// POST /api/recurring-bills - Create a new recurring bill
router.post('/',
  [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Name is required')
      .isLength({ max: 100 })
      .withMessage('Name must be at most 100 characters'),
    body('amount')
      .isNumeric()
      .withMessage('Amount must be a number')
      .custom((value) => {
        if (value <= 0) {
          throw new Error('Amount must be greater than 0');
        }
        return true;
      }),
    body('dueDate')
      .isISO8601()
      .withMessage('Invalid due date format'),
    body('status')
      .isIn(['pending', 'paid', 'overdue'])
      .withMessage('Invalid status'),
    body('category')
      .trim()
      .notEmpty()
      .withMessage('Category is required')
      .isLength({ max: 100 })
      .withMessage('Category must be at most 100 characters'),
    validateRequest
  ],
  async (req: Request, res: Response) => {
    try {
      const userId = (req.user as { id: string }).id;
      const { name, amount, dueDate, status, category } = req.body;

      const recurringBill = await RecurringBillService.createRecurringBill(userId, {
        name,
        amount: parseFloat(amount),
        dueDate: new Date(dueDate),
        status,
        category
      });

      res.status(201).json(recurringBill);
    } catch (error) {
      console.error('Error creating recurring bill:', error);
      res.status(500).json({ message: 'Failed to create recurring bill' });
    }
  }
);

// PUT /api/recurring-bills/:id - Update a recurring bill
router.put('/:id',
  [
    param('id').notEmpty().withMessage('Recurring bill ID is required'),
    body('name')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('Name cannot be empty')
      .isLength({ max: 100 })
      .withMessage('Name must be at most 100 characters'),
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
    body('dueDate')
      .optional()
      .isISO8601()
      .withMessage('Invalid due date format'),
    body('status')
      .optional()
      .isIn(['pending', 'paid', 'overdue'])
      .withMessage('Invalid status'),
    body('category')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('Category cannot be empty')
      .isLength({ max: 100 })
      .withMessage('Category must be at most 100 characters'),
    validateRequest
  ],
  async (req: Request, res: Response) => {
    try {
      const userId = (req.user as { id: string }).id;
      const billId = req.params.id;
      const updateData = req.body;

      // Convert amount to number if provided
      if (updateData.amount) {
        updateData.amount = parseFloat(updateData.amount);
      }

      // Convert dueDate to Date object if provided
      if (updateData.dueDate) {
        updateData.dueDate = new Date(updateData.dueDate);
      }

      const recurringBill = await RecurringBillService.updateRecurringBill(
        billId,
        userId,
        updateData
      );

      res.json(recurringBill);
    } catch (error) {
      console.error('Error updating recurring bill:', error);
      if (error instanceof Error && error.message === 'Recurring bill not found or unauthorized') {
        res.status(404).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'Failed to update recurring bill' });
      }
    }
  }
);

// DELETE /api/recurring-bills/:id - Delete a recurring bill
router.delete('/:id',
  [
    param('id').notEmpty().withMessage('Recurring bill ID is required'),
    validateRequest
  ],
  async (req: Request, res: Response) => {
    try {
      const userId = (req.user as { id: string }).id;
      const billId = req.params.id;

      await RecurringBillService.deleteRecurringBill(billId, userId);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting recurring bill:', error);
      if (error instanceof Error && error.message === 'Recurring bill not found or unauthorized') {
        res.status(404).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'Failed to delete recurring bill' });
      }
    }
  }
);

export default router; 