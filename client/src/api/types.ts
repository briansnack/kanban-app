export type Role = 'owner' | 'editor' | 'viewer';

export const ROLE_LABELS: Record<Role, string> = {
  owner: 'Dono',
  editor: 'Editor',
  viewer: 'Visualizador',
};

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface BoardSummary {
  id: string;
  title: string;
  created_at: string;
  role: Role;
}

export interface Card {
  id: string;
  list_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  position: number;
}

export interface List {
  id: string;
  title: string;
  position: number;
  cards: Card[];
}

export interface BoardDetail {
  id: string;
  title: string;
  owner_id: string;
  created_at: string;
  role: Role;
  lists: List[];
}