import jwt from 'jsonwebtoken';
import { config } from '../config';

export interface JWTPayload {
  sub: string;
  role: 'user' | 'admin';
  iat?: number;
  exp?: number;
}

export function signToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: '30d',
  });
}

export function verifyToken(token: string): JWTPayload {
  return jwt.verify(token, config.jwtSecret) as JWTPayload;
}

export function generateTelegramToken(userId: string): string {
  return jwt.sign({ sub: userId }, config.jwtSecret, {
    expiresIn: '10m',
  });
}

export function verifyTelegramToken(token: string): { sub: string } {
  return jwt.verify(token, config.jwtSecret) as { sub: string };
}