export interface Transaction {
  id: string;
  userId: string;
  amount: number;
  category: string;
  description: string;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
  budgetId: string | null;
}

export interface CreateTransactionInput {
  amount: number;
  category: string;
  description?: string;
  date: Date;
}

export interface UpdateTransactionInput {
  amount?: number;
  category?: string;
  description?: string;
  date?: Date;
  budgetId?: string | null;
}

export interface TransactionFilters {
  userId: string;
  category?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface TransactionSortOptions {
  field: keyof Transaction;
  order: 'asc' | 'desc';
} 