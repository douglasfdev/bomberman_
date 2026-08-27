import { Request, Response, NextFunction } from 'express';

export function requireAuth(req: any, res: any, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Não autenticado' });
  }
  next();
}