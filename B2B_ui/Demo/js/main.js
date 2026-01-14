// B2B Marketplace - Main JavaScript Module

// Storage keys for localStorage
const STORAGE_KEYS = {
  USERS: 'b2b_users',
  PRODUCTS: 'b2b_products',
  ORDERS: 'b2b_orders',
  CURRENT_USER: 'b2b_current_user',
  RFQS: 'b2b_rfqs',
  CHATS: 'b2b_chats',
  TICKETS: 'b2b_tickets',
  POSTS: 'b2b_posts'
};

// Utility functions
const Utils = {
  // Generate unique ID
  generateId: () => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  },

  // Format currency
  formatCurrency: (amount, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  },

  // Format date
  formatDate: (date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(new Date(date));
  },

  // Format date and time
  formatDateTime: (date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  },

  // Show notification
  showNotification: (message, type = 'info') => {
    const notification = document.createElement('div');
    notification.className = `alert alert-${type}`;
    notification.textContent = message;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      notification.remove();
    }, 5000);
  },

  // Show loading state
  showLoading: (element) => {
    if (element) {
      element.innerHTML = `
        <div class="loading">
          <div class="spinner"></div>
          <p>Loading...</p>
        </div>
      `;
    }
  },

  // Hide loading state
  hideLoading: (element) => {
    if (element) {
      element.innerHTML = '';
    }
  },

  // Debounce function
  debounce: (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  // Validate email
  validateEmail: (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  },

  // Validate phone number
  validatePhone: (phone) => {
    const re = /^[\+]?[1-9][\d]{0,15}$/;
    return re.test(phone.replace(/\s/g, ''));
  },

  // Sanitize HTML
  sanitizeHTML: (str) => {
    const temp = document.createElement('div');
    temp.textContent = str;
    return temp.innerHTML;
  },

  // Get URL parameters
  getUrlParams: () => {
    const params = new URLSearchParams(window.location.search);
    return Object.fromEntries(params.entries());
  },

  // Set URL parameter
  setUrlParam: (key, value) => {
    const url = new URL(window.location);
    url.searchParams.set(key, value);
    window.history.pushState({}, '', url);
  },

  // Remove URL parameter
  removeUrlParam: (key) => {
    const url = new URL(window.location);
    url.searchParams.delete(key);
    window.history.pushState({}, '', url);
  }
};

// Data Manager
const DataManager = {
  // Get data from localStorage
  get: (key) => {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error getting data from localStorage:', error);
      return null;
    }
  },

  // Set data to localStorage
  set: (key, data) => {
    try {
      localStorage.setItem(key, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error('Error setting data to localStorage:', error);
      return false;
    }
  },

  // Remove data from localStorage
  remove: (key) => {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error('Error removing data from localStorage:', error);
      return false;
    }
  },

  // Clear all app data
  clearAll: () => {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  }
};

// Authentication Manager
const AuthManager = {
  // Get current user
  getCurrentUser: () => {
    return DataManager.get(STORAGE_KEYS.CURRENT_USER);
  },

  // Set current user
  setCurrentUser: (user) => {
    return DataManager.set(STORAGE_KEYS.CURRENT_USER, user);
  },

  // Check if user is logged in
  isLoggedIn: () => {
    return !!AuthManager.getCurrentUser();
  },

  // Get user role
  getUserRole: () => {
    const user = AuthManager.getCurrentUser();
    return user ? user.role : null;
  },

  // Check if user is buyer
  isBuyer: () => {
    return AuthManager.getUserRole() === 'buyer';
  },

  // Check if user is seller
  isSeller: () => {
    return AuthManager.getUserRole() === 'seller';
  },

  // Logout user
  logout: () => {
    DataManager.remove(STORAGE_KEYS.CURRENT_USER);
    window.location.href = 'index.html';
  },

  // Require authentication
  requireAuth: () => {
    if (!AuthManager.isLoggedIn()) {
      window.location.href = 'index.html';
      return false;
    }
    return true;
  },

  // Require specific role
  requireRole: (role) => {
    if (!AuthManager.requireAuth()) return false;
    
    const userRole = AuthManager.getUserRole();
    if (userRole !== role) {
      Utils.showNotification('Access denied. Insufficient permissions.', 'error');
      window.location.href = 'dashboard.html';
      return false;
    }
    return true;
  }
};

// Navigation Manager
const NavigationManager = {
  // Initialize navigation
  init: () => {
    // Add active class to current page
    const currentPage = window.location.pathname.split('/').pop();
    const navLinks = document.querySelectorAll('.nav-link');
    
    navLinks.forEach(link => {
      const href = link.getAttribute('href');
      if (href && href.includes(currentPage)) {
        link.classList.add('active');
      }
    });

    // Handle logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        AuthManager.logout();
      });
    }
  },

  // Navigate to page
  navigate: (page) => {
    window.location.href = page;
  },

  // Go back
  goBack: () => {
    window.history.back();
  }
};

// Form Manager
const FormManager = {
  // Initialize form validation
  init: () => {
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
      form.addEventListener('submit', FormManager.handleSubmit);
      
      // Add real-time validation
      const inputs = form.querySelectorAll('input, select, textarea');
      inputs.forEach(input => {
        input.addEventListener('blur', () => FormManager.validateField(input));
        input.addEventListener('input', () => FormManager.clearFieldError(input));
      });
    });
  },

  // Handle form submission
  handleSubmit: (e) => {
    e.preventDefault();
    const form = e.target;
    
    if (FormManager.validateForm(form)) {
      // Form is valid, handle submission
      const formData = new FormData(form);
      const data = Object.fromEntries(formData.entries());
      
      // Trigger custom event
      const submitEvent = new CustomEvent('formSubmit', {
        detail: { form, data }
      });
      document.dispatchEvent(submitEvent);
    }
  },

  // Validate entire form
  validateForm: (form) => {
    let isValid = true;
    const inputs = form.querySelectorAll('input[required], select[required], textarea[required]');
    
    inputs.forEach(input => {
      if (!FormManager.validateField(input)) {
        isValid = false;
      }
    });
    
    return isValid;
  },

  // Validate individual field
  validateField: (field) => {
    const value = field.value.trim();
    const type = field.type;
    const required = field.hasAttribute('required');
    
    // Clear previous errors
    FormManager.clearFieldError(field);
    
    // Check required fields
    if (required && !value) {
      FormManager.showFieldError(field, 'This field is required');
      return false;
    }
    
    // Type-specific validation
    if (value) {
      switch (type) {
        case 'email':
          if (!Utils.validateEmail(value)) {
            FormManager.showFieldError(field, 'Please enter a valid email address');
            return false;
          }
          break;
        case 'tel':
          if (!Utils.validatePhone(value)) {
            FormManager.showFieldError(field, 'Please enter a valid phone number');
            return false;
          }
          break;
        case 'url':
          try {
            new URL(value);
          } catch {
            FormManager.showFieldError(field, 'Please enter a valid URL');
            return false;
          }
          break;
        case 'number':
          if (field.min && parseFloat(value) < parseFloat(field.min)) {
            FormManager.showFieldError(field, `Value must be at least ${field.min}`);
            return false;
          }
          if (field.max && parseFloat(value) > parseFloat(field.max)) {
            FormManager.showFieldError(field, `Value must be at most ${field.max}`);
            return false;
          }
          break;
      }
    }
    
    return true;
  },

  // Show field error
  showFieldError: (field, message) => {
    field.classList.add('error');
    
    const errorElement = document.createElement('div');
    errorElement.className = 'field-error';
    errorElement.textContent = message;
    errorElement.style.color = 'var(--error-red)';
    errorElement.style.fontSize = 'var(--text-sm)';
    errorElement.style.marginTop = 'var(--space-1)';
    
    field.parentNode.appendChild(errorElement);
  },

  // Clear field error
  clearFieldError: (field) => {
    field.classList.remove('error');
    const errorElement = field.parentNode.querySelector('.field-error');
    if (errorElement) {
      errorElement.remove();
    }
  },

  // Get form data
  getFormData: (form) => {
    const formData = new FormData(form);
    return Object.fromEntries(formData.entries());
  },

  // Set form data
  setFormData: (form, data) => {
    Object.keys(data).forEach(key => {
      const field = form.querySelector(`[name="${key}"]`);
      if (field) {
        if (field.type === 'checkbox') {
          field.checked = data[key];
        } else {
          field.value = data[key];
        }
      }
    });
  }
};

// Modal Manager
const ModalManager = {
  // Open modal
  open: (modalId) => {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
      
      // Focus first input
      const firstInput = modal.querySelector('input, select, textarea');
      if (firstInput) {
        setTimeout(() => firstInput.focus(), 100);
      }
    }
  },

  // Close modal
  close: (modalId) => {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }
  },

  // Initialize modals
  init: () => {
    // Close modal on backdrop click
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal')) {
        ModalManager.close(e.target.id);
      }
    });

    // Close modal on close button click
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal-close')) {
        const modal = e.target.closest('.modal');
        if (modal) {
          ModalManager.close(modal.id);
        }
      }
    });

    // Close modal on escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const activeModal = document.querySelector('.modal.active');
        if (activeModal) {
          ModalManager.close(activeModal.id);
        }
      }
    });
  }
};

// Enhanced Navigation management
const Navigation = {
  // Initialize navigation
  init: () => {
    Navigation.updateNavigation();
    Navigation.bindEvents();
  },

  // Update navigation based on user role
  updateNavigation: () => {
    const currentUser = AuthManager.getCurrentUser();
    const navMenu = document.querySelector('.nav-menu');
    
    if (!navMenu || !currentUser) return;

    // Clear existing navigation
    navMenu.innerHTML = '';

    // Common navigation items
    const commonItems = [
      { href: 'dashboard.html', text: 'Dashboard', icon: '🏠' },
      { href: 'orders.html', text: 'Orders', icon: '📦' },
      { href: 'chat.html', text: 'Chat', icon: '💬' },
      { href: 'posts.html', text: 'Posts', icon: '📰' }
    ];

    // Role-specific navigation items
    const roleSpecificItems = currentUser.role === 'buyer' ? [
      { href: 'marketplace.html', text: 'Marketplace', icon: '🛒' }
    ] : [
      { href: 'profile.html', text: 'Profile', icon: '👤' },
      { href: 'products.html', text: 'Products', icon: '📦' },
      { href: 'add-product.html', text: 'Add Product', icon: '➕' }
    ];

    // Combine and render navigation items
    const allItems = [...commonItems, ...roleSpecificItems];
    
    allItems.forEach(item => {
      const li = document.createElement('li');
      li.innerHTML = `
        <a href="${item.href}" class="nav-link">
          <span class="nav-icon">${item.icon}</span>
          <span class="nav-text">${item.text}</span>
        </a>
      `;
      navMenu.appendChild(li);
    });

    // Add logout button
    const logoutLi = document.createElement('li');
    logoutLi.innerHTML = `
      <a href="#" class="nav-link" id="logout-btn">
        <span class="nav-icon">🚪</span>
        <span class="nav-text">Logout</span>
      </a>
    `;
    navMenu.appendChild(logoutLi);

    // Set active page
    Navigation.setActivePage();
  },

  // Set active page in navigation
  setActivePage: () => {
    const currentPage = window.location.pathname.split('/').pop();
    const navLinks = document.querySelectorAll('.nav-link');
    
    navLinks.forEach(link => {
      const href = link.getAttribute('href');
      if (href && href.includes(currentPage)) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
  },

  // Bind navigation events
  bindEvents: () => {
    // Logout functionality
    document.addEventListener('click', (e) => {
      if (e.target.closest('#logout-btn')) {
        e.preventDefault();
        Navigation.logout();
      }
    });

    // Mobile menu toggle
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    if (mobileMenuToggle) {
      mobileMenuToggle.addEventListener('click', Navigation.toggleMobileMenu);
    }
  },

  // Logout user
  logout: () => {
    if (confirm('Are you sure you want to logout?')) {
      AuthManager.logout();
      window.location.href = 'index.html';
    }
  },

  // Toggle mobile menu
  toggleMobileMenu: () => {
    const navMenu = document.querySelector('.nav-menu');
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    
    if (navMenu && mobileMenuToggle) {
      navMenu.classList.toggle('active');
      mobileMenuToggle.classList.toggle('active');
    }
  }
};

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
  // Initialize all managers
  NavigationManager.init();
  FormManager.init();
  ModalManager.init();
  
  // Initialize enhanced navigation
  Navigation.init();
  
  // Check authentication for protected pages
  const protectedPages = ['dashboard.html', 'marketplace.html', 'product.html', 'orders.html', 'profile.html', 'products.html', 'add-product.html', 'rfq.html', 'chat.html', 'ticket.html', 'posts.html'];
  const currentPage = window.location.pathname.split('/').pop();
  
  if (protectedPages.includes(currentPage)) {
    AuthManager.requireAuth();
  }
  
  // Redirect authenticated users away from auth pages
  const authPages = ['index.html', 'register.html'];
  if (authPages.includes(currentPage) && AuthManager.isLoggedIn()) {
    window.location.href = 'dashboard.html';
  }
  
  console.log('B2B Marketplace initialized');
});

// Export for use in other modules
window.Utils = Utils;
window.DataManager = DataManager;
window.AuthManager = AuthManager;
window.NavigationManager = NavigationManager;
window.Navigation = Navigation;
window.FormManager = FormManager;
window.ModalManager = ModalManager;
window.STORAGE_KEYS = STORAGE_KEYS;
