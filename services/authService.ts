
import { User } from '../types';

// Simulate network delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const USERS_KEY = 'signlens_users';
const SESSION_KEY = 'signlens_session';

interface StoredUser extends User {
  password: string; // In a real app, this would be hashed
}

// Safe localStorage wrapper
const storage = {
  getItem: (key: string) => {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.warn("localStorage access failed", e);
      return null;
    }
  },
  setItem: (key: string, value: string) => {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn("localStorage write failed", e);
    }
  },
  removeItem: (key: string) => {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn("localStorage remove failed", e);
    }
  }
};

export const login = async (email: string, password: string): Promise<User> => {
  await delay(800); // Fake network latency
  
  const usersRaw = storage.getItem(USERS_KEY);
  const users: StoredUser[] = usersRaw ? JSON.parse(usersRaw) : [];
  
  const user = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
  
  if (!user) {
    throw new Error('Invalid email or password');
  }
  
  const sessionUser: User = { id: user.id, name: user.name, email: user.email };
  storage.setItem(SESSION_KEY, JSON.stringify(sessionUser));
  return sessionUser;
};

export const register = async (name: string, email: string, password: string): Promise<User> => {
  await delay(800);
  
  const usersRaw = storage.getItem(USERS_KEY);
  const users: StoredUser[] = usersRaw ? JSON.parse(usersRaw) : [];
  
  if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
    throw new Error('Email already registered');
  }
  
  const newUser: StoredUser = {
    id: Date.now().toString(),
    name,
    email,
    password 
  };
  
  users.push(newUser);
  storage.setItem(USERS_KEY, JSON.stringify(users));
  
  const sessionUser: User = { id: newUser.id, name: newUser.name, email: newUser.email };
  storage.setItem(SESSION_KEY, JSON.stringify(sessionUser));
  return sessionUser;
};

export const logout = async () => {
  await delay(300);
  storage.removeItem(SESSION_KEY);
};

export const getCurrentUser = (): User | null => {
  const session = storage.getItem(SESSION_KEY);
  return session ? JSON.parse(session) : null;
};
