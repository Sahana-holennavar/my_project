// B2B Marketplace - Marketplace Page Module

const Marketplace = {
  // Initialize marketplace
  init: () => {
    Marketplace.loadProducts();
    Marketplace.bindEvents();
    Marketplace.initializeFilters();
  },

  // Bind events
  bindEvents: () => {
    // Search functionality
    const searchInput = document.getElementById('search');
    if (searchInput) {
      searchInput.addEventListener('input', Utils.debounce(Marketplace.handleSearch, 300));
    }

    // Filter functionality
    const applyFiltersBtn = document.getElementById('apply-filters');
    if (applyFiltersBtn) {
      applyFiltersBtn.addEventListener('click', Marketplace.applyFilters);
    }

    const clearFiltersBtn = document.getElementById('clear-filters');
    if (clearFiltersBtn) {
      clearFiltersBtn.addEventListener('click', Marketplace.clearFilters);
    }

    // Category filter
    const categorySelect = document.getElementById('category');
    if (categorySelect) {
      categorySelect.addEventListener('change', Marketplace.handleCategoryChange);
    }
  },

  // Initialize filters
  initializeFilters: () => {
    const categorySelect = document.getElementById('category');
    if (categorySelect) {
      // Populate categories from products
      const products = ProductManager.getAllProducts();
      const categories = [...new Set(products.map(p => p.category))];
      
      categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category.charAt(0).toUpperCase() + category.slice(1);
        categorySelect.appendChild(option);
      });
    }
  },

  // Load products
  loadProducts: (filters = {}) => {
    const productsGrid = document.getElementById('products-grid');
    const productsCount = document.getElementById('products-count');
    const loading = document.getElementById('loading');
    
    if (loading) {
      Utils.showLoading(loading);
    }
    
    // Simulate loading delay
    setTimeout(() => {
      const products = ProductManager.searchProducts('', filters);
      const activeProducts = products.filter(p => p.status === 'active');
      
      Marketplace.renderProducts(activeProducts);
      Marketplace.loadFeaturedProducts();
      
      if (productsCount) {
        productsCount.textContent = `${activeProducts.length} products found`;
      }
      
      if (loading) {
        Utils.hideLoading(loading);
      }
    }, 500);
  },

  // Load featured products
  loadFeaturedProducts: () => {
    const featuredProducts = ProductManager.getFeaturedProducts();
    if (featuredProducts.length > 0) {
      const featuredBanner = document.getElementById('featured-banner');
      const featuredProductsContainer = document.getElementById('featured-products');
      
      if (featuredBanner && featuredProductsContainer) {
        featuredBanner.style.display = 'block';
        featuredProductsContainer.innerHTML = featuredProducts
          .slice(0, 3)
          .map(product => Marketplace.createProductCard(product, 'featured'))
          .join('');
      }
    }
  },

  // Set view mode (grid/list)
  setView: (view) => {
    const gridView = document.getElementById('products-grid');
    const listView = document.getElementById('products-list');
    const viewButtons = document.querySelectorAll('.view-btn');
    
    viewButtons.forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[data-view="${view}"]`).classList.add('active');
    
    if (view === 'grid') {
      gridView.style.display = 'grid';
      listView.style.display = 'none';
    } else {
      gridView.style.display = 'none';
      listView.style.display = 'block';
    }
  },

  // Search by tag
  searchByTag: (tag) => {
    const searchInput = document.getElementById('search');
    if (searchInput) {
      searchInput.value = tag;
      Marketplace.handleSearch({ target: searchInput });
    }
  },

  // Sort products
  sortProducts: (sortBy) => {
    const products = ProductManager.getAllProducts();
    let sortedProducts = [...products];
    
    switch (sortBy) {
      case 'name':
        sortedProducts.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'newest':
        sortedProducts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        break;
      case 'rating':
        sortedProducts.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case 'popularity':
        sortedProducts.sort((a, b) => (b.views || 0) - (a.views || 0));
        break;
    }
    
    Marketplace.renderProducts(sortedProducts);
  },

  // Pagination methods
  previousPage: () => {
    // Implementation for pagination
    console.log('Previous page');
  },

  nextPage: () => {
    // Implementation for pagination
    console.log('Next page');
  },

  // Render products
  renderProducts: (products) => {
    const productsGrid = document.getElementById('products-grid');
    if (!productsGrid) return;
    
    if (products.length === 0) {
      productsGrid.innerHTML = `
        <div class="no-products">
          <div class="no-products-content">
            <div class="no-products-icon">📦</div>
            <h3>No products found</h3>
            <p>Try adjusting your search criteria or filters.</p>
          </div>
        </div>
      `;
      return;
    }
    
    productsGrid.innerHTML = products.map(product => `
      <div class="product-card" data-product-id="${product.id}">
        <div class="product-card-image">
          <img src="${product.images && product.images[0] ? product.images[0] : 'assets/images/placeholder.svg'}" 
               alt="${product.name}" 
               onerror="this.src='assets/images/placeholder.svg'">
        </div>
        <div class="product-card-content">
          <h3 class="product-card-title">${Utils.sanitizeHTML(product.name)}</h3>
          <p class="product-card-description">${Utils.sanitizeHTML(product.description)}</p>
          <div class="product-card-meta">
            <span class="product-card-category">${product.category}</span>
          </div>
          <div class="product-card-actions">
            <button class="btn btn-primary btn-sm" onclick="Marketplace.viewProduct('${product.id}')">
              View Details
            </button>
            <button class="btn btn-outline btn-sm" onclick="Marketplace.quickRFQ('${product.id}')">
              Request Quote
            </button>
          </div>
        </div>
      </div>
    `).join('');
  },

  // View product details
  viewProduct: (productId) => {
    window.location.href = `product.html?id=${productId}`;
  },

  // Quick RFQ
  quickRFQ: (productId) => {
    const product = ProductManager.getProductById(productId);
    if (!product) return;
    
    // RFQ functionality moved to seller section
    Utils.showNotification('RFQ functionality is now available in the seller section', 'info');
  },

  // Handle search
  handleSearch: (e) => {
    const query = e.target.value;
    const filters = Marketplace.getCurrentFilters();
    filters.query = query;
    
    Marketplace.loadProducts(filters);
  },

  // Handle category change
  handleCategoryChange: (e) => {
    const category = e.target.value;
    const filters = Marketplace.getCurrentFilters();
    filters.category = category || null;
    
    Marketplace.loadProducts(filters);
  },

  // Apply filters
  applyFilters: () => {
    const filters = Marketplace.getCurrentFilters();
    Marketplace.loadProducts(filters);
  },

  // Clear filters
  clearFilters: () => {
    // Reset form inputs
    const searchInput = document.getElementById('search');
    const categorySelect = document.getElementById('category');
    
    if (searchInput) searchInput.value = '';
    if (categorySelect) categorySelect.value = '';
    
    // Load products without filters
    Marketplace.loadProducts();
  },

  // Get current filters
  getCurrentFilters: () => {
    const searchInput = document.getElementById('search');
    const categorySelect = document.getElementById('category');
    
    return {
      query: searchInput ? searchInput.value : '',
      category: categorySelect ? categorySelect.value : null
    };
  },

  // Sort products
  sortProducts: (sortBy) => {
    const filters = Marketplace.getCurrentFilters();
    let products = ProductManager.searchProducts(filters.query, filters);
    
    switch (sortBy) {
      case 'price-low':
        products.sort((a, b) => a.price - b.price);
        break;
      case 'price-high':
        products.sort((a, b) => b.price - a.price);
        break;
      case 'name':
        products.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'newest':
        products.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        break;
      case 'rating':
        products.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case 'popularity':
        products.sort((a, b) => (b.views || 0) - (a.views || 0));
        break;
      default:
        // Default sorting
        break;
    }
    
    Marketplace.renderProducts(products);
  },

  // Advanced search with multiple criteria
  advancedSearch: (searchCriteria) => {
    const products = ProductManager.getAllProducts();
    let filteredProducts = products.filter(product => {
      // Text search across multiple fields
      if (searchCriteria.query) {
        const query = searchCriteria.query.toLowerCase();
        const searchFields = [
          product.name,
          product.description,
          product.category,
          product.tags ? product.tags.join(' ') : '',
          product.sellerName || ''
        ];
        
        const matchesQuery = searchFields.some(field => 
          field && field.toLowerCase().includes(query)
        );
        
        if (!matchesQuery) return false;
      }
      
      // Category filter
      if (searchCriteria.category && product.category !== searchCriteria.category) {
        return false;
      }
      
      
      // Rating filter
      if (searchCriteria.minRating && (product.rating || 0) < searchCriteria.minRating) {
        return false;
      }
      
      
      // Seller filter
      if (searchCriteria.sellerId && product.sellerId !== searchCriteria.sellerId) {
        return false;
      }
      
      return true;
    });
    
    return filteredProducts;
  },

  // Save search preferences
  saveSearchPreferences: (preferences) => {
    localStorage.setItem('marketplacePreferences', JSON.stringify(preferences));
  },

  // Load search preferences
  loadSearchPreferences: () => {
    const preferences = localStorage.getItem('marketplacePreferences');
    return preferences ? JSON.parse(preferences) : {};
  },

  // Get search suggestions
  getSearchSuggestions: (query) => {
    if (query.length < 2) return [];
    
    const products = ProductManager.getAllProducts();
    const suggestions = new Set();
    
    products.forEach(product => {
      // Add product names that match
      if (product.name.toLowerCase().includes(query.toLowerCase())) {
        suggestions.add(product.name);
      }
      
      // Add categories that match
      if (product.category.toLowerCase().includes(query.toLowerCase())) {
        suggestions.add(product.category);
      }
      
      // Add tags that match
      if (product.tags) {
        product.tags.forEach(tag => {
          if (tag.toLowerCase().includes(query.toLowerCase())) {
            suggestions.add(tag);
          }
        });
      }
    });
    
    return Array.from(suggestions).slice(0, 5);
  },

  // Show search suggestions
  showSearchSuggestions: (suggestions) => {
    const searchContainer = document.querySelector('.search-container');
    if (!searchContainer) return;
    
    let suggestionsElement = document.getElementById('search-suggestions');
    if (!suggestionsElement) {
      suggestionsElement = document.createElement('div');
      suggestionsElement.id = 'search-suggestions';
      suggestionsElement.className = 'search-suggestions';
      searchContainer.appendChild(suggestionsElement);
    }
    
    if (suggestions.length === 0) {
      suggestionsElement.style.display = 'none';
      return;
    }
    
    suggestionsElement.innerHTML = suggestions.map(suggestion => `
      <div class="search-suggestion" onclick="Marketplace.selectSuggestion('${suggestion}')">
        ${suggestion}
      </div>
    `).join('');
    
    suggestionsElement.style.display = 'block';
  },

  // Select search suggestion
  selectSuggestion: (suggestion) => {
    const searchInput = document.getElementById('search');
    if (searchInput) {
      searchInput.value = suggestion;
      Marketplace.handleSearch({ target: searchInput });
    }
    
    const suggestionsElement = document.getElementById('search-suggestions');
    if (suggestionsElement) {
      suggestionsElement.style.display = 'none';
    }
  }
};

// Initialize marketplace when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  if (window.location.pathname.includes('marketplace.html')) {
    Marketplace.init();
  }
});

// Export for global access
window.Marketplace = Marketplace;
