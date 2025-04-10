import { PrismaClient, Prisma } from '@prisma/client';
import { RecurringBill, RecurringBillFilters, RecurringBillSortOptions, RecurringBillStatus } from '../types/recurring-bill';

const prisma = new PrismaClient();

export class RecurringBillService {
  static async createRecurringBill(
    userId: string,
    data: {
      name: string;
      amount: number;
      dueDate: Date;
      status: RecurringBillStatus;
      category: string;
    }
  ) {
    try {
      const recurringBill = await prisma.recurringBill.create({
        data: {
          userId,
          name: data.name,
          amount: data.amount,
          dueDate: data.dueDate,
          status: data.status,
          category: data.category,
        },
      });
      
      return recurringBill;
    } catch (error) {
      console.error('Database error:', error);
      throw new Error('Failed to create recurring bill');
    }
  }

  static async updateRecurringBill(
    id: string,
    userId: string,
    data: {
      name?: string;
      amount?: number;
      dueDate?: Date;
      status?: RecurringBillStatus;
      category?: string;
    }
  ) {
    try {
      // First check if the recurring bill exists and belongs to the user
      const existingBill = await prisma.recurringBill.findFirst({
        where: {
          id,
          userId
        }
      });

      if (!existingBill) {
        throw new Error('Recurring bill not found or unauthorized');
      }

      const recurringBill = await prisma.recurringBill.update({
        where: { id },
        data
      });

      return recurringBill;
    } catch (error) {
      console.error('Database error:', error);
      if (error instanceof Error && error.message === 'Recurring bill not found or unauthorized') {
        throw error;
      }
      throw new Error('Failed to update recurring bill');
    }
  }

  static async deleteRecurringBill(id: string, userId: string) {
    try {
      // First check if the recurring bill exists and belongs to the user
      const existingBill = await prisma.recurringBill.findFirst({
        where: {
          id,
          userId
        }
      });

      if (!existingBill) {
        throw new Error('Recurring bill not found or unauthorized');
      }

      await prisma.recurringBill.delete({
        where: { id }
      });

      return true;
    } catch (error) {
      console.error('Database error:', error);
      if (error instanceof Error && error.message === 'Recurring bill not found or unauthorized') {
        throw error;
      }
      throw new Error('Failed to delete recurring bill');
    }
  }

  static async getAllRecurringBills(
    userId: string,
    filters?: Partial<RecurringBillFilters>,
    sort?: RecurringBillSortOptions
  ) {
    try {
      const where: Prisma.RecurringBillWhereInput = {
        userId,
        ...(filters?.status && { status: filters.status }),
        ...(filters?.category && { category: filters.category }),
        ...(filters?.search && {
          OR: [
            { name: { contains: filters.search, mode: 'insensitive' as Prisma.QueryMode } },
            { category: { contains: filters.search, mode: 'insensitive' as Prisma.QueryMode } }
          ]
        })
      };

      // Get total count
      const total = await prisma.recurringBill.count({ where });

      // Get recurring bills
      const recurringBills = await prisma.recurringBill.findMany({
        where,
        orderBy: sort ? { [sort.field]: sort.order.toLowerCase() } : { dueDate: 'asc' }
      });

      return {
        recurringBills,
        total
      };
    } catch (error) {
      console.error('Database error:', error);
      throw new Error('Failed to fetch recurring bills');
    }
  }
} 