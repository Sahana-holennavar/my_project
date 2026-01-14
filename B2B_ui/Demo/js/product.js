// B2B Marketplace - Product Details Page Module

const ProductDetails = {
  // Initialize product details
  init: () => {
    const urlParams = Utils.getUrlParams();
    const productId = urlParams.id;
    
    if (productId) {
      ProductDetails.loadProduct(productId);
    } else {
      Utils.showNotification('Product not found', 'error');
      window.location.href = 'marketplace.html';
    }
    
    ProductDetails.bindEvents();
  },

  // Bind events
  bindEvents: () => {
    // Action buttons
    const contactSellerBtn = document.getElementById('contact-seller-btn');
    if (contactSellerBtn) {
      contactSellerBtn.addEventListener('click', ProductDetails.contactSeller);
    }

    // Image thumbnails
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('image-thumbnail')) {
        ProductDetails.changeMainImage(e.target.src);
      }
    });
  },

  // Load product
  loadProduct: (productId) => {
    const product = ProductManager.getProductById(productId);
    
    if (!product) {
      Utils.showNotification('Product not found', 'error');
      window.location.href = 'marketplace.html';
      return;
    }
    
    ProductDetails.renderProduct(product);
    ProductDetails.loadRelatedProducts(productId);
  },

  // Render product
  renderProduct: (product) => {
    // Update page title
    document.title = `${product.name} - B2B Marketplace`;
    
    // Update breadcrumb
    const productCategory = document.getElementById('product-category');
    const productName = document.getElementById('product-name');
    if (productCategory) productCategory.textContent = product.category;
    if (productName) productName.textContent = product.name;
    
    // Update main product info
    const productTitle = document.getElementById('product-title');
    const productDescription = document.getElementById('product-description');
    const sellerLink = document.getElementById('seller-link');
    
    if (productTitle) productTitle.textContent = product.name;
    if (productDescription) productDescription.textContent = product.description;
    
    // Get seller info
    const seller = Auth.getUserById(product.sellerId);
    if (sellerLink && seller) {
      sellerLink.textContent = seller.companyName;
      sellerLink.href = `#seller-${seller.id}`;
    }
    
    // Update product images
    ProductDetails.renderProductImages(product);
    
    // Update specifications
    ProductDetails.renderSpecifications(product.specifications);
    
    // Update RFQ form with product info
    ProductDetails.updateRFQForm(product);
  },

  // Render product images
  renderProductImages: (product) => {
    const mainImage = document.getElementById('main-product-image');
    const thumbnailsContainer = document.getElementById('image-thumbnails');
    
    if (product.images && product.images.length > 0) {
      if (mainImage) {
        mainImage.src = product.images[0];
        mainImage.alt = product.name;
      }
      
      if (thumbnailsContainer) {
        thumbnailsContainer.innerHTML = product.images.map((image, index) => `
          <img src="${image}" 
               alt="${product.name} ${index + 1}" 
               class="image-thumbnail ${index === 0 ? 'active' : ''}"
               onerror="this.src='assets/images/placeholder.svg'">
        `).join('');
      }
    } else {
      if (mainImage) {
        mainImage.src = 'assets/images/placeholder.svg';
      }
      if (thumbnailsContainer) {
        thumbnailsContainer.innerHTML = '';
      }
    }
  },

  // Change main image
  changeMainImage: (imageSrc) => {
    const mainImage = document.getElementById('main-product-image');
    if (mainImage) {
      mainImage.src = imageSrc;
    }
    
    // Update active thumbnail
    document.querySelectorAll('.image-thumbnail').forEach(thumb => {
      thumb.classList.remove('active');
    });
    event.target.classList.add('active');
  },

  // Render specifications
  renderSpecifications: (specifications) => {
    const specsTable = document.getElementById('specs-table');
    if (!specsTable || !specifications) return;
    
    specsTable.innerHTML = Object.entries(specifications).map(([key, value]) => `
      <div class="spec-row">
        <span class="spec-name">${key}</span>
        <span class="spec-value">${value}</span>
      </div>
    `).join('');
  },

  // Update RFQ form
  updateRFQForm: (product) => {
  },

  // Load related products
  loadRelatedProducts: (productId) => {
    const relatedProducts = ProductManager.getRelatedProducts(productId, 4);
    const relatedContainer = document.getElementById('related-products');
    
    if (!relatedContainer) return;
    
    if (relatedProducts.length === 0) {
      relatedContainer.innerHTML = '<p>No related products found.</p>';
      return;
    }
    
    relatedContainer.innerHTML = relatedProducts.map(product => `
      <div class="product-card" data-product-id="${product.id}">
        <div class="product-card-image">
          <img src="${product.images && product.images[0] ? product.images[0] : 'assets/images/placeholder.svg'}" 
               alt="${product.name}" 
               onerror="this.src='assets/images/placeholder.svg'">
        </div>
        <div class="product-card-content">
          <h3 class="product-card-title">${Utils.sanitizeHTML(product.name)}</h3>
          <button class="btn btn-primary btn-sm" onclick="ProductDetails.viewProduct('${product.id}')">
            View Details
          </button>
        </div>
      </div>
    `).join('');
  },

  // Contact seller
  contactSeller: () => {
    const productId = Utils.getUrlParams().id;
    const product = ProductManager.getProductById(productId);
    
    if (product) {
      // Store product info for chat
      sessionStorage.setItem('chatProduct', JSON.stringify(product));
      window.location.href = 'chat.html';
    }
  }
};

// Initialize product details when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  if (window.location.pathname.includes('product.html')) {
    ProductDetails.init();
  }
});

// Export for global access
window.ProductDetails = ProductDetails;
