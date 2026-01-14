// B2B Marketplace - Data Management Module

// Product Manager
const ProductManager = {
  // Get all products
  getAllProducts: () => {
    return DataManager.get(STORAGE_KEYS.PRODUCTS) || [];
  },

  // Get product by ID
  getProductById: (id) => {
    const products = ProductManager.getAllProducts();
    return products.find(product => product.id === id);
  },

  // Get products by seller
  getProductsBySeller: (sellerId) => {
    const products = ProductManager.getAllProducts();
    return products.filter(product => product.sellerId === sellerId);
  },

  // Get products by category
  getProductsByCategory: (category) => {
    const products = ProductManager.getAllProducts();
    return products.filter(product => product.category === category);
  },

  // Search products
  searchProducts: (query, filters = {}) => {
    let products = ProductManager.getAllProducts();
    
    // Text search
    if (query) {
      const lowercaseQuery = query.toLowerCase();
      products = products.filter(product => 
        product.name.toLowerCase().includes(lowercaseQuery) ||
        product.description.toLowerCase().includes(lowercaseQuery) ||
        product.category.toLowerCase().includes(lowercaseQuery)
      );
    }
    
    // Apply filters
    if (filters.category) {
      products = products.filter(product => product.category === filters.category);
    }
    
    if (filters.sellerId) {
      products = products.filter(product => product.sellerId === filters.sellerId);
    }
    
    if (filters.status) {
      products = products.filter(product => product.status === filters.status);
    }
    
    return products;
  },

  // Add new product
  addProduct: (productData) => {
    const products = ProductManager.getAllProducts();
    
    const newProduct = {
      id: Utils.generateId(),
      ...productData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    products.push(newProduct);
    DataManager.set(STORAGE_KEYS.PRODUCTS, products);
    
    return newProduct;
  },

  // Update product
  updateProduct: (id, updates) => {
    const products = ProductManager.getAllProducts();
    const productIndex = products.findIndex(product => product.id === id);
    
    if (productIndex !== -1) {
      products[productIndex] = {
        ...products[productIndex],
        ...updates,
        updatedAt: new Date().toISOString()
      };
      
      DataManager.set(STORAGE_KEYS.PRODUCTS, products);
      return products[productIndex];
    }
    
    return null;
  },

  // Delete product
  deleteProduct: (id) => {
    const products = ProductManager.getAllProducts();
    const filteredProducts = products.filter(product => product.id !== id);
    
    if (filteredProducts.length < products.length) {
      DataManager.set(STORAGE_KEYS.PRODUCTS, filteredProducts);
      return true;
    }
    
    return false;
  },

  // Get featured products
  getFeaturedProducts: () => {
    const products = ProductManager.getAllProducts();
    return products.filter(product => product.featured && product.status === 'active');
  },

  // Get related products
  getRelatedProducts: (productId, limit = 4) => {
    const product = ProductManager.getProductById(productId);
    if (!product) return [];
    
    const products = ProductManager.getAllProducts();
    return products
      .filter(p => p.id !== productId && p.category === product.category && p.status === 'active')
      .slice(0, limit);
  }
};

// Order Manager
const OrderManager = {
  // Get all orders
  getAllOrders: () => {
    return DataManager.get(STORAGE_KEYS.ORDERS) || [];
  },

  // Get order by ID
  getOrderById: (id) => {
    const orders = OrderManager.getAllOrders();
    return orders.find(order => order.id === id);
  },

  // Get orders by buyer
  getOrdersByBuyer: (buyerId) => {
    const orders = OrderManager.getAllOrders();
    return orders.filter(order => order.buyerId === buyerId);
  },

  // Get orders by seller
  getOrdersBySeller: (sellerId) => {
    const orders = OrderManager.getAllOrders();
    return orders.filter(order => order.sellerId === sellerId);
  },

  // Get orders by status
  getOrdersByStatus: (status) => {
    const orders = OrderManager.getAllOrders();
    return orders.filter(order => order.status === status);
  },

  // Create new order
  createOrder: (orderData) => {
    const orders = OrderManager.getAllOrders();
    
    const newOrder = {
      id: Utils.generateId(),
      ...orderData,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    orders.push(newOrder);
    DataManager.set(STORAGE_KEYS.ORDERS, orders);
    
    return newOrder;
  },

  // Update order status
  updateOrderStatus: (id, status, notes = '') => {
    const orders = OrderManager.getAllOrders();
    const orderIndex = orders.findIndex(order => order.id === id);
    
    if (orderIndex !== -1) {
      orders[orderIndex] = {
        ...orders[orderIndex],
        status,
        notes,
        updatedAt: new Date().toISOString()
      };
      
      DataManager.set(STORAGE_KEYS.ORDERS, orders);
      return orders[orderIndex];
    }
    
    return null;
  },

  // Delete order
  deleteOrder: (id) => {
    const orders = OrderManager.getAllOrders();
    const filteredOrders = orders.filter(order => order.id !== id);
    
    if (filteredOrders.length < orders.length) {
      DataManager.set(STORAGE_KEYS.ORDERS, filteredOrders);
      return true;
    }
    
    return false;
  }
};

// RFQ Manager
const RFQManager = {
  // Get all RFQs
  getAllRFQs: () => {
    return DataManager.get(STORAGE_KEYS.RFQS) || [];
  },

  // Get RFQ by ID
  getRFQById: (id) => {
    const rfqs = RFQManager.getAllRFQs();
    return rfqs.find(rfq => rfq.id === id);
  },

  // Get RFQs by buyer
  getRFQsByBuyer: (buyerId) => {
    const rfqs = RFQManager.getAllRFQs();
    return rfqs.filter(rfq => rfq.buyerId === buyerId);
  },

  // Get RFQs by seller
  getRFQsBySeller: (sellerId) => {
    const rfqs = RFQManager.getAllRFQs();
    return rfqs.filter(rfq => rfq.sellerIds && rfq.sellerIds.includes(sellerId));
  },

  // Create new RFQ
  createRFQ: (rfqData) => {
    const rfqs = RFQManager.getAllRFQs();
    
    const newRFQ = {
      id: Utils.generateId(),
      ...rfqData,
      status: 'open',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    rfqs.push(newRFQ);
    DataManager.set(STORAGE_KEYS.RFQS, rfqs);
    
    return newRFQ;
  },

  // Update RFQ status
  updateRFQStatus: (id, status) => {
    const rfqs = RFQManager.getAllRFQs();
    const rfqIndex = rfqs.findIndex(rfq => rfq.id === id);
    
    if (rfqIndex !== -1) {
      rfqs[rfqIndex] = {
        ...rfqs[rfqIndex],
        status,
        updatedAt: new Date().toISOString()
      };
      
      DataManager.set(STORAGE_KEYS.RFQS, rfqs);
      return rfqs[rfqIndex];
    }
    
    return null;
  }
};

// Chat Manager
const ChatManager = {
  // Get all chats
  getAllChats: () => {
    return DataManager.get(STORAGE_KEYS.CHATS) || [];
  },

  // Get chat by ID
  getChatById: (id) => {
    const chats = ChatManager.getAllChats();
    return chats.find(chat => chat.id === id);
  },

  // Get chats by user
  getChatsByUser: (userId) => {
    const chats = ChatManager.getAllChats();
    return chats.filter(chat => 
      chat.participants.includes(userId)
    );
  },

  // Get or create chat between users
  getOrCreateChat: (user1Id, user2Id) => {
    const chats = ChatManager.getAllChats();
    let chat = chats.find(chat => 
      chat.participants.includes(user1Id) && 
      chat.participants.includes(user2Id) &&
      chat.participants.length === 2
    );
    
    if (!chat) {
      chat = {
        id: Utils.generateId(),
        participants: [user1Id, user2Id],
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      chats.push(chat);
      DataManager.set(STORAGE_KEYS.CHATS, chats);
    }
    
    return chat;
  },

  // Add message to chat
  addMessage: (chatId, messageData) => {
    const chats = ChatManager.getAllChats();
    const chatIndex = chats.findIndex(chat => chat.id === chatId);
    
    if (chatIndex !== -1) {
      const message = {
        id: Utils.generateId(),
        ...messageData,
        timestamp: new Date().toISOString()
      };
      
      chats[chatIndex].messages.push(message);
      chats[chatIndex].updatedAt = new Date().toISOString();
      
      DataManager.set(STORAGE_KEYS.CHATS, chats);
      return message;
    }
    
    return null;
  }
};

// Ticket Manager
const TicketManager = {
  // Get all tickets
  getAllTickets: () => {
    return DataManager.get(STORAGE_KEYS.TICKETS) || [];
  },

  // Get ticket by ID
  getTicketById: (id) => {
    const tickets = TicketManager.getAllTickets();
    return tickets.find(ticket => ticket.id === id);
  },

  // Get tickets by user
  getTicketsByUser: (userId) => {
    const tickets = TicketManager.getAllTickets();
    return tickets.filter(ticket => ticket.userId === userId);
  },

  // Get tickets by status
  getTicketsByStatus: (status) => {
    const tickets = TicketManager.getAllTickets();
    return tickets.filter(ticket => ticket.status === status);
  },

  // Create new ticket
  createTicket: (ticketData) => {
    const tickets = TicketManager.getAllTickets();
    
    const newTicket = {
      id: Utils.generateId(),
      ...ticketData,
      status: 'open',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    tickets.push(newTicket);
    DataManager.set(STORAGE_KEYS.TICKETS, tickets);
    
    return newTicket;
  },

  // Update ticket status
  updateTicketStatus: (id, status, response = '') => {
    const tickets = TicketManager.getAllTickets();
    const ticketIndex = tickets.findIndex(ticket => ticket.id === id);
    
    if (ticketIndex !== -1) {
      tickets[ticketIndex] = {
        ...tickets[ticketIndex],
        status,
        response,
        updatedAt: new Date().toISOString()
      };
      
      DataManager.set(STORAGE_KEYS.TICKETS, tickets);
      return tickets[ticketIndex];
    }
    
    return null;
  }
};

// Post Manager
const PostManager = {
  // Get all posts
  getAllPosts: () => {
    return DataManager.get(STORAGE_KEYS.POSTS) || [];
  },

  // Get post by ID
  getPostById: (id) => {
    const posts = PostManager.getAllPosts();
    return posts.find(post => post.id === id);
  },

  // Get posts by category
  getPostsByCategory: (category) => {
    const posts = PostManager.getAllPosts();
    return posts.filter(post => post.category === category);
  },

  // Get featured posts
  getFeaturedPosts: () => {
    const posts = PostManager.getAllPosts();
    return posts.filter(post => post.featured && post.status === 'published');
  },

  // Search posts
  searchPosts: (query) => {
    const posts = PostManager.getAllPosts();
    const lowercaseQuery = query.toLowerCase();
    
    return posts.filter(post => 
      post.title.toLowerCase().includes(lowercaseQuery) ||
      post.content.toLowerCase().includes(lowercaseQuery) ||
      post.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery))
    );
  },

  // Create new post
  createPost: (postData) => {
    const posts = PostManager.getAllPosts();
    
    const newPost = {
      id: Utils.generateId(),
      ...postData,
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    posts.push(newPost);
    DataManager.set(STORAGE_KEYS.POSTS, posts);
    
    return newPost;
  },

  // Update post
  updatePost: (id, updates) => {
    const posts = PostManager.getAllPosts();
    const postIndex = posts.findIndex(post => post.id === id);
    
    if (postIndex !== -1) {
      posts[postIndex] = {
        ...posts[postIndex],
        ...updates,
        updatedAt: new Date().toISOString()
      };
      
      DataManager.set(STORAGE_KEYS.POSTS, posts);
      return posts[postIndex];
    }
    
    return null;
  }
};

// Initialize data with sample data
const DataInitializer = {
  // Initialize sample data
  init: () => {
    DataInitializer.createSampleProducts();
    DataInitializer.createSampleOrders();
    DataInitializer.createSampleRFQs();
    DataInitializer.createSamplePosts();
  },

  // Create sample products
  createSampleProducts: () => {
    const products = ProductManager.getAllProducts();
    if (products.length > 0) return; // Already initialized
    
    const sampleProducts = [
      {
        id: 'product-1',
        sellerId: 'user-2',
        name: 'Industrial Conveyor Belt',
        description: 'High-quality industrial conveyor belt suitable for manufacturing and logistics operations.',
        price: 2500.00,
        currency: 'USD',
        category: 'machinery',
        subcategory: 'conveyors',
        stock: 50,
        minOrder: 1,
        unit: 'meter',
        status: 'active',
        featured: true,
        images: ['assets/images/conveyor-belt.jpg'],
        specifications: {
          'Material': 'Rubber',
          'Width': '500mm',
          'Length': '10m',
          'Load Capacity': '100kg/m'
        },
        weight: 15.5,
        dimensions: '500 x 10000 x 20',
        shippingInfo: 'Free shipping on orders over $1000'
      },
      {
        id: 'product-2',
        sellerId: 'user-2',
        name: 'Steel Rods - Grade A',
        description: 'Premium quality steel rods for construction and manufacturing applications.',
        price: 45.00,
        currency: 'USD',
        category: 'materials',
        subcategory: 'steel',
        stock: 1000,
        minOrder: 10,
        unit: 'piece',
        status: 'active',
        featured: false,
        images: ['assets/images/steel-rods.jpg'],
        specifications: {
          'Grade': 'A',
          'Diameter': '12mm',
          'Length': '6m',
          'Tensile Strength': '400 MPa'
        },
        weight: 8.5,
        dimensions: '12 x 6000 x 12',
        shippingInfo: 'Standard shipping 3-5 business days'
      },
      {
        id: 'product-3',
        sellerId: 'user-2',
        name: 'LED Industrial Lighting',
        description: 'Energy-efficient LED lighting solution for industrial and commercial spaces.',
        price: 125.00,
        currency: 'USD',
        category: 'electronics',
        subcategory: 'lighting',
        stock: 200,
        minOrder: 5,
        unit: 'piece',
        status: 'active',
        featured: true,
        images: ['assets/images/led-lighting.jpg'],
        specifications: {
          'Power': '50W',
          'Lumens': '5000lm',
          'Color Temperature': '4000K',
          'Lifespan': '50000 hours'
        },
        weight: 2.3,
        dimensions: '600 x 300 x 80',
        shippingInfo: 'Express shipping available'
      }
    ];
    
    DataManager.set(STORAGE_KEYS.PRODUCTS, sampleProducts);
  },

  // Create sample orders
  createSampleOrders: () => {
    const orders = OrderManager.getAllOrders();
    if (orders.length > 0) return; // Already initialized
    
    const sampleOrders = [
      {
        id: 'order-1',
        buyerId: 'user-1',
        sellerId: 'user-2',
        productId: 'product-1',
        quantity: 2,
        unitPrice: 2500.00,
        totalPrice: 5000.00,
        currency: 'USD',
        status: 'confirmed',
        notes: 'Urgent delivery required',
        createdAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
        updatedAt: new Date(Date.now() - 86400000).toISOString()
      },
      {
        id: 'order-2',
        buyerId: 'user-1',
        sellerId: 'user-2',
        productId: 'product-2',
        quantity: 50,
        unitPrice: 45.00,
        totalPrice: 2250.00,
        currency: 'USD',
        status: 'shipped',
        notes: '',
        createdAt: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
        updatedAt: new Date(Date.now() - 86400000).toISOString()
      }
    ];
    
    DataManager.set(STORAGE_KEYS.ORDERS, sampleOrders);
  },

  // Create sample RFQs
  createSampleRFQs: () => {
    const rfqs = RFQManager.getAllRFQs();
    if (rfqs.length > 0) return; // Already initialized
    
    const sampleRFQs = [
      {
        id: 'rfq-1',
        buyerId: 'user-1',
        sellerIds: ['user-2'],
        productName: 'Custom Steel Fabrication',
        description: 'Need custom steel fabrication for construction project',
        category: 'materials',
        quantity: 100,
        specifications: 'Grade A steel, 10mm thickness',
        minBudget: 5000,
        maxBudget: 8000,
        currency: 'USD',
        deadline: new Date(Date.now() + 2592000000).toISOString(), // 30 days from now
        deliveryLocation: 'New York, NY',
        status: 'open',
        message: 'Please provide detailed quote with delivery timeline',
        createdAt: new Date(Date.now() - 43200000).toISOString(), // 12 hours ago
        updatedAt: new Date(Date.now() - 43200000).toISOString()
      }
    ];
    
    DataManager.set(STORAGE_KEYS.RFQS, sampleRFQs);
  },

  // Create sample posts
  createSamplePosts: () => {
    const posts = PostManager.getAllPosts();
    if (posts.length > 0) return; // Already initialized
    
    const samplePosts = [
      {
        id: 'post-1',
        authorId: 'user-2',
        title: 'Industrial Automation Trends 2024',
        excerpt: 'Discover the latest trends in industrial automation and how they can benefit your business.',
        content: 'Industrial automation continues to evolve rapidly, with new technologies emerging that promise to revolutionize manufacturing processes...',
        category: 'insights',
        tags: ['automation', 'manufacturing', 'technology'],
        featured: true,
        status: 'published',
        image: 'assets/images/automation-trends.jpg',
        createdAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
        updatedAt: new Date(Date.now() - 86400000).toISOString()
      },
      {
        id: 'post-2',
        authorId: 'user-2',
        title: 'New Product Launch: Advanced Conveyor Systems',
        excerpt: 'We are excited to announce our new line of advanced conveyor systems with enhanced efficiency.',
        content: 'Our engineering team has been working tirelessly to develop the next generation of conveyor systems...',
        category: 'announcements',
        tags: ['product-launch', 'conveyors', 'innovation'],
        featured: false,
        status: 'published',
        image: 'assets/images/conveyor-systems.jpg',
        createdAt: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
        updatedAt: new Date(Date.now() - 172800000).toISOString()
      }
    ];
    
    DataManager.set(STORAGE_KEYS.POSTS, samplePosts);
  }
};

// Initialize data when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  DataInitializer.init();
});

// Export for use in other modules
window.ProductManager = ProductManager;
window.OrderManager = OrderManager;
window.RFQManager = RFQManager;
window.ChatManager = ChatManager;
window.TicketManager = TicketManager;
window.PostManager = PostManager;
