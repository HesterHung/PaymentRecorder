import AsyncStorage from '@react-native-async-storage/async-storage';

const USER_STORAGE_KEY = 'users';
const CURRENT_USER_KEY = 'currentUser';

class UserStorageService {
  private currentUser: string = '';
  private subscribers: (() => void)[] = [];

  async getUsers(): Promise<[string, string]> {
    try {
      const savedUsers = await AsyncStorage.getItem(USER_STORAGE_KEY);
      if (savedUsers) {
        const parsedUsers = JSON.parse(savedUsers);
        if (Array.isArray(parsedUsers) && parsedUsers.length >= 2) {
          return [parsedUsers[0], parsedUsers[1]];
        }
      }
      // Default users if none found
      return ['User 1', 'User 2'];
    } catch (error) {
      console.error('Error loading users:', error);
      return ['User 1', 'User 2'];
    }
  }

  async setUsers(users: [string, string]): Promise<void> {
    try {
      await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(users));
      this.notifySubscribers();
    } catch (error) {
      console.error('Error saving users:', error);
    }
  }

  getCurrentUser(): string {
    return this.currentUser;
  }

  async setCurrentUser(user: string): Promise<void> {
    try {
      await AsyncStorage.setItem(CURRENT_USER_KEY, user);
      this.currentUser = user;
      this.notifySubscribers();
    } catch (error) {
      console.error('Error saving current user:', error);
    }
  }

  async initialize(): Promise<void> {
    try {
      const savedCurrentUser = await AsyncStorage.getItem(CURRENT_USER_KEY);
      if (savedCurrentUser) {
        this.currentUser = savedCurrentUser;
      } else {
        const [defaultUser] = await this.getUsers();
        await this.setCurrentUser(defaultUser);
      }
    } catch (error) {
      console.error('Error initializing user storage:', error);
    }
  }

  subscribe(callback: () => void): () => void {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter(sub => sub !== callback);
    };
  }

  private notifySubscribers(): void {
    this.subscribers.forEach(callback => callback());
  }
}

export default new UserStorageService();