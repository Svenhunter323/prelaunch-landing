import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { logger } from '../lib/logger';

export function validate<T>(schema: z.ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const result = schema.safeParse(req.body);
      if (!result.success) {
        const errors = result.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        
        res.status(400).json({
          error: 'Validation failed',
          details: errors,
        });
        return;
      }
      
      req.body = result.data;
      next();
    } catch (error) {
      logger.error('Validation middleware error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}

export function validateQuery<T>(schema: z.ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const result = schema.safeParse(req.query);
      if (!result.success) {
        const errors = result.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        
        res.status(400).json({
          error: 'Query validation failed',
          details: errors,
        });
        return;
      }
      
      req.query = result.data as never;
      next();
    } catch (error) {
      logger.error('Query validation middleware error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}