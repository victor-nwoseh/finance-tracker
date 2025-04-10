import { Router } from 'express';
import { body, query, param } from 'express-validator';
import { requireAuth } from '../middleware/requireAuth';
import { validateRequest } from '../middleware/validateRequest';
import { Request, Response } from 'express';
import { PotService } from '../services/potService';
import { Pot, PotSortOptions } from '../types/pot';

const router = Router();

// Apply authentication middleware to all pots routes
router.use(requireAuth);

// GET /api/pots - Get all pots
router.get('/',
  [
    query(['search', 'sortBy', 'sortOrder', 'minProgress', 'maxProgress']).optional(),
    validateRequest
  ],
  async (req: Request, res: Response) => {
    try {
      const userId = (req.user as { id: string }).id;
      const search = req.query.search as string;
      const sortBy = req.query.sortBy as keyof Pot;
      const sortOrder = req.query.sortOrder as 'asc' | 'desc';
      const minProgress = req.query.minProgress ? parseFloat(req.query.minProgress as string) : undefined;
      const maxProgress = req.query.maxProgress ? parseFloat(req.query.maxProgress as string) : undefined;

      const filters = {
        userId,
        ...(search && { search }),
        ...(minProgress && { minProgress }),
        ...(maxProgress && { maxProgress })
      };

      const sort: PotSortOptions | undefined = 
        sortBy ? { field: sortBy, order: sortOrder || 'asc' } : undefined;

      const result = await PotService.getAllPots(
        userId,
        filters,
        sort
      );

      res.json(result);
    } catch (error) {
      console.error('Error fetching pots:', error);
      res.status(500).json({ message: 'Failed to fetch pots' });
    }
  }
);

// POST /api/pots - Create a new pot
router.post('/',
  [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Name is required')
      .isLength({ max: 100 })
      .withMessage('Name must be at most 100 characters'),
    body('target_amount')
      .isNumeric()
      .withMessage('Target amount must be a number')
      .custom((value) => {
        if (value <= 0) {
          throw new Error('Target amount must be greater than 0');
        }
        return true;
      }),
    body('current_amount')
      .isNumeric()
      .withMessage('Current amount must be a number')
      .custom((value) => {
        if (value < 0) {
          throw new Error('Current amount cannot be negative');
        }
        return true;
      }),
    validateRequest
  ],
  async (req: Request, res: Response) => {
    try {
      const userId = (req.user as { id: string }).id;
      const { name, target_amount, current_amount } = req.body;

      const pot = await PotService.createPot(userId, {
        name,
        targetAmount: parseFloat(target_amount),
        currentAmount: parseFloat(current_amount)
      });

      res.status(201).json(pot);
    } catch (error) {
      console.error('Error creating pot:', error);
      res.status(500).json({ message: 'Failed to create pot' });
    }
  }
);

// PUT /api/pots/:id - Update a pot
router.put('/:id',
  [
    param('id').notEmpty().withMessage('Pot ID is required'),
    body('name')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('Name cannot be empty')
      .isLength({ max: 100 })
      .withMessage('Name must be at most 100 characters'),
    body('target_amount')
      .optional()
      .isNumeric()
      .withMessage('Target amount must be a number')
      .custom((value) => {
        if (value && value <= 0) {
          throw new Error('Target amount must be greater than 0');
        }
        return true;
      }),
    body('current_amount')
      .optional()
      .isNumeric()
      .withMessage('Current amount must be a number')
      .custom((value) => {
        if (value && value < 0) {
          throw new Error('Current amount cannot be negative');
        }
        return true;
      }),
    validateRequest
  ],
  async (req: Request, res: Response) => {
    try {
      const userId = (req.user as { id: string }).id;
      const potId = req.params.id;
      const updateData = {
        ...(req.body.name && { name: req.body.name }),
        ...(req.body.target_amount && { targetAmount: parseFloat(req.body.target_amount) }),
        ...(req.body.current_amount && { currentAmount: parseFloat(req.body.current_amount) })
      };

      const pot = await PotService.updatePot(
        potId,
        userId,
        updateData
      );

      res.json(pot);
    } catch (error) {
      console.error('Error updating pot:', error);
      if (error instanceof Error && error.message === 'Pot not found or unauthorized') {
        res.status(404).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'Failed to update pot' });
      }
    }
  }
);

// DELETE /api/pots/:id - Delete a pot
router.delete('/:id',
  [
    param('id').notEmpty().withMessage('Pot ID is required'),
    validateRequest
  ],
  async (req: Request, res: Response) => {
    try {
      const userId = (req.user as { id: string }).id;
      const potId = req.params.id;

      await PotService.deletePot(potId, userId);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting pot:', error);
      if (error instanceof Error && error.message === 'Pot not found or unauthorized') {
        res.status(404).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'Failed to delete pot' });
      }
    }
  }
);

// POST /api/pots/:id/deposit - Deposit money into a pot
router.post('/:id/deposit',
  [
    param('id').notEmpty().withMessage('Pot ID is required'),
    body('amount')
      .isNumeric()
      .withMessage('Amount must be a number')
      .custom((value) => {
        if (value <= 0) {
          throw new Error('Amount must be greater than 0');
        }
        return true;
      }),
    validateRequest
  ],
  async (req: Request, res: Response) => {
    try {
      const userId = (req.user as { id: string }).id;
      const potId = req.params.id;
      const amount = parseFloat(req.body.amount);

      const pot = await PotService.deposit(potId, userId, amount);
      res.json(pot);
    } catch (error) {
      console.error('Error depositing to pot:', error);
      if (error instanceof Error && error.message === 'Pot not found or unauthorized') {
        res.status(404).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'Failed to deposit to pot' });
      }
    }
  }
);

// POST /api/pots/:id/withdraw - Withdraw money from a pot
router.post('/:id/withdraw',
  [
    param('id').notEmpty().withMessage('Pot ID is required'),
    body('amount')
      .isNumeric()
      .withMessage('Amount must be a number')
      .custom((value) => {
        if (value <= 0) {
          throw new Error('Amount must be greater than 0');
        }
        return true;
      }),
    validateRequest
  ],
  async (req: Request, res: Response) => {
    try {
      const userId = (req.user as { id: string }).id;
      const potId = req.params.id;
      const amount = parseFloat(req.body.amount);

      const pot = await PotService.withdraw(potId, userId, amount);
      res.json(pot);
    } catch (error) {
      console.error('Error withdrawing from pot:', error);
      if (error instanceof Error) {
        if (error.message === 'Pot not found or unauthorized') {
          res.status(404).json({ message: error.message });
        } else if (error.message === 'Insufficient funds in pot') {
          res.status(400).json({ message: error.message });
        } else {
          res.status(500).json({ message: 'Failed to withdraw from pot' });
        }
      } else {
        res.status(500).json({ message: 'Failed to withdraw from pot' });
      }
    }
  }
);

// GET /api/pots/:id/transactions - Get pot transactions
router.get('/:id/transactions',
  [
    param('id').notEmpty().withMessage('Pot ID is required'),
    query(['page', 'limit']).optional().isInt().toInt(),
    validateRequest
  ],
  async (req: Request, res: Response) => {
    try {
      const userId = (req.user as { id: string }).id;
      const potId = req.params.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const result = await PotService.getPotTransactions(
        potId,
        userId,
        page,
        limit
      );

      res.json(result);
    } catch (error) {
      console.error('Error fetching pot transactions:', error);
      if (error instanceof Error && error.message === 'Pot not found or unauthorized') {
        res.status(404).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'Failed to fetch pot transactions' });
      }
    }
  }
);

export default router; 