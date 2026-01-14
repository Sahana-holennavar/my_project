// B2B Marketplace - Orders Page Module

const Orders = {
  // Initialize orders page
  init: () => {
    Orders.loadOrders();
    Orders.bindEvents();
  },

  // Bind events
  bindEvents: () => {
    // Filter tabs
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('filter-tab')) {
        Orders.handleFilterTab(e.target);
      }
    });

    // Search functionality
    const searchInput = document.getElementById('order-search');
    if (searchInput) {
      searchInput.addEventListener('input', Utils.debounce(Orders.handleSearch, 300));
    }

    const searchBtn = document.getElementById('search-orders');
    if (searchBtn) {
      searchBtn.addEventListener('click', Orders.handleSearch);
    }

    // Order details modal
    const closeOrderModal = document.getElementById('close-order-modal');
    if (closeOrderModal) {
      closeOrderModal.addEventListener('click', () => ModalManager.close('order-modal'));
    }

    const closeOrderDetails = document.getElementById('close-order-details');
    if (closeOrderDetails) {
      closeOrderDetails.addEventListener('click', () => ModalManager.close('order-modal'));
    }

    // Status update modal
    const closeStatusModal = document.getElementById('close-status-modal');
    if (closeStatusModal) {
      closeStatusModal.addEventListener('click', () => ModalManager.close('status-modal'));
    }

    const cancelStatusUpdate = document.getElementById('cancel-status-update');
    if (cancelStatusUpdate) {
      cancelStatusUpdate.addEventListener('click', () => ModalManager.close('status-modal'));
    }

    const statusForm = document.getElementById('status-form');
    if (statusForm) {
      statusForm.addEventListener('submit', Orders.handleStatusUpdate);
    }
  },

  // Load orders
  loadOrders: (status = 'all') => {
    const currentUser = AuthManager.getCurrentUser();
    if (!currentUser) return;

    let orders = [];
    if (currentUser.role === 'buyer') {
      orders = OrderManager.getOrdersByBuyer(currentUser.id);
    } else if (currentUser.role === 'seller') {
      orders = OrderManager.getOrdersBySeller(currentUser.id);
    }

    // Filter by status
    if (status !== 'all') {
      orders = orders.filter(order => order.status === status);
    }

    Orders.renderOrders(orders);
  },

  // Render orders
  renderOrders: (orders) => {
    const tbody = document.getElementById('orders-tbody');
    const noOrders = document.getElementById('no-orders');
    
    if (!tbody) return;

    if (orders.length === 0) {
      tbody.innerHTML = '';
      if (noOrders) noOrders.style.display = 'block';
      return;
    }

    if (noOrders) noOrders.style.display = 'none';

    tbody.innerHTML = orders.map(order => {
      const product = ProductManager.getProductById(order.productId);
      const productName = product ? product.name : 'Unknown Product';
      
      let otherParty = '';
      if (AuthManager.getCurrentUser().role === 'buyer') {
        const seller = Auth.getUserById(order.sellerId);
        otherParty = seller ? seller.companyName : 'Unknown Seller';
      } else {
        const buyer = Auth.getUserById(order.buyerId);
        otherParty = buyer ? buyer.companyName : 'Unknown Buyer';
      }

      return `
        <tr>
          <td>#${order.id}</td>
          <td>${Utils.sanitizeHTML(productName)}</td>
          <td>${Utils.sanitizeHTML(otherParty)}</td>
          <td>${order.quantity}</td>
          <td>${Utils.formatCurrency(order.totalPrice, order.currency)}</td>
          <td><span class="status-badge ${order.status}">${order.status}</span></td>
          <td>${Utils.formatDate(order.createdAt)}</td>
          <td>
            <button class="btn btn-outline btn-sm" onclick="Orders.viewOrderDetails('${order.id}')">
              View
            </button>
            ${AuthManager.isSeller() ? `
              <button class="btn btn-primary btn-sm" onclick="Orders.updateOrderStatus('${order.id}')">
                Update
              </button>
            ` : ''}
          </td>
        </tr>
      `;
    }).join('');
  },

  // Handle filter tab
  handleFilterTab: (tab) => {
    // Remove active class from all tabs
    document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
    
    // Add active class to clicked tab
    tab.classList.add('active');
    
    // Load orders with new filter
    const status = tab.getAttribute('data-status');
    Orders.loadOrders(status);
  },

  // Handle search
  handleSearch: (e) => {
    const searchInput = document.getElementById('order-search');
    const query = searchInput ? searchInput.value.toLowerCase() : '';
    
    const currentUser = AuthManager.getCurrentUser();
    if (!currentUser) return;

    let orders = [];
    if (currentUser.role === 'buyer') {
      orders = OrderManager.getOrdersByBuyer(currentUser.id);
    } else if (currentUser.role === 'seller') {
      orders = OrderManager.getOrdersBySeller(currentUser.id);
    }

    // Filter by search query
    if (query) {
      orders = orders.filter(order => {
        const product = ProductManager.getProductById(order.productId);
        const productName = product ? product.name.toLowerCase() : '';
        return productName.includes(query) || order.id.toLowerCase().includes(query);
      });
    }

    Orders.renderOrders(orders);
  },

  // View order details
  viewOrderDetails: (orderId) => {
    const order = OrderManager.getOrderById(orderId);
    if (!order) return;

    const product = ProductManager.getProductById(order.productId);
    const buyer = Auth.getUserById(order.buyerId);
    const seller = Auth.getUserById(order.sellerId);

    const orderDetails = document.getElementById('order-details');
    if (orderDetails) {
      orderDetails.innerHTML = `
        <div class="order-details-content">
          <div class="order-header">
            <h3>Order #${order.id}</h3>
            <span class="status-badge ${order.status}">${order.status}</span>
          </div>
          
          <div class="order-info">
            <div class="info-section">
              <h4>Product Information</h4>
              <p><strong>Product:</strong> ${product ? product.name : 'Unknown Product'}</p>
              <p><strong>Quantity:</strong> ${order.quantity}</p>
              <p><strong>Unit Price:</strong> ${Utils.formatCurrency(order.unitPrice, order.currency)}</p>
              <p><strong>Total Price:</strong> ${Utils.formatCurrency(order.totalPrice, order.currency)}</p>
            </div>
            
            <div class="info-section">
              <h4>Order Details</h4>
              <p><strong>Order Date:</strong> ${Utils.formatDateTime(order.createdAt)}</p>
              <p><strong>Last Updated:</strong> ${Utils.formatDateTime(order.updatedAt)}</p>
              <p><strong>Payment Method:</strong> ${order.paymentMethod || 'Not specified'}</p>
              ${order.trackingNumber ? `<p><strong>Tracking Number:</strong> ${order.trackingNumber}</p>` : ''}
            </div>
            
            <div class="info-section">
              <h4>Parties</h4>
              <p><strong>Buyer:</strong> ${buyer ? buyer.companyName : 'Unknown Buyer'}</p>
              <p><strong>Seller:</strong> ${seller ? seller.companyName : 'Unknown Seller'}</p>
            </div>
            
            ${order.notes ? `
              <div class="info-section">
                <h4>Notes</h4>
                <p>${Utils.sanitizeHTML(order.notes)}</p>
              </div>
            ` : ''}
          </div>
        </div>
      `;
    }

    ModalManager.open('order-modal');
  },

  // Update order status
  updateOrderStatus: (orderId) => {
    const order = OrderManager.getOrderById(orderId);
    if (!order) return;

    // Store order ID for form submission
    document.getElementById('status-form').setAttribute('data-order-id', orderId);
    
    // Set current status
    const statusSelect = document.getElementById('new-status');
    if (statusSelect) {
      statusSelect.value = order.status;
    }

    ModalManager.open('status-modal');
  },

  // Handle status update
  handleStatusUpdate: (e) => {
    e.preventDefault();
    
    const form = e.target;
    const orderId = form.getAttribute('data-order-id');
    const formData = FormManager.getFormData(form);
    
    if (!orderId) return;

    try {
      const updatedOrder = OrderManager.updateOrderStatus(orderId, formData.status, formData.notes);
      
      if (updatedOrder) {
        Utils.showNotification('Order status updated successfully!', 'success');
        ModalManager.close('status-modal');
        Orders.loadOrders(); // Refresh orders list
      } else {
        Utils.showNotification('Failed to update order status', 'error');
      }
    } catch (error) {
      console.error('Status update error:', error);
      Utils.showNotification('Failed to update order status', 'error');
    }
  }
};

// Initialize orders when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  if (window.location.pathname.includes('orders.html')) {
    Orders.init();
  }
});

// Export for global access
window.Orders = Orders;
