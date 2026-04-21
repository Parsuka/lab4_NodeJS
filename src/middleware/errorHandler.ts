import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Error as MongooseError } from 'mongoose';
import { MongoServerError } from 'mongodb';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Zod validation error
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Помилка валідації запиту',
      details: err.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      })),
    });
    return;
  }

  // Mongoose validation error
  if (err instanceof MongooseError.ValidationError) {
    res.status(400).json({
      error: 'Помилка валідації даних',
      details: Object.values(err.errors).map((e) => ({
        field: e.path,
        message: e.message,
      })),
    });
    return;
  }

  // Mongoose CastError (невалідний ObjectId формат -> 400)
  if (err instanceof MongooseError.CastError) {
    res.status(400).json({
      error: 'Невалідний формат ID',
      message: `Значення "${err.value}" не є коректним ObjectId`,
    });
    return;
  }

  // MongoDB duplicate key error (409)
  if (err instanceof MongoServerError && err.code === 11000) {
    res.status(409).json({
      error: 'Конфлікт: запис з такими даними вже існує',
    });
    return;
  }

  console.error(err);
  res.status(500).json({
    error: 'Внутрішня помилка сервера',
    message: err.message,
  });
}
