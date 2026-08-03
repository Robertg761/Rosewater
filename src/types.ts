export interface Entry {
  id: number;
  date: string; // YYYY-MM-DD
  types: string[];
  rating: number | null;
  note: string;
  createdAt: string;
}

export interface EntryWithDetails extends Entry {
  productIds: number[];
  productNames: string[];
  photoUris: string[];
}

export interface Product {
  id: number;
  name: string;
  category: string;
  rating: number | null;
  notes: string;
  archived: number;
}

export interface Vitamin {
  id: number;
  name: string;
  active: number;
  sort: number;
}

export interface Photo {
  id: number;
  date: string;
  uri: string;
  note: string;
  entryId: number | null;
}

export type RootStackParamList = {
  Tabs: undefined;
  LogEntry: { entryId?: number; date?: string } | undefined;
  Photos: undefined;
};

export type TabParamList = {
  Home: undefined;
  Calendar: undefined;
  Shelf: undefined;
  Vitamins: undefined;
  Settings: undefined;
};
