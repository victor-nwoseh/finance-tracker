export interface Budget {
  id: string;
  userId: string;
  category: string;
  amount: number;
  spent: number;
  periodStart: Date;
  periodEnd: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateBudgetInput {
  category: string;
  amount: number;
  periodStart: Date;
  periodEnd: Date;
}

export interface UpdateBudgetInput {
  category?: string;
  amount?: number;
  spent?: number;
  periodStart?: Date;
  periodEnd?: Date;
}

export interface BudgetFilters {
  userId: string;
  category?: string;
  periodStart?: Date;
  periodEnd?: Date;
}

export interface BudgetSortOptions {
  field: keyof Budget;
  order: 'asc' | 'desc';
} 