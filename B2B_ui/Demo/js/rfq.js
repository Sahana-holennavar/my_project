// B2B Marketplace - RFQ Page Module

const RFQ = {
  // Initialize RFQ page
  init: () => {
    RFQ.loadRFQHistory();
    RFQ.bindEvents();
  },

  // Bind events
  bindEvents: () => {
    // RFQ form submission
    const rfqForm = document.getElementById('rfq-form');
    if (rfqForm) {
      rfqForm.addEventListener('submit', RFQ.handleSubmit);
    }
  },

  // Load RFQ history
  loadRFQHistory: () => {
    const currentUser = AuthManager.getCurrentUser();
    if (!currentUser) return;

    const rfqs = RFQManager.getRFQsByBuyer(currentUser.id);
    const rfqList = document.getElementById('rfq-list');
    
    if (!rfqList) return;

    if (rfqs.length === 0) {
      rfqList.innerHTML = '<p class="text-gray-500">No RFQs found</p>';
      return;
    }

    rfqList.innerHTML = rfqs.slice(0, 5).map(rfq => `
      <div class="rfq-item">
        <div class="rfq-header">
          <h4>${Utils.sanitizeHTML(rfq.email)}</h4>
          <span class="status-badge ${rfq.status}">${rfq.status}</span>
        </div>
        <div class="rfq-details">
          <p><strong>PDF:</strong> ${rfq.pdfName || 'Document.pdf'}</p>
          <p><strong>Created:</strong> ${Utils.formatDate(rfq.createdAt)}</p>
        </div>
        <div class="rfq-actions">
          <button class="btn btn-outline btn-sm" onclick="RFQ.viewRFQDetails('${rfq.id}')">
            View Details
          </button>
        </div>
      </div>
    `).join('');
  },

  // Handle form submission
  handleSubmit: (e) => {
    e.preventDefault();
    
    const form = e.target;
    const formData = FormManager.getFormData(form);
    
    // Validate required fields
    if (!formData.email || !formData.pdf) {
      Utils.showNotification('Please fill in all required fields', 'error');
      return;
    }

    const currentUser = AuthManager.getCurrentUser();
    if (!currentUser) {
      Utils.showNotification('Please log in to create an RFQ', 'error');
      return;
    }

    const rfqData = {
      buyerId: currentUser.id,
      email: formData.email,
      pdfName: formData.pdf.name,
      status: 'pending'
    };

    try {
      RFQManager.createRFQ(rfqData);
      Utils.showNotification('RFQ submitted successfully!', 'success');
      
      // Reset form
      form.reset();
      
      // Reload RFQ history
      RFQ.loadRFQHistory();
    } catch (error) {
      console.error('RFQ submission error:', error);
      Utils.showNotification('Failed to submit RFQ. Please try again.', 'error');
    }
  },

  // View RFQ details
  viewRFQDetails: (rfqId) => {
    const rfq = RFQManager.getRFQById(rfqId);
    if (!rfq) return;

    // Create a simple modal or redirect to a details page
    const details = `
      <div class="rfq-details-modal">
        <h3>RFQ Details</h3>
        <p><strong>Email:</strong> ${Utils.sanitizeHTML(rfq.email)}</p>
        <p><strong>PDF:</strong> ${rfq.pdfName || 'Document.pdf'}</p>
        <p><strong>Status:</strong> ${rfq.status}</p>
        <p><strong>Created:</strong> ${Utils.formatDateTime(rfq.createdAt)}</p>
      </div>
    `;

    // For now, just show an alert with the details
    alert(details.replace(/<[^>]*>/g, '')); // Remove HTML tags for alert
  }
};

// Initialize RFQ when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  if (window.location.pathname.includes('rfq.html')) {
    RFQ.init();
  }
});

// Export for global access
window.RFQ = RFQ;
