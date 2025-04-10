import { Budget, Pot, RecurringBill, Transaction, User as PrismaUser } from '@prisma/client';

declare global {
  namespace Express {
    interface User extends PrismaUser {
      transactions: Transaction[];
      budgets: Budget[];
      pots: Pot[];
      recurringBills: RecurringBill[];
    }
  }
} 