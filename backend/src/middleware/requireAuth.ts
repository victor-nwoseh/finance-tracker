import { Request, Response, NextFunction } from 'express';
import { authenticateJWT } from './passport';
import { AuthenticationError } from './errorHandler';

export const requireAuth = [
  authenticateJWT,
  (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new AuthenticationError('Authentication required');
    }
    next();
  }
]; 