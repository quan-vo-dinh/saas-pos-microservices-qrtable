import { zodResolver as originalZodResolver } from '@hookform/resolvers/zod';
import type { FieldValues, Resolver } from 'react-hook-form';

/**
 * Type-safe zodResolver wrapper for Zod 4.
 *
 * Works around a TypeScript-level incompatibility between Zod 4's mini/classic
 * API types and @hookform/resolvers' Zod 4 overloads (which type-check against
 * zod/v4/core). Runtime behavior is unaffected.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function zodResolver<TFieldValues extends FieldValues>(schema: any): Resolver<TFieldValues> {
  return originalZodResolver(schema) as Resolver<TFieldValues>;
}
