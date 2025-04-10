import { PrismaClient } from '@prisma/client';
import { Budget, CreateBudgetInput, UpdateBudgetInput, BudgetFilters, BudgetSortOptions } from '../types/budget';

const prisma = new PrismaClient();

export class BudgetService {
  static async getAllBudgets(
    userId: string,
    filters?: BudgetFilters,
    sort?: BudgetSortOptions
  ) {
    try {
      const where = {
        userId,
        ...(filters?.category && {
          category: {
            contains: filters.category,
            mode: 'insensitive' as const,
          },
        }),
        ...(filters?.periodStart && {
          periodStart: {
            gte: filters.periodStart,
          },
        }),
        ...(filters?.periodEnd && {
          periodEnd: {
            lte: filters.periodEnd,
          },
        }),
      };

      const orderBy = sort
        ? {
            [sort.field]: sort.order,
          }
        : undefined;

      const budgets = await prisma.budget.findMany({
        where,
        orderBy
      });

      return budgets;
    } catch (error) {
      console.error('Database error:', error);
      throw new Error('Failed to fetch budgets');
    }
  }

  static async createBudget(userId: string, data: CreateBudgetInput): Promise<Budget> {
    try {
      const budget = await prisma.budget.create({
        data: {
          userId,
          category: data.category,
          amount: data.amount,
          periodStart: data.periodStart,
          periodEnd: data.periodEnd,
        },
      });

      return budget;
    } catch (error) {
      console.error('Database error:', error);
      throw new Error('Failed to create budget');
    }
  }

  static async updateBudget(
    id: string,
    userId: string,
    data: UpdateBudgetInput
  ): Promise<Budget> {
    try {
      const budget = await prisma.budget.findFirst({
        where: {
          id,
          userId,
        },
      });

      if (!budget) {
        throw new Error('Budget not found or unauthorized');
      }

      const updatedBudget = await prisma.budget.update({
        where: { id },
        data: {
          ...data,
        },
      });

      return updatedBudget;
    } catch (error) {
      console.error('Database error:', error);
      if (error instanceof Error && error.message === 'Budget not found or unauthorized') {
        throw error;
      }
      throw new Error('Failed to update budget');
    }
  }

  static async deleteBudget(id: string, userId: string): Promise<void> {
    try {
      const budget = await prisma.budget.findFirst({
        where: {
          id,
          userId,
        },
      });

      if (!budget) {
        throw new Error('Budget not found or unauthorized');
      }

      await prisma.budget.delete({
        where: { id },
      });
    } catch (error) {
      console.error('Database error:', error);
      if (error instanceof Error && error.message === 'Budget not found or unauthorized') {
        throw error;
      }
      throw new Error('Failed to delete budget');
    }
  }

  static async getBudgetTransactions(
    id: string,
    userId: string,
    page: number = 1,
    limit: number = 10
  ) {
    try {
      // First verify the budget exists and belongs to the user
      const budget = await prisma.budget.findFirst({
        where: {
          id,
          userId,
        },
      });

      if (!budget) {
        throw new Error('Budget not found or unauthorized');
      }

      const skip = (page - 1) * limit;

      // Get transactions separately
      const total = await prisma.transaction.count({
        where: {
          userId,
          category: budget.category,
          date: {
            gte: budget.periodStart,
            lte: budget.periodEnd
          }
        }
      });

      const transactions = await prisma.transaction.findMany({
        where: {
          userId,
          category: budget.category,
          date: {
            gte: budget.periodStart,
            lte: budget.periodEnd
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: limit,
        select: {
          id: true,
          amount: true,
          category: true,
          description: true,
          date: true,
          createdAt: true
        }
      });

      return {
        transactions,
        total,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      console.error('Database error:', error);
      if (error instanceof Error && error.message === 'Budget not found or unauthorized') {
        throw error;
      }
      throw new Error('Failed to fetch budget transactions');
    }
  }

  static async updateBudgetSpent(id: string, amount: number): Promise<void> {
    try {
      await prisma.budget.update({
        where: { id },
        data: {
          spent: {
            increment: amount,
          },
        },
      });
    } catch (error) {
      console.error('Database error:', error);
      throw new Error('Failed to update budget spent amount');
    }
  }
} 