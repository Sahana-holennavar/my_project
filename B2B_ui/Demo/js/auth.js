// B2B Marketplace - Authentication Module

// Authentication functions
const Auth = {
  // Initialize authentication
  init: () => {
    Auth.bindEvents();
    Auth.loadInitialData();
  },

  // Bind authentication events
  bindEvents: () => {
    // Login form
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
      loginForm.addEventListener('submit', Auth.handleLogin);
    }

    // Register form
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
      registerForm.addEventListener('submit', Auth.handleRegister);
    }

    // Password confirmation validation
    const confirmPassword = document.getElementById('confirmPassword');
    if (confirmPassword) {
      confirmPassword.addEventListener('input', Auth.validatePasswordConfirmation);
    }
  },

  // Load initial data
  loadInitialData: () => {
    // Create default users if none exist
    const users = DataManager.get(STORAGE_KEYS.USERS);
    if (!users || users.length === 0) {
      Auth.createDefaultUsers();
    }
  },

  // Create default users for demo
  createDefaultUsers: () => {
    const defaultUsers = [
      {
        id: 'user-1',
        email: 'buyer@demo.com',
        password: 'password123',
        role: 'buyer',
        companyName: 'Demo Buyer Corp',
        contactInfo: {
          name: 'John Buyer',
          phone: '+1-555-0123',
          address: '123 Business St, City, State 12345'
        },
        createdAt: new Date().toISOString()
      },
      {
        id: 'user-2',
        email: 'seller@demo.com',
        password: 'password123',
        role: 'seller',
        companyName: 'Demo Seller Inc',
        contactInfo: {
          name: 'Jane Seller',
          phone: '+1-555-0456',
          address: '456 Commerce Ave, City, State 12345'
        },
        createdAt: new Date().toISOString()
      }
    ];

    DataManager.set(STORAGE_KEYS.USERS, defaultUsers);
  },

  // Handle login
  handleLogin: async (e) => {
    e.preventDefault();
    
    const form = e.target;
    const formData = FormManager.getFormData(form);
    
    // Enhanced validation
    const validationErrors = Auth.validateLoginForm(formData);
    if (validationErrors.length > 0) {
      Utils.showNotification(validationErrors[0], 'error');
      return;
    }
    
    // Show loading state
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Logging in...';
    submitBtn.disabled = true;
    
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const user = Auth.authenticateUser(formData.email, formData.password);
      
      if (user) {
        // Set current user
        AuthManager.setCurrentUser(user);
        
        // Show success message
        Utils.showNotification(`Welcome back, ${user.companyName}!`, 'success');
        
        // Redirect based on user role with proper routing
        setTimeout(() => {
          if (user.role === 'buyer') {
            window.location.href = 'marketplace.html';
          } else if (user.role === 'seller') {
            window.location.href = 'dashboard.html';
          } else {
            window.location.href = 'dashboard.html';
          }
        }, 1000);
      } else {
        Utils.showNotification('Invalid email or password. Please check your credentials.', 'error');
      }
    } catch (error) {
      console.error('Login error:', error);
      Utils.showNotification('Login failed. Please try again.', 'error');
    } finally {
      // Reset button state
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    }
  },

  // Handle registration
  handleRegister: async (e) => {
    e.preventDefault();
    
    const form = e.target;
    const formData = FormManager.getFormData(form);
    
    // Enhanced validation
    const validationErrors = Auth.validateRegistrationForm(formData);
    if (validationErrors.length > 0) {
      Utils.showNotification(validationErrors[0], 'error');
      return;
    }
    
    // Show loading state
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Creating account...';
    submitBtn.disabled = true;
    
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const user = Auth.registerUser(formData);
      
      if (user) {
        // Set current user
        AuthManager.setCurrentUser(user);
        
        // Show success message
        Utils.showNotification(`Welcome to B2B Marketplace, ${user.companyName}!`, 'success');
        
        // Redirect based on user role
        setTimeout(() => {
          if (user.role === 'buyer') {
            window.location.href = 'marketplace.html';
          } else if (user.role === 'seller') {
            window.location.href = 'dashboard.html';
          } else {
            window.location.href = 'dashboard.html';
          }
        }, 1000);
      }
    } catch (error) {
      console.error('Registration error:', error);
      if (error.message === 'User already exists') {
        Utils.showNotification('An account with this email already exists', 'error');
      } else {
        Utils.showNotification('Registration failed. Please try again.', 'error');
      }
    } finally {
      // Reset button state
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    }
  },

  // Authenticate user
  authenticateUser: (email, password) => {
    const users = DataManager.get(STORAGE_KEYS.USERS) || [];
    const user = users.find(u => u.email === email && u.password === password);
    
    if (user) {
      // Remove password from returned user object
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    }
    
    return null;
  },

  // Register new user
  registerUser: (userData) => {
    const users = DataManager.get(STORAGE_KEYS.USERS) || [];
    
    // Check if user already exists
    const existingUser = users.find(u => u.email === userData.email);
    if (existingUser) {
      throw new Error('User already exists');
    }
    
    // Create new user
    const newUser = {
      id: Utils.generateId(),
      email: userData.email,
      password: userData.password, // In real app, this would be hashed
      role: userData.role,
      companyName: userData.companyName,
      contactInfo: {
        name: userData.contactName || '',
        phone: userData.phone || '',
        address: userData.address || '',
        city: userData.city || ''
      },
      businessInfo: {
        licenseNumber: '',
        taxId: '',
        establishedYear: new Date().getFullYear(),
        employeeCount: '',
        categories: []
      },
      settings: {
        notifications: {
          newOrders: true,
          rfqs: true,
          messages: true
        },
        visibility: 'public',
        newsletter: userData.newsletter === 'on'
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Add to users array
    users.push(newUser);
    DataManager.set(STORAGE_KEYS.USERS, users);
    
    // Return user without password
    const { password, ...userWithoutPassword } = newUser;
    return userWithoutPassword;
  },

  // Validate password confirmation
  validatePasswordConfirmation: (e) => {
    const confirmPassword = e.target;
    const password = document.getElementById('password');
    
    if (password && confirmPassword.value !== password.value) {
      FormManager.showFieldError(confirmPassword, 'Passwords do not match');
    } else {
      FormManager.clearFieldError(confirmPassword);
    }
  },

  // Update user profile
  updateUserProfile: (userId, updates) => {
    const users = DataManager.get(STORAGE_KEYS.USERS) || [];
    const userIndex = users.findIndex(u => u.id === userId);
    
    if (userIndex !== -1) {
      users[userIndex] = { ...users[userIndex], ...updates };
      DataManager.set(STORAGE_KEYS.USERS, users);
      
      // Update current user if it's the same user
      const currentUser = AuthManager.getCurrentUser();
      if (currentUser && currentUser.id === userId) {
        AuthManager.setCurrentUser({ ...currentUser, ...updates });
      }
      
      return true;
    }
    
    return false;
  },

  // Change password
  changePassword: (userId, currentPassword, newPassword) => {
    const users = DataManager.get(STORAGE_KEYS.USERS) || [];
    const user = users.find(u => u.id === userId);
    
    if (user && user.password === currentPassword) {
      user.password = newPassword; // In real app, this would be hashed
      DataManager.set(STORAGE_KEYS.USERS, users);
      return true;
    }
    
    return false;
  },

  // Get user by ID
  getUserById: (userId) => {
    const users = DataManager.get(STORAGE_KEYS.USERS) || [];
    const user = users.find(u => u.id === userId);
    
    if (user) {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    }
    
    return null;
  },

  // Update user data
  updateUser: (updatedUser) => {
    const users = DataManager.get(STORAGE_KEYS.USERS) || [];
    const userIndex = users.findIndex(u => u.id === updatedUser.id);
    
    if (userIndex !== -1) {
      users[userIndex] = { ...users[userIndex], ...updatedUser };
      DataManager.set(STORAGE_KEYS.USERS, users);
      
      // Update current user in localStorage
      const currentUser = AuthManager.getCurrentUser();
      if (currentUser && currentUser.id === updatedUser.id) {
        AuthManager.setCurrentUser(updatedUser);
      }
      
      return true;
    }
    
    return false;
  },

  // Delete user
  deleteUser: (userId) => {
    const users = DataManager.get(STORAGE_KEYS.USERS) || [];
    const filteredUsers = users.filter(u => u.id !== userId);
    
    if (filteredUsers.length < users.length) {
      DataManager.set(STORAGE_KEYS.USERS, filteredUsers);
      
      // Clear current user if it's the deleted user
      const currentUser = AuthManager.getCurrentUser();
      if (currentUser && currentUser.id === userId) {
        AuthManager.logout();
      }
      
      return true;
    }
    
    return false;
  },

  // Get all users (for admin purposes)
  getAllUsers: () => {
    const users = DataManager.get(STORAGE_KEYS.USERS) || [];
    return users.map(user => {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });
  },

  // Search users
  searchUsers: (query) => {
    const users = Auth.getAllUsers();
    const lowercaseQuery = query.toLowerCase();
    
    return users.filter(user => 
      user.companyName.toLowerCase().includes(lowercaseQuery) ||
      user.email.toLowerCase().includes(lowercaseQuery) ||
      (user.contactInfo.name && user.contactInfo.name.toLowerCase().includes(lowercaseQuery))
    );
  },

  // Enhanced validation functions
  validateEmail: (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  validatePassword: (password) => {
    return password && password.length >= 6;
  },

  validateCompanyName: (companyName) => {
    return companyName && companyName.trim().length >= 2;
  },

  validatePhone: (phone) => {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    return !phone || phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
  },

  // Enhanced form validation
  validateRegistrationForm: (formData) => {
    const errors = [];

    if (!Auth.validateEmail(formData.email)) {
      errors.push('Please enter a valid email address');
    }

    if (!Auth.validatePassword(formData.password)) {
      errors.push('Password must be at least 6 characters long');
    }

    if (formData.password !== formData.confirmPassword) {
      errors.push('Passwords do not match');
    }

    if (!Auth.validateCompanyName(formData.companyName)) {
      errors.push('Company name must be at least 2 characters long');
    }

    if (!formData.contactName || formData.contactName.trim().length < 2) {
      errors.push('Contact person name must be at least 2 characters long');
    }

    if (!formData.phone || !Auth.validatePhone(formData.phone)) {
      errors.push('Please enter a valid phone number');
    }

    if (!formData.role) {
      errors.push('Please select your account type');
    }

    if (!formData.terms) {
      errors.push('You must agree to the Terms of Service');
    }

    return errors;
  },

  // Validate login form
  validateLoginForm: (formData) => {
    const errors = [];

    if (!Auth.validateEmail(formData.email)) {
      errors.push('Please enter a valid email address');
    }

    if (!formData.password || formData.password.length < 1) {
      errors.push('Password is required');
    }

    return errors;
  }
};

// Initialize authentication when DOM is loaded
// Quick login function for demo
function quickLogin(email, password) {
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  
  if (emailInput && passwordInput) {
    emailInput.value = email;
    passwordInput.value = password;
    
    // Trigger form submission
    const form = document.getElementById('login-form');
    if (form) {
      form.dispatchEvent(new Event('submit'));
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  Auth.init();
});

// Export for use in other modules
window.Auth = Auth;
