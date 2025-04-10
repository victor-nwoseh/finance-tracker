import { PrismaClient, Prisma } from '@prisma/client';
import { Pot, PotFilters, PotSortOptions } from '../types/pot';

const prisma = new PrismaClient();

export class PotService {
  static async createPot(
    userId: string,
    data: {
      name: string;
      targetAmount: number;
      currentAmount: number;
    }
  ) {
    try {
      const pot = await prisma.pot.create({
        data: {
          userId,
          name: data.name,
          targetAmount: data.targetAmount,
          currentAmount: data.currentAmount,
        },
      });
      
      return pot;
    } catch (error) {
      console.error('Database error:', error);
      throw new Error('Failed to create pot');
    }
  }

  static async updatePot(
    id: string,
    userId: string,
    data: {
      name?: string;
      targetAmount?: number;
      currentAmount?: number;
    }
  ) {
    try {
      // First check if the pot exists and belongs to the user
      const existingPot = await prisma.pot.findFirst({
        where: {
          id,
          userId
        }
      });

      if (!existingPot) {
        throw new Error('Pot not found or unauthorized');
      }

      const pot = await prisma.pot.update({
        where: { id },
        data
      });

      return pot;
    } catch (error) {
      console.error('Database error:', error);
      if (error instanceof Error && error.message === 'Pot not found or unauthorized') {
        throw error;
      }
      throw new Error('Failed to update pot');
    }
  }

  static async deletePot(id: string, userId: string) {
    try {
      // First check if the pot exists and belongs to the user
      const existingPot = await prisma.pot.findFirst({
        where: {
          id,
          userId
        }
      });

      if (!existingPot) {
        throw new Error('Pot not found or unauthorized');
      }

      await prisma.pot.delete({
        where: { id }
      });

      return true;
    } catch (error) {
      console.error('Database error:', error);
      if (error instanceof Error && error.message === 'Pot not found or unauthorized') {
        throw error;
      }
      throw new Error('Failed to delete pot');
    }
  }

  static async getAllPots(
    userId: string,
    filters?: Partial<PotFilters>,
    sort?: PotSortOptions
  ) {
    try {
      const where: Prisma.PotWhereInput = {
        userId,
        ...(filters?.search && {
          name: { contains: filters.search, mode: 'insensitive' as Prisma.QueryMode }
        })
      };

      // Get pots first to filter by progress
      const allPots = await prisma.pot.findMany({
        where: {
          userId,
          ...(filters?.search && {
            name: { contains: filters.search, mode: 'insensitive' as Prisma.QueryMode }
          })
        }
      });

      // Filter by progress if needed
      let filteredPots = allPots;
      if (filters?.minProgress || filters?.maxProgress) {
        filteredPots = allPots.filter(pot => {
          const progress = (pot.currentAmount / pot.targetAmount) * 100;
          const meetsMinProgress = !filters.minProgress || progress >= filters.minProgress;
          const meetsMaxProgress = !filters.maxProgress || progress <= filters.maxProgress;
          return meetsMinProgress && meetsMaxProgress;
        });
      }

      // Apply sorting
      if (sort) {
        filteredPots.sort((a, b) => {
          const aValue = a[sort.field];
          const bValue = b[sort.field];
          const modifier = sort.order === 'asc' ? 1 : -1;
          return aValue > bValue ? modifier : -modifier;
        });
      } else {
        // Default sort by createdAt desc
        filteredPots.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      }

      return {
        pots: filteredPots,
        total: filteredPots.length
      };
    } catch (error) {
      console.error('Database error:', error);
      throw new Error('Failed to fetch pots');
    }
  }

  static async deposit(id: string, userId: string, amount: number) {
    try {
      // Use a transaction to ensure both operations succeed or fail together
      return await prisma.$transaction(async (tx) => {
        // First check if the pot exists and belongs to the user
        const pot = await tx.pot.findFirst({
          where: {
            id,
            userId
          }
        });

        if (!pot) {
          throw new Error('Pot not found or unauthorized');
        }

        // Update pot with new amount
        const updatedPot = await tx.pot.update({
          where: { id },
          data: {
            currentAmount: {
              increment: amount
            }
          }
        });

        // Create transaction record
        await tx.potTransaction.create({
          data: {
            potId: id,
            amount,
            type: 'deposit'
          }
        });

        return updatedPot;
      });
    } catch (error) {
      console.error('Database error:', error);
      if (error instanceof Error && error.message === 'Pot not found or unauthorized') {
        throw error;
      }
      throw new Error('Failed to deposit to pot');
    }
  }

  static async withdraw(id: string, userId: string, amount: number) {
    try {
      // Use a transaction to ensure both operations succeed or fail together
      return await prisma.$transaction(async (tx) => {
        // First check if the pot exists and belongs to the user
        const pot = await tx.pot.findFirst({
          where: {
            id,
            userId
          }
        });

        if (!pot) {
          throw new Error('Pot not found or unauthorized');
        }

        if (pot.currentAmount < amount) {
          throw new Error('Insufficient funds in pot');
        }

        // Update pot with new amount
        const updatedPot = await tx.pot.update({
          where: { id },
          data: {
            currentAmount: {
              decrement: amount
            }
          }
        });

        // Create transaction record
        await tx.potTransaction.create({
          data: {
            potId: id,
            amount,
            type: 'withdraw'
          }
        });

        return updatedPot;
      });
    } catch (error) {
      console.error('Database error:', error);
      if (error instanceof Error) {
        if (error.message === 'Pot not found or unauthorized' || 
            error.message === 'Insufficient funds in pot') {
          throw error;
        }
      }
      throw new Error('Failed to withdraw from pot');
    }
  }

  static async getPotTransactions(
    potId: string,
    userId: string,
    page: number = 1,
    limit: number = 10
  ) {
    try {
      // First check if the pot exists and belongs to the user
      const pot = await prisma.pot.findFirst({
        where: {
          id: potId,
          userId
        }
      });

      if (!pot) {
        throw new Error('Pot not found or unauthorized');
      }

      const skip = (page - 1) * limit;

      // Get total count
      const total = await prisma.potTransaction.count({
        where: { potId }
      });

      // Get transactions
      const transactions = await prisma.potTransaction.findMany({
        where: { potId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      });

      return {
        transactions,
        total,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      console.error('Database error:', error);
      if (error instanceof Error && error.message === 'Pot not found or unauthorized') {
        throw error;
      }
      throw new Error('Failed to fetch pot transactions');
    }
  }
} 