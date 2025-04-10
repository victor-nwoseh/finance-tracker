import { Request, Response, NextFunction, RequestHandler } from 'express';

export const checkJwtSecret: RequestHandler = (req, res, next) => {
  if (!process.env.JWT_SECRET) {
    console.error('JWT_SECRET is not set in environment variables');
    res.status(500).json({
      message: 'Internal server error: JWT configuration is missing'
    });
    return;
  }
  next();
}; 