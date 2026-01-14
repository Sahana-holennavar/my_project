// B2B Marketplace - Posts Page Module

const Posts = {
  // Initialize posts page
  init: () => {
    Posts.loadPosts();
    Posts.bindEvents();
  },

  // Bind events
  bindEvents: () => {
    // Filter tabs
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('filter-tab')) {
        Posts.handleFilterTab(e.target);
      }
    });

    // Search functionality
    const searchInput = document.getElementById('posts-search');
    if (searchInput) {
      searchInput.addEventListener('input', Utils.debounce(Posts.handleSearch, 300));
    }

    const searchBtn = document.getElementById('search-posts');
    if (searchBtn) {
      searchBtn.addEventListener('click', Posts.handleSearch);
    }

    // Create post button
    const createPostBtn = document.getElementById('create-post-btn');
    if (createPostBtn) {
      createPostBtn.addEventListener('click', () => ModalManager.open('create-post-modal'));
    }

    // Create post modal events
    const closeCreatePostModal = document.getElementById('close-create-post-modal');
    if (closeCreatePostModal) {
      closeCreatePostModal.addEventListener('click', () => ModalManager.close('create-post-modal'));
    }

    const createPostForm = document.getElementById('create-post-form');
    if (createPostForm) {
      createPostForm.addEventListener('submit', Posts.handleCreatePost);
    }

    const savePostDraft = document.getElementById('save-post-draft');
    if (savePostDraft) {
      savePostDraft.addEventListener('click', Posts.saveDraft);
    }

    // Post details modal
    const closePostDetailsModal = document.getElementById('close-post-details-modal');
    if (closePostDetailsModal) {
      closePostDetailsModal.addEventListener('click', () => ModalManager.close('post-details-modal'));
    }
  },

  // Load posts
  loadPosts: (category = 'all') => {
    let posts = PostManager.getAllPosts().filter(post => post.status === 'published');
    
    // Filter by category
    if (category !== 'all') {
      posts = posts.filter(post => post.category === category);
    }

    // Sort by date (newest first)
    posts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    Posts.renderPosts(posts);
  },

  // Render posts
  renderPosts: (posts) => {
    const postsGrid = document.getElementById('posts-grid');
    const noPosts = document.getElementById('no-posts');
    
    if (!postsGrid) return;

    if (posts.length === 0) {
      postsGrid.innerHTML = '';
      if (noPosts) noPosts.style.display = 'block';
      return;
    }

    if (noPosts) noPosts.style.display = 'none';

    postsGrid.innerHTML = posts.map(post => {
      const author = Auth.getUserById(post.authorId);
      const authorName = author ? author.companyName : 'Unknown Author';
      
      return `
        <div class="post-card" data-post-id="${post.id}">
          <div class="post-image">
            <img src="${post.image || 'assets/images/placeholder.svg'}" 
                 alt="${post.title}" 
                 onerror="this.src='assets/images/placeholder.svg'">
          </div>
          <div class="post-content">
            <div class="post-meta">
              <span class="post-category">${post.category}</span>
              <span class="post-date">${Utils.formatDate(post.createdAt)}</span>
            </div>
            <h3 class="post-title">${Utils.sanitizeHTML(post.title)}</h3>
            <p class="post-excerpt">${Utils.sanitizeHTML(post.excerpt)}</p>
            <div class="post-footer">
              <span class="post-author">By ${Utils.sanitizeHTML(authorName)}</span>
              <div class="post-stats">
                <span class="post-views">👁 ${post.views || 0}</span>
                <span class="post-likes">❤ ${post.likes || 0}</span>
              </div>
            </div>
            <div class="post-actions">
              <button class="btn btn-primary btn-sm" onclick="Posts.viewPostDetails('${post.id}')">
                Read More
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  },

  // Handle filter tab
  handleFilterTab: (tab) => {
    // Remove active class from all tabs
    document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
    
    // Add active class to clicked tab
    tab.classList.add('active');
    
    // Load posts with new filter
    const category = tab.getAttribute('data-category');
    Posts.loadPosts(category);
  },

  // Handle search
  handleSearch: (e) => {
    const searchInput = document.getElementById('posts-search');
    const query = searchInput ? searchInput.value.toLowerCase() : '';
    
    let posts = PostManager.getAllPosts().filter(post => post.status === 'published');
    
    // Filter by search query
    if (query) {
      posts = PostManager.searchPosts(query);
    }

    Posts.renderPosts(posts);
  },

  // View post details
  viewPostDetails: (postId) => {
    const post = PostManager.getPostById(postId);
    if (!post) return;

    const author = Auth.getUserById(post.authorId);
    const authorName = author ? author.companyName : 'Unknown Author';

    const postDetailsContent = document.getElementById('post-details-content');
    if (postDetailsContent) {
      postDetailsContent.innerHTML = `
        <div class="post-details">
          <div class="post-header">
            <div class="post-meta">
              <span class="post-category">${post.category}</span>
              <span class="post-date">${Utils.formatDate(post.createdAt)}</span>
            </div>
            <h1 class="post-title">${Utils.sanitizeHTML(post.title)}</h1>
            <div class="post-author-info">
              <span>By ${Utils.sanitizeHTML(authorName)}</span>
              <div class="post-stats">
                <span class="post-views">👁 ${post.views || 0} views</span>
                <span class="post-likes">❤ ${post.likes || 0} likes</span>
              </div>
            </div>
          </div>
          
          ${post.image ? `
            <div class="post-image-large">
              <img src="${post.image}" alt="${post.title}" onerror="this.src='assets/images/placeholder.svg'">
            </div>
          ` : ''}
          
          <div class="post-content-full">
            ${post.content.split('\n').map(paragraph => 
              paragraph.trim() ? `<p>${Utils.sanitizeHTML(paragraph)}</p>` : ''
            ).join('')}
          </div>
          
          ${post.tags && post.tags.length > 0 ? `
            <div class="post-tags">
              <h4>Tags:</h4>
              ${post.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
            </div>
          ` : ''}
        </div>
      `;
    }

    ModalManager.open('post-details-modal');
  },

  // Handle create post
  handleCreatePost: (e) => {
    e.preventDefault();
    
    const form = e.target;
    const formData = FormManager.getFormData(form);
    
    // Validate required fields
    if (!formData.title || !formData.content || !formData.category) {
      Utils.showNotification('Please fill in all required fields', 'error');
      return;
    }

    const currentUser = AuthManager.getCurrentUser();
    if (!currentUser) {
      Utils.showNotification('Please log in to create a post', 'error');
      return;
    }

    const postData = {
      authorId: currentUser.id,
      title: formData.title,
      excerpt: formData.excerpt || '',
      content: formData.content,
      category: formData.category,
      tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()) : [],
      featured: formData.featured === 'on',
      image: formData.image || '',
      status: 'published'
    };

    try {
      PostManager.createPost(postData);
      Utils.showNotification('Post published successfully!', 'success');
      
      // Reset form
      form.reset();
      ModalManager.close('create-post-modal');
      
      // Reload posts
      Posts.loadPosts();
    } catch (error) {
      console.error('Post creation error:', error);
      Utils.showNotification('Failed to create post. Please try again.', 'error');
    }
  },

  // Save draft
  saveDraft: () => {
    const form = document.getElementById('create-post-form');
    const formData = FormManager.getFormData(form);
    
    // Save to localStorage as draft
    const drafts = JSON.parse(localStorage.getItem('post_drafts') || '[]');
    const draft = {
      id: Utils.generateId(),
      ...formData,
      status: 'draft',
      createdAt: new Date().toISOString()
    };
    
    drafts.push(draft);
    localStorage.setItem('post_drafts', JSON.stringify(drafts));
    
    Utils.showNotification('Post saved as draft', 'success');
  }
};

// Initialize posts when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  if (window.location.pathname.includes('posts.html')) {
    Posts.init();
  }
});

// Export for global access
window.Posts = Posts;
