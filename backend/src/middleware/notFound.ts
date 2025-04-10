import { Request, Response } from 'express';
import { createError } from '../utils/errors';

export const notFound = (req: Request, res: Response) => {
  throw createError.notFound(`Route ${req.originalUrl} not found`);
}; 