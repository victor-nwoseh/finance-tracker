export interface Pot {
  id: string;
  userId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PotFilters {
  userId: string;
  search?: string;
  minProgress?: number; // percentage of target amount reached
  maxProgress?: number;
}

export interface PotSortOptions {
  field: keyof Pot;
  order: 'asc' | 'desc';
}

export interface PotTransaction {
  amount: number;
  type: 'deposit' | 'withdraw';
  timestamp: Date;
} 