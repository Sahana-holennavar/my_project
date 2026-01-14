// B2B Marketplace - Add Product Page Module

const AddProduct = {
  // Initialize add product page
  init: () => {
    AddProduct.bindEvents();
    AddProduct.loadSubcategories();
  },

  // Bind events
  bindEvents: () => {
    // Form submission
    const form = document.getElementById('add-product-form');
    if (form) {
      form.addEventListener('submit', AddProduct.handleSubmit);
    }

    // Save draft button
    const saveDraftBtn = document.getElementById('save-draft');
    if (saveDraftBtn) {
      saveDraftBtn.addEventListener('click', AddProduct.saveDraft);
    }

    // Category change
    const categorySelect = document.getElementById('product-category');
    if (categorySelect) {
      categorySelect.addEventListener('change', AddProduct.handleCategoryChange);
    }

    // Add specification button
    const addSpecBtn = document.getElementById('add-specification');
    if (addSpecBtn) {
      addSpecBtn.addEventListener('click', AddProduct.addSpecification);
    }

    // Remove specification buttons
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('remove-spec')) {
        AddProduct.removeSpecification(e.target);
      }
    });

    // Image upload
    const imageInput = document.getElementById('product-images');
    if (imageInput) {
      imageInput.addEventListener('change', AddProduct.handleImageUpload);
    }

    // RFQ checkbox toggle
    const createRFQCheckbox = document.getElementById('create-rfq');
    if (createRFQCheckbox) {
      createRFQCheckbox.addEventListener('change', AddProduct.toggleRFQFields);
    }

    // RFQ contact method radio buttons
    const rfqContactMethods = document.querySelectorAll('input[name="rfqContactMethod"]');
    rfqContactMethods.forEach(radio => {
      radio.addEventListener('change', AddProduct.toggleContactMethod);
    });
  },

  // Load subcategories based on category
  loadSubcategories: () => {
    const categorySelect = document.getElementById('product-category');
    const subcategorySelect = document.getElementById('product-subcategory');
    
    if (!categorySelect || !subcategorySelect) return;

    const subcategories = {
      electronics: [
        { value: 'computers', text: 'Computers' },
        { value: 'mobile', text: 'Mobile Devices' },
        { value: 'lighting', text: 'Lighting' },
        { value: 'sensors', text: 'Sensors' }
      ],
      machinery: [
        { value: 'conveyors', text: 'Conveyors' },
        { value: 'hydraulics', text: 'Hydraulics' },
        { value: 'pneumatics', text: 'Pneumatics' },
        { value: 'robotics', text: 'Robotics' }
      ],
      materials: [
        { value: 'steel', text: 'Steel' },
        { value: 'aluminum', text: 'Aluminum' },
        { value: 'plastics', text: 'Plastics' },
        { value: 'composites', text: 'Composites' }
      ],
      services: [
        { value: 'consulting', text: 'Consulting' },
        { value: 'maintenance', text: 'Maintenance' },
        { value: 'installation', text: 'Installation' },
        { value: 'training', text: 'Training' }
      ]
    };

    categorySelect.addEventListener('change', () => {
      const category = categorySelect.value;
      subcategorySelect.innerHTML = '<option value="">Select Subcategory</option>';
      
      if (subcategories[category]) {
        subcategories[category].forEach(sub => {
          const option = document.createElement('option');
          option.value = sub.value;
          option.textContent = sub.text;
          subcategorySelect.appendChild(option);
        });
      }
    });
  },

  // Handle category change
  handleCategoryChange: (e) => {
    const category = e.target.value;
    const subcategorySelect = document.getElementById('product-subcategory');
    
    // Clear subcategory options
    subcategorySelect.innerHTML = '<option value="">Select Subcategory</option>';
    
    // Load subcategories for the selected category
    AddProduct.loadSubcategories();
  },

  // Add specification row
  addSpecification: () => {
    const container = document.getElementById('specifications-container');
    const newRow = document.createElement('div');
    newRow.className = 'specification-row';
    newRow.innerHTML = `
      <input type="text" name="specName[]" class="form-input" placeholder="Specification name">
      <input type="text" name="specValue[]" class="form-input" placeholder="Specification value">
      <button type="button" class="btn btn-outline btn-sm remove-spec">Remove</button>
    `;
    container.appendChild(newRow);
  },

  // Remove specification row
  removeSpecification: (button) => {
    const row = button.closest('.specification-row');
    if (row) {
      row.remove();
    }
  },

  // Handle image upload
  handleImageUpload: (e) => {
    const files = e.target.files;
    const preview = document.getElementById('image-preview');
    
    if (!preview) return;

    preview.innerHTML = '';

    Array.from(files).forEach((file, index) => {
      if (index >= 5) return; // Limit to 5 images
      
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = document.createElement('img');
        img.src = e.target.result;
        img.className = 'preview-image';
        img.alt = `Preview ${index + 1}`;
        preview.appendChild(img);
      };
      reader.readAsDataURL(file);
    });
  },

  // Handle form submission
  handleSubmit: (e) => {
    e.preventDefault();
    
    const form = e.target;
    const formData = FormManager.getFormData(form);
    
    // Validate required fields
    if (!formData.name || !formData.description || !formData.category) {
      Utils.showNotification('Please fill in all required fields', 'error');
      return;
    }

    const currentUser = AuthManager.getCurrentUser();
    if (!currentUser) {
      Utils.showNotification('Please log in to add a product', 'error');
      return;
    }

    // Process specifications
    const specifications = {};
    const specNames = formData['specName[]'] || [];
    const specValues = formData['specValue[]'] || [];
    
    for (let i = 0; i < specNames.length; i++) {
      if (specNames[i] && specValues[i]) {
        specifications[specNames[i]] = specValues[i];
      }
    }

    // Process images
    const imageFiles = document.getElementById('product-images').files;
    const images = [];
    Array.from(imageFiles).forEach((file, index) => {
      if (index < 5) { // Limit to 5 images
        images.push(`assets/images/placeholder.svg`); // In real app, upload to server
      }
    });

    const productData = {
      sellerId: currentUser.id,
      name: formData.name,
      description: formData.description,
      category: formData.category,
      subcategory: formData.subcategory || '',
      status: formData.status || 'draft',
      featured: formData.featured === 'on',
      images: images.length > 0 ? images : ['assets/images/placeholder.svg'],
      specifications: specifications
    };

    try {
      const newProduct = ProductManager.addProduct(productData);
      Utils.showNotification('Product added successfully!', 'success');
      
      // Create RFQ if checkbox is checked
      if (formData.createRFQ === 'on') {
        AddProduct.createRFQForProduct(newProduct, formData);
      }
      
      // Reset form
      form.reset();
      document.getElementById('image-preview').innerHTML = '';
      document.getElementById('specifications-container').innerHTML = `
        <div class="specification-row">
          <input type="text" name="specName[]" class="form-input" placeholder="Specification name">
          <input type="text" name="specValue[]" class="form-input" placeholder="Specification value">
          <button type="button" class="btn btn-outline btn-sm remove-spec">Remove</button>
        </div>
      `;
      
      // Hide RFQ fields
      const rfqFields = document.getElementById('rfq-fields');
      rfqFields.classList.remove('show');
      rfqFields.classList.add('hide');
      setTimeout(() => {
        rfqFields.style.display = 'none';
      }, 300);
      document.getElementById('create-rfq').checked = false;
      
      // Redirect to products page
      setTimeout(() => {
        window.location.href = 'products.html';
      }, 1500);
    } catch (error) {
      console.error('Product creation error:', error);
      Utils.showNotification('Failed to add product. Please try again.', 'error');
    }
  },

  // Save as draft
  saveDraft: () => {
    const form = document.getElementById('add-product-form');
    const formData = FormManager.getFormData(form);
    
    // Save to localStorage as draft
    const drafts = JSON.parse(localStorage.getItem('product_drafts') || '[]');
    const draft = {
      id: Utils.generateId(),
      ...formData,
      createdAt: new Date().toISOString()
    };
    
    drafts.push(draft);
    localStorage.setItem('product_drafts', JSON.stringify(drafts));
    
    Utils.showNotification('Product saved as draft', 'success');
  },

  // Toggle RFQ fields visibility
  toggleRFQFields: (e) => {
    const rfqFields = document.getElementById('rfq-fields');
    if (e.target.checked) {
      rfqFields.classList.remove('hide');
      rfqFields.classList.add('show');
      rfqFields.style.display = 'block';
    } else {
      rfqFields.classList.remove('show');
      rfqFields.classList.add('hide');
      setTimeout(() => {
        rfqFields.style.display = 'none';
      }, 300); // Match animation duration
    }
  },

  // Toggle contact method fields
  toggleContactMethod: (e) => {
    const emailField = document.getElementById('rfq-email-field');
    const pdfField = document.getElementById('rfq-pdf-field');
    
    if (e.target.value === 'email') {
      emailField.style.display = 'block';
      pdfField.style.display = 'none';
      // Clear PDF file input
      document.getElementById('rfq-pdf').value = '';
    } else if (e.target.value === 'pdf') {
      emailField.style.display = 'none';
      pdfField.style.display = 'block';
      // Clear email input
      document.getElementById('rfq-email').value = '';
    }
  },

  // Create RFQ for the product
  createRFQForProduct: (product, formData) => {
    const currentUser = AuthManager.getCurrentUser();
    if (!currentUser) return;

    // Validate contact method
    const contactMethod = formData.rfqContactMethod;
    if (!contactMethod) {
      Utils.showNotification('Please select a contact method for the RFQ', 'error');
      return;
    }

    // Validate based on contact method
    if (contactMethod === 'email' && !formData.rfqEmail) {
      Utils.showNotification('Please provide an email address for the RFQ', 'error');
      return;
    }

    if (contactMethod === 'pdf') {
      const pdfFile = document.getElementById('rfq-pdf').files[0];
      if (!pdfFile) {
        Utils.showNotification('Please upload a PDF document for the RFQ', 'error');
        return;
      }
    }

    // Prepare RFQ data
    const rfqData = {
      buyerId: currentUser.id, // Seller creating RFQ as buyer
      sellerIds: [], // Will be populated when other sellers respond
      productName: product.name,
      description: product.description,
      category: product.category,
      quantity: parseInt(formData.rfqQuantity) || 1,
      specifications: formData.rfqSpecifications || product.specifications || '',
      minBudget: parseFloat(formData.rfqMinBudget) || 0,
      maxBudget: parseFloat(formData.rfqMaxBudget) || 0,
      currency: 'USD',
      deadline: formData.rfqDeadline ? new Date(formData.rfqDeadline).toISOString() : null,
      deliveryLocation: formData.rfqLocation || '',
      message: formData.rfqMessage || `RFQ for ${product.name} - ${product.description}`,
      productId: product.id, // Link to the created product
      contactMethod: contactMethod,
      email: contactMethod === 'email' ? formData.rfqEmail : null,
      pdfName: contactMethod === 'pdf' ? document.getElementById('rfq-pdf').files[0]?.name : null
    };

    try {
      RFQManager.createRFQ(rfqData);
      Utils.showNotification('RFQ created successfully for this product!', 'success');
    } catch (error) {
      console.error('RFQ creation error:', error);
      Utils.showNotification('Product created but failed to create RFQ. You can create it later.', 'warning');
    }
  }
};

// Initialize add product when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  if (window.location.pathname.includes('add-product.html')) {
    AddProduct.init();
  }
});

// Export for global access
window.AddProduct = AddProduct;
