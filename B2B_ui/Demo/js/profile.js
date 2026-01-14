// B2B Marketplace - Profile Page Module

const Profile = {
  // Initialize profile page
  init: () => {
    Profile.loadUserProfile();
    Profile.bindEvents();
    Profile.initializeTabs();
  },

  // Bind events
  bindEvents: () => {
    // Tab switching
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('profile-tab')) {
        Profile.switchTab(e.target.dataset.tab);
      }
    });

    // Form submissions
    document.addEventListener('submit', (e) => {
      if (e.target.id === 'company-form') {
        e.preventDefault();
        Profile.saveCompanyInfo();
      } else if (e.target.id === 'contact-form') {
        e.preventDefault();
        Profile.saveContactInfo();
      } else if (e.target.id === 'business-form') {
        e.preventDefault();
        Profile.saveBusinessInfo();
      } else if (e.target.id === 'settings-form') {
        e.preventDefault();
        Profile.saveSettings();
      }
    });

    // Delete account
    document.getElementById('delete-account')?.addEventListener('click', Profile.deleteAccount);
  },

  // Initialize tabs
  initializeTabs: () => {
    const tabs = document.querySelectorAll('.profile-tab');
    const tabContents = document.querySelectorAll('.profile-tab-content');
    
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        // Remove active class from all tabs and contents
        tabs.forEach(t => t.classList.remove('active'));
        tabContents.forEach(content => content.classList.remove('active'));
        
        // Add active class to clicked tab and corresponding content
        tab.classList.add('active');
        const targetContent = document.getElementById(tab.dataset.tab);
        if (targetContent) {
          targetContent.classList.add('active');
        }
      });
    });
  },

  // Switch tab
  switchTab: (tabId) => {
    const tabs = document.querySelectorAll('.profile-tab');
    const tabContents = document.querySelectorAll('.profile-tab-content');
    
    tabs.forEach(tab => tab.classList.remove('active'));
    tabContents.forEach(content => content.classList.remove('active'));
    
    const activeTab = document.querySelector(`[data-tab="${tabId}"]`);
    const activeContent = document.getElementById(tabId);
    
    if (activeTab) activeTab.classList.add('active');
    if (activeContent) activeContent.classList.add('active');
  },

  // Load user profile data
  loadUserProfile: () => {
    const currentUser = AuthManager.getCurrentUser();
    if (!currentUser) {
      window.location.href = 'index.html';
      return;
    }

    // Update profile sidebar
    Profile.updateProfileSidebar(currentUser);
    
    // Load profile data into forms
    Profile.loadCompanyInfo(currentUser);
    Profile.loadContactInfo(currentUser);
    Profile.loadBusinessInfo(currentUser);
    Profile.loadSettings(currentUser);
    
    // Load statistics
    Profile.loadProfileStats(currentUser);
  },

  // Update profile sidebar
  updateProfileSidebar: (user) => {
    const companyName = document.getElementById('company-name');
    const companyRole = document.getElementById('company-role');
    const companyLogo = document.getElementById('company-logo');
    
    if (companyName) {
      companyName.textContent = user.companyName || 'Company Name';
    }
    
    if (companyRole) {
      companyRole.textContent = user.role === 'buyer' ? 'Buyer' : 'Seller';
    }
    
    if (companyLogo) {
      companyLogo.src = user.logo || 'assets/images/placeholder.svg';
      companyLogo.alt = user.companyName || 'Company Logo';
    }
  },

  // Load company info
  loadCompanyInfo: (user) => {
    const companyNameInput = document.getElementById('company-name-input');
    const companyType = document.getElementById('company-type');
    const companyDescription = document.getElementById('company-description');
    const companyWebsite = document.getElementById('company-website');
    
    if (companyNameInput) {
      companyNameInput.value = user.companyName || '';
    }
    
    if (companyType) {
      companyType.value = user.companyType || 'manufacturer';
    }
    
    if (companyDescription) {
      companyDescription.value = user.description || '';
    }
    
    if (companyWebsite) {
      companyWebsite.value = user.website || '';
    }
  },

  // Load contact info
  loadContactInfo: (user) => {
    const contactName = document.getElementById('contact-name');
    const contactEmail = document.getElementById('contact-email');
    const contactPhone = document.getElementById('contact-phone');
    const contactMobile = document.getElementById('contact-mobile');
    const companyAddress = document.getElementById('company-address');
    const companyCity = document.getElementById('company-city');
    const companyState = document.getElementById('company-state');
    const companyZip = document.getElementById('company-zip');
    
    if (contactName) {
      contactName.value = user.contactInfo?.name || '';
    }
    
    if (contactEmail) {
      contactEmail.value = user.email || '';
    }
    
    if (contactPhone) {
      contactPhone.value = user.contactInfo?.phone || '';
    }
    
    if (contactMobile) {
      contactMobile.value = user.contactInfo?.mobile || '';
    }
    
    if (companyAddress) {
      companyAddress.value = user.contactInfo?.address || '';
    }
    
    if (companyCity) {
      companyCity.value = user.contactInfo?.city || '';
    }
    
    if (companyState) {
      companyState.value = user.contactInfo?.state || '';
    }
    
    if (companyZip) {
      companyZip.value = user.contactInfo?.zipCode || '';
    }
  },

  // Load business info
  loadBusinessInfo: (user) => {
    const businessLicense = document.getElementById('business-license');
    const taxId = document.getElementById('tax-id');
    const establishedYear = document.getElementById('established-year');
    const employeeCount = document.getElementById('employee-count');
    const businessCategories = document.querySelectorAll('input[name="categories"]');
    
    if (businessLicense) {
      businessLicense.value = user.businessInfo?.licenseNumber || '';
    }
    
    if (taxId) {
      taxId.value = user.businessInfo?.taxId || '';
    }
    
    if (establishedYear) {
      establishedYear.value = user.businessInfo?.establishedYear || '';
    }
    
    if (employeeCount) {
      employeeCount.value = user.businessInfo?.employeeCount || '';
    }
    
    // Set business categories
    if (businessCategories && user.businessInfo?.categories) {
      businessCategories.forEach(checkbox => {
        if (user.businessInfo.categories.includes(checkbox.value)) {
          checkbox.checked = true;
        }
      });
    }
  },

  // Load settings
  loadSettings: (user) => {
    const notifications = document.querySelectorAll('input[name="notifications"]');
    const profileVisibility = document.getElementById('profile-visibility');
    
    // Set notification preferences
    if (notifications && user.settings?.notifications) {
      notifications.forEach(checkbox => {
        if (user.settings.notifications[checkbox.value]) {
          checkbox.checked = true;
        }
      });
    }
    
    if (profileVisibility) {
      profileVisibility.value = user.settings?.visibility || 'public';
    }
  },

  // Load profile statistics
  loadProfileStats: (user) => {
    const productsCount = document.getElementById('profile-products');
    const ordersCount = document.getElementById('profile-orders');
    
    // Load products count
    if (productsCount) {
      const products = DataManager.getProducts();
      const userProducts = products.filter(product => product.sellerId === user.id);
      productsCount.textContent = userProducts.length;
    }
    
    // Load orders count
    if (ordersCount) {
      const orders = DataManager.getOrders();
      let userOrders = [];
      
      if (user.role === 'buyer') {
        userOrders = orders.filter(order => order.buyerId === user.id);
      } else if (user.role === 'seller') {
        userOrders = orders.filter(order => order.sellerId === user.id);
      }
      
      ordersCount.textContent = userOrders.length;
    }
  },

  // Save company info
  saveCompanyInfo: () => {
    const currentUser = AuthManager.getCurrentUser();
    if (!currentUser) return;
    
    const formData = new FormData(document.getElementById('company-form'));
    const companyData = {
      companyName: formData.get('companyName'),
      companyType: formData.get('companyType'),
      description: formData.get('description'),
      website: formData.get('website')
    };
    
    // Update user data
    currentUser.companyName = companyData.companyName;
    currentUser.companyType = companyData.companyType;
    currentUser.description = companyData.description;
    currentUser.website = companyData.website;
    
    // Save to localStorage
    AuthManager.updateUser(currentUser);
    
    // Update sidebar
    Profile.updateProfileSidebar(currentUser);
    
    Utils.showNotification('Company information updated successfully!', 'success');
  },

  // Save contact info
  saveContactInfo: () => {
    const currentUser = AuthManager.getCurrentUser();
    if (!currentUser) return;
    
    const formData = new FormData(document.getElementById('contact-form'));
    const contactData = {
      name: formData.get('contactName'),
      email: formData.get('email'),
      phone: formData.get('phone'),
      mobile: formData.get('mobile'),
      address: formData.get('address'),
      city: formData.get('city'),
      state: formData.get('state'),
      zipCode: formData.get('zipCode')
    };
    
    // Update user data
    currentUser.email = contactData.email;
    currentUser.contactInfo = {
      ...currentUser.contactInfo,
      ...contactData
    };
    
    // Save to localStorage
    AuthManager.updateUser(currentUser);
    
    Utils.showNotification('Contact information updated successfully!', 'success');
  },

  // Save business info
  saveBusinessInfo: () => {
    const currentUser = AuthManager.getCurrentUser();
    if (!currentUser) return;
    
    const formData = new FormData(document.getElementById('business-form'));
    const businessData = {
      licenseNumber: formData.get('licenseNumber'),
      taxId: formData.get('taxId'),
      establishedYear: parseInt(formData.get('establishedYear')),
      employeeCount: formData.get('employeeCount'),
      categories: formData.getAll('categories')
    };
    
    // Update user data
    currentUser.businessInfo = {
      ...currentUser.businessInfo,
      ...businessData
    };
    
    // Save to localStorage
    AuthManager.updateUser(currentUser);
    
    Utils.showNotification('Business information updated successfully!', 'success');
  },

  // Save settings
  saveSettings: () => {
    const currentUser = AuthManager.getCurrentUser();
    if (!currentUser) return;
    
    const formData = new FormData(document.getElementById('settings-form'));
    const settingsData = {
      notifications: {
        'new-orders': formData.has('notifications'),
        'rfqs': formData.has('notifications'),
        'messages': formData.has('notifications')
      },
      visibility: formData.get('visibility')
    };
    
    // Update user data
    currentUser.settings = {
      ...currentUser.settings,
      ...settingsData
    };
    
    // Save to localStorage
    AuthManager.updateUser(currentUser);
    
    Utils.showNotification('Settings updated successfully!', 'success');
  },

  // Delete account
  deleteAccount: () => {
    if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      const currentUser = AuthManager.getCurrentUser();
      if (currentUser) {
        AuthManager.deleteUser(currentUser.id);
        Utils.showNotification('Account deleted successfully!', 'success');
        setTimeout(() => {
          window.location.href = 'index.html';
        }, 2000);
      }
    }
  }
};

// Initialize profile when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  Profile.init();
});

// Export for use in other modules
window.Profile = Profile;
