export type RecurringBillStatus = 'pending' | 'paid' | 'overdue';

export interface RecurringBill {
  id: string;
  userId: string;
  name: string;
  amount: number;
  dueDate: Date;
  status: RecurringBillStatus;
  category: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RecurringBillFilters {
  userId: string;
  search?: string;
  status?: RecurringBillStatus;
  category?: string;
}

export interface RecurringBillSortOptions {
  field: keyof RecurringBill;
  order: 'asc' | 'desc';
} 