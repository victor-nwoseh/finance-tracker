import { PrismaClient, Prisma } from '@prisma/client';
import { TransactionFilters, TransactionSortOptions, Transaction, CreateTransactionInput, UpdateTransactionInput } from '../types/transaction';
import { BudgetService } from './budgetService';

const prisma = new PrismaClient();

export class TransactionService {
  static async createTransaction(userId: string, data: CreateTransactionInput): Promise<Transaction> {
    try {
      // Start a transaction to ensure both operations succeed or fail together
      return await prisma.$transaction(async (tx) => {
        // Find matching budget for this transaction
        const matchingBudget = await tx.budget.findFirst({
          where: {
            userId,
            category: data.category,
            periodStart: {
              lte: data.date
            },
            periodEnd: {
              gte: data.date
            }
          }
        });

        // Create the transaction
        const transaction = await tx.transaction.create({
          data: {
            userId,
            amount: data.amount,
            category: data.category,
            description: data.description || '',
            date: data.date,
            ...(matchingBudget && { budgetId: matchingBudget.id })
          },
        });

        // If there's a matching budget, update its spent amount
        if (matchingBudget) {
          await tx.budget.update({
            where: { id: matchingBudget.id },
            data: {
              spent: {
                increment: data.amount
              }
            }
          });
        }

        return transaction;
      });
    } catch (error) {
      console.error('Database error:', error);
      throw new Error('Failed to create transaction');
    }
  }

  static async updateTransaction(
    id: string,
    userId: string,
    data: UpdateTransactionInput
  ): Promise<Transaction> {
    try {
      return await prisma.$transaction(async (tx) => {
        // Get the current transaction with its budget
        const currentTransaction = await tx.transaction.findFirst({
          where: {
            id,
            userId,
          }
        });

        if (!currentTransaction) {
          throw new Error('Transaction not found or unauthorized');
        }

        // If category or date changed, we need to check for a new matching budget
        let newBudgetId: string | null = currentTransaction.budgetId;
        if (data.category || data.date) {
          const newBudget = await tx.budget.findFirst({
            where: {
              userId,
              category: data.category || currentTransaction.category,
              periodStart: {
                lte: data.date || currentTransaction.date
              },
              periodEnd: {
                gte: data.date || currentTransaction.date
              }
            }
          });
          newBudgetId = newBudget?.id || null;
        }

        // If amount is changing or budget association is changing, update budget spent amounts
        if (data.amount || currentTransaction.budgetId !== newBudgetId) {
          // If there was a previous budget, subtract the old amount
          if (currentTransaction.budgetId) {
            await tx.budget.update({
              where: { id: currentTransaction.budgetId },
              data: {
                spent: {
                  decrement: currentTransaction.amount
                }
              }
            });
          }

          // If there's a new budget (same or different), add the new amount
          if (newBudgetId) {
            await tx.budget.update({
              where: { id: newBudgetId },
              data: {
                spent: {
                  increment: data.amount || currentTransaction.amount
                }
              }
            });
          }
        }

        // Update the transaction
        const updatedTransaction = await tx.transaction.update({
          where: { id },
          data: {
            ...data,
            budgetId: newBudgetId
          },
        });

        return updatedTransaction;
      });
    } catch (error) {
      console.error('Database error:', error);
      if (error instanceof Error && error.message === 'Transaction not found or unauthorized') {
        throw error;
      }
      throw new Error('Failed to update transaction');
    }
  }

  static async deleteTransaction(id: string, userId: string): Promise<void> {
    try {
      await prisma.$transaction(async (tx) => {
        // Get the transaction to be deleted
        const transaction = await tx.transaction.findFirst({
          where: {
            id,
            userId,
          }
        });

        if (!transaction) {
          throw new Error('Transaction not found or unauthorized');
        }

        // If transaction was associated with a budget, update the spent amount
        if (transaction.budgetId) {
          await tx.budget.update({
            where: { id: transaction.budgetId },
            data: {
              spent: {
                decrement: transaction.amount
              }
            }
          });
        }

        // Delete the transaction
        await tx.transaction.delete({
          where: { id },
        });
      });
    } catch (error) {
      console.error('Database error:', error);
      if (error instanceof Error && error.message === 'Transaction not found or unauthorized') {
        throw error;
      }
      throw new Error('Failed to delete transaction');
    }
  }

  static async getAllTransactions(
    userId: string,
    page: number = 1,
    limit: number = 10,
    filters?: Partial<TransactionFilters>,
    sort?: TransactionSortOptions
  ) {
    try {
      const where = {
        userId,
        ...(filters?.category && { category: filters.category }),
        ...(filters?.startDate || filters?.endDate) && {
          date: {
            ...(filters.startDate && { gte: filters.startDate }),
            ...(filters.endDate && { lte: filters.endDate })
          }
        }
      };

      // Get total count
      const total = await prisma.transaction.count({ where });

      // Get transactions
      const transactions = await prisma.transaction.findMany({
        where,
        orderBy: sort ? { [sort.field]: sort.order.toLowerCase() } : { date: 'desc' },
        take: limit,
        skip: (page - 1) * limit,
      });

      return {
        transactions,
        total,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      console.error('Database error:', error);
      throw new Error('Failed to fetch transactions');
    }
  }
} 
