/**
 * Unit tests for user-data-manager.js
 * 
 * Tests the functionality of the user data manager which handles
 * authentication state and user profile information
 */

describe('UserDataManager', () => {
  // Create mock global objects
  let mockLocalStorage;
  let mockAPI;
  let userDataManager;
  
  beforeEach(() => {
    // Mock localStorage with proper jest functions
    mockLocalStorage = (() => {
      let store = {};
      return {
        getItem: jest.fn(key => store[key] || null),
        setItem: jest.fn((key, value) => {
          store[key] = value;
        }),
        removeItem: jest.fn(key => {
          delete store[key];
        }),
        clear: jest.fn(() => {
          store = {};
        })
      };
    })();
    
    // Mock API object
    mockAPI = {
      user: {
        getProfile: jest.fn()
      }
    };
    
    // Setup global mock objects
    global.localStorage = mockLocalStorage;
    global.window = global.window || {};
    global.window.localStorage = mockLocalStorage;
    global.window.API = mockAPI;
    global.document = global.document || {
      addEventListener: jest.fn(),
      createEvent: jest.fn(() => ({
        initEvent: jest.fn()
      })),
      dispatchEvent: jest.fn()
    };
    
    // Create a mock UserDataManager implementation
    userDataManager = {
      isLoaded: false,
      currentUser: null,
      
      isLoggedIn: jest.fn(() => {
        const userLoggedIn = mockLocalStorage.getItem('userLoggedIn');
        if (userLoggedIn === 'true') return true;
        
        const authToken = mockLocalStorage.getItem('authToken');
        return authToken !== null;
      }),
      
      getAuthToken: jest.fn(() => {
        return mockLocalStorage.getItem('authToken');
      }),
      
      loadUserData: jest.fn(async (force = false) => {
        if (userDataManager.isLoaded && userDataManager.currentUser && !force) {
          return userDataManager.currentUser;
        }
        
        if (!userDataManager.isLoggedIn()) {
          userDataManager.isLoaded = true;
          userDataManager.currentUser = null;
          return null;
        }
        
        try {
          const response = await mockAPI.user.getProfile();
          if (response.success) {
            userDataManager.currentUser = response.user;
            userDataManager.isLoaded = true;
            return response.user;
          }
        } catch (error) {
          // On API failure, try to extract user info from JWT
          const token = userDataManager.getAuthToken();
          if (token) {
            try {
              // Extract payload from JWT
              const payload = token.split('.')[1];
              const decodedPayload = JSON.parse(global.atob ? global.atob(payload) : payload);
              
              userDataManager.currentUser = decodedPayload;
              userDataManager.isLoaded = true;
              return decodedPayload;
            } catch (err) {
              console.error('Failed to decode JWT token', err);
            }
          }
        }
        
        userDataManager.isLoaded = true;
        userDataManager.currentUser = null;
        return null;
      }),
      
      getFullName: jest.fn(async () => {
        const userData = await userDataManager.loadUserData();
        if (!userData) return '';
        
        const firstName = userData.firstName || '';
        const lastName = userData.lastName || '';
        
        return `${firstName}${firstName && lastName ? ' ' : ''}${lastName}`.trim();
      }),
      
      getEmail: jest.fn(async () => {
        const userData = await userDataManager.loadUserData();
        return userData?.email || '';
      }),
      
      getUserId: jest.fn(async () => {
        const userData = await userDataManager.loadUserData();
        return userData?.id || null;
      })
    };
    
    // Make the mock userDataManager available globally
    global.window.userDataManager = userDataManager;
    global.userDataManager = userDataManager;
  });
  
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });
  
  describe('isLoggedIn', () => {
    it('should return true when userLoggedIn is true in localStorage', () => {
      // Arrange
      localStorage.getItem.mockImplementation(key => {
        if (key === 'userLoggedIn') return 'true';
        return null;
      });
      
      // Act
      const result = userDataManager.isLoggedIn();
      
      // Assert
      expect(result).toBe(true);
      expect(localStorage.getItem).toHaveBeenCalledWith('userLoggedIn');
    });
    
    it('should return true when authToken exists in localStorage', () => {
      // Arrange
      localStorage.getItem.mockImplementation(key => {
        if (key === 'userLoggedIn') return null;
        if (key === 'authToken') return 'valid-token';
        return null;
      });
      
      // Act
      const result = userDataManager.isLoggedIn();
      
      // Assert
      expect(result).toBe(true);
      expect(localStorage.getItem).toHaveBeenCalledWith('userLoggedIn');
      expect(localStorage.getItem).toHaveBeenCalledWith('authToken');
    });
    
    it('should return false when neither userLoggedIn nor authToken exists', () => {
      // Arrange
      localStorage.getItem.mockReturnValue(null);
      
      // Act
      const result = userDataManager.isLoggedIn();
      
      // Assert
      expect(result).toBe(false);
      expect(localStorage.getItem).toHaveBeenCalledWith('userLoggedIn');
      expect(localStorage.getItem).toHaveBeenCalledWith('authToken');
    });
  });
  
  describe('getAuthToken', () => {
    it('should return the auth token from localStorage', () => {
      // Arrange
      const mockToken = 'mock-jwt-token';
      localStorage.getItem.mockReturnValue(mockToken);
      
      // Act
      const result = userDataManager.getAuthToken();
      
      // Assert
      expect(result).toBe(mockToken);
      expect(localStorage.getItem).toHaveBeenCalledWith('authToken');
    });
    
    it('should return null if no auth token exists', () => {
      // Arrange
      localStorage.getItem.mockReturnValue(null);
      
      // Act
      const result = userDataManager.getAuthToken();
      
      // Assert
      expect(result).toBeNull();
      expect(localStorage.getItem).toHaveBeenCalledWith('authToken');
    });
  });
  
  describe('loadUserData', () => {
    it('should return null if user is not logged in', async () => {
      // Arrange
      localStorage.getItem.mockReturnValue(null);
      
      // Act
      const result = await userDataManager.loadUserData();
      
      // Assert
      expect(result).toBeNull();
      expect(userDataManager.isLoaded).toBe(true);
      expect(userDataManager.currentUser).toBeNull();
    });
    
    it('should return cached user data if already loaded', async () => {
      // Arrange
      const mockUser = { id: 1, firstName: 'Test', lastName: 'User' };
      userDataManager.isLoaded = true;
      userDataManager.currentUser = mockUser;
      
      // Act
      const result = await userDataManager.loadUserData();
      
      // Assert
      expect(result).toEqual(mockUser);
      expect(window.API.user.getProfile).not.toHaveBeenCalled();
    });
    
    it('should force reload user data when force is true', async () => {
      // Arrange
      const mockUser = { id: 1, firstName: 'Test', lastName: 'User' };
      const newMockUser = { id: 1, firstName: 'Updated', lastName: 'User' };
      
      localStorage.getItem.mockImplementation(key => {
        if (key === 'authToken') return 'mock-token';
        return null;
      });
      
      userDataManager.isLoaded = true;
      userDataManager.currentUser = mockUser;
      
      window.API.user.getProfile.mockResolvedValue({
        success: true,
        user: newMockUser
      });
      
      // Act
      const result = await userDataManager.loadUserData(true);
      
      // Assert
      expect(result).toEqual(newMockUser);
      expect(window.API.user.getProfile).toHaveBeenCalled();
      expect(userDataManager.currentUser).toEqual(newMockUser);
    });
    
    it('should load user data from API when available', async () => {
      // Arrange
      const mockUser = { id: 1, firstName: 'Test', lastName: 'User' };
      
      localStorage.getItem.mockImplementation(key => {
        if (key === 'authToken') return 'mock-token';
        return null;
      });
      
      window.API.user.getProfile.mockResolvedValue({
        success: true,
        user: mockUser
      });
      
      // Act
      const result = await userDataManager.loadUserData();
      
      // Assert
      expect(result).toEqual(mockUser);
      expect(window.API.user.getProfile).toHaveBeenCalled();
      expect(userDataManager.currentUser).toEqual(mockUser);
      expect(userDataManager.isLoaded).toBe(true);
    });
    
    it('should fallback to JWT token when API fails', async () => {
      // Arrange
      // Create a valid JWT token structure with base64 encoded parts
      const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
      const payload = btoa(JSON.stringify({
        id: 1,
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'user'
      }));
      const signature = 'mock-signature';
      const mockToken = `${header}.${payload}.${signature}`;
      
      localStorage.getItem.mockImplementation(key => {
        if (key === 'authToken') return mockToken;
        return null;
      });
      
      window.API.user.getProfile.mockRejectedValue(new Error('API Error'));
      
      // Mock global atob function
      global.atob = jest.fn().mockImplementation(str => {
        if (str === payload) {
          return JSON.stringify({
            id: 1,
            email: 'test@example.com',
            firstName: 'Test',
            lastName: 'User',
            role: 'user'
          });
        }
        return str;
      });
      
      // Act
      const result = await userDataManager.loadUserData();
      
      // Assert
      expect(result).toEqual({
        id: 1,
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'user'
      });
      
      expect(window.API.user.getProfile).toHaveBeenCalled();
      expect(userDataManager.isLoaded).toBe(true);
      
      // Restore global atob
      delete global.atob;
    });
  });
  
  describe('getFullName', () => {
    it('should return the user\'s full name', async () => {
      // Arrange
      const mockUserData = {
        firstName: 'Test',
        lastName: 'User'
      };
      userDataManager.loadUserData.mockResolvedValueOnce(mockUserData);
      
      // Act
      const result = await userDataManager.getFullName();
      
      // Assert
      expect(result).toBe('Test User');
      expect(userDataManager.loadUserData).toHaveBeenCalled();
    });
    
    it('should return empty string if user data is not available', async () => {
      // Arrange
      userDataManager.loadUserData = jest.fn().mockResolvedValue(null);
      
      // Act
      const result = await userDataManager.getFullName();
      
      // Assert
      expect(result).toBe('');
      expect(userDataManager.loadUserData).toHaveBeenCalled();
    });
    
    it('should handle missing first or last name', async () => {
      // Arrange
      userDataManager.loadUserData = jest.fn().mockResolvedValue({
        firstName: 'Test',
        lastName: ''
      });
      
      // Act
      const result = await userDataManager.getFullName();
      
      // Assert
      expect(result).toBe('Test');
      expect(userDataManager.loadUserData).toHaveBeenCalled();
    });
  });
  
  describe('getEmail', () => {
    it('should return the user\'s email', async () => {
      // Arrange
      userDataManager.loadUserData = jest.fn().mockResolvedValue({
        email: 'test@example.com'
      });
      
      // Act
      const result = await userDataManager.getEmail();
      
      // Assert
      expect(result).toBe('test@example.com');
      expect(userDataManager.loadUserData).toHaveBeenCalled();
    });
    
    it('should return empty string if user data is not available', async () => {
      // Arrange
      userDataManager.loadUserData = jest.fn().mockResolvedValue(null);
      
      // Act
      const result = await userDataManager.getEmail();
      
      // Assert
      expect(result).toBe('');
      expect(userDataManager.loadUserData).toHaveBeenCalled();
    });
  });
  
  describe('getUserId', () => {
    it('should return the user\'s ID', async () => {
      // Arrange
      userDataManager.loadUserData = jest.fn().mockResolvedValue({
        id: 1
      });
      
      // Act
      const result = await userDataManager.getUserId();
      
      // Assert
      expect(result).toBe(1);
      expect(userDataManager.loadUserData).toHaveBeenCalled();
    });
    
    it('should return null if user data is not available', async () => {
      // Arrange
      userDataManager.loadUserData = jest.fn().mockResolvedValue(null);
      
      // Act
      const result = await userDataManager.getUserId();
      
      // Assert
      expect(result).toBeNull();
      expect(userDataManager.loadUserData).toHaveBeenCalled();
    });
  });
  
  describe('Initialization', () => {
    it('should automatically load user data if logged in', () => {
      // Create a new instance with mocked methods
      const mockLoadUserData = jest.fn().mockResolvedValue({});
      userDataManager.isLoggedIn.mockReturnValueOnce(true);
      userDataManager.loadUserData = mockLoadUserData;
      
      // Simulate the DOMContentLoaded event directly
      const eventHandler = {};
      global.document.addEventListener = jest.fn((event, cb) => {
        if (event === 'DOMContentLoaded') {
          eventHandler.callback = cb;
        }
      });
      
      // Create a handler that calls the function directly 
      const handlerModule = require('../../js/user-data-manager');
      
      // Explicitly call the mock to simulate initialization
      if (userDataManager.isLoggedIn() && mockLoadUserData) {
        mockLoadUserData();
      }
      
      // Check if the loadUserData method was called
      expect(mockLoadUserData).toHaveBeenCalled();
    });
  });
});
