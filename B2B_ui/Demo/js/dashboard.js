// B2B Marketplace - Dashboard Page Module

const Dashboard = {
  // Initialize dashboard
  init: () => {
    Dashboard.loadUserData();
    Dashboard.bindEvents();
  },

  // Bind events
  bindEvents: () => {
    // Quick action buttons
    document.addEventListener('click', (e) => {
      if (e.target.closest('.action-btn')) {
        const href = e.target.closest('.action-btn').getAttribute('href');
        if (href) {
          e.preventDefault();
          window.location.href = href;
        }
      }
    });
  },

  // Load user data
  loadUserData: () => {
    const currentUser = AuthManager.getCurrentUser();
    if (!currentUser) {
      window.location.href = 'index.html';
      return;
    }
    
    // Update user name
    const userNameElement = document.getElementById('user-name');
    if (userNameElement) {
      userNameElement.textContent = currentUser.companyName || currentUser.email;
    }
    
    // Show appropriate dashboard based on role
    if (currentUser.role === 'buyer') {
      Dashboard.showBuyerDashboard();
      Dashboard.loadBuyerData(currentUser.id);
    } else if (currentUser.role === 'seller') {
      Dashboard.showSellerDashboard();
      Dashboard.loadSellerData(currentUser.id);
      Dashboard.loadUserDetails(currentUser);
    }
  },

  // Load user registration details
  loadUserDetails: (user) => {
    // Show professional profile for sellers
    if (user.role === 'seller') {
      Dashboard.showProfessionalProfile();
      Dashboard.loadProfessionalData(user);
    }
  },

  // Update detail element
  updateDetail: (elementId, value) => {
    const element = document.getElementById(elementId);
    if (element) {
      element.textContent = value;
    }
  },

  // Show professional profile for sellers
  showProfessionalProfile: () => {
    const professionalProfile = document.getElementById('professional-profile');
    if (professionalProfile) {
      professionalProfile.style.display = 'block';
    }
  },

  // Load professional data
  loadProfessionalData: (user) => {
    // Load Basic Information
    Dashboard.loadBasicInfoSection(user);
    
    // Load Contact Information
    Dashboard.loadContactInfoSection(user);
    
    // Load Business Information
    Dashboard.loadBusinessInfoSection(user);
    
    // Load About section
    Dashboard.loadAboutSection(user);
    
    // Load Experience
    Dashboard.loadExperienceSection(user);
    
    // Load Education
    Dashboard.loadEducationSection(user);
    
    // Load Skills
    Dashboard.loadSkillsSection(user);
    
    // Load Certifications
    Dashboard.loadCertificationsSection(user);
    
    // Load Posts
    Dashboard.loadPostsSection(user);
  },

  // Load Basic Information section
  loadBasicInfoSection: (user) => {
    Dashboard.updateInfoValue('basic-company-name', user.companyName || 'Not provided');
    Dashboard.updateInfoValue('basic-email', user.email || 'Not provided');
    Dashboard.updateInfoValue('basic-role', user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Not provided');
    Dashboard.updateInfoValue('basic-created-at', user.createdAt ? Utils.formatDate(user.createdAt) : 'Not provided');
  },

  // Load Contact Information section
  loadContactInfoSection: (user) => {
    Dashboard.updateInfoValue('contact-name', user.contactInfo?.name || 'Not provided');
    Dashboard.updateInfoValue('contact-phone', user.contactInfo?.phone || 'Not provided');
    Dashboard.updateInfoValue('contact-address', user.contactInfo?.address || 'Not provided');
    Dashboard.updateInfoValue('contact-city', user.contactInfo?.city || 'Not provided');
  },

  // Load Business Information section
  loadBusinessInfoSection: (user) => {
    Dashboard.updateInfoValue('business-license', user.businessInfo?.licenseNumber || 'Not provided');
    Dashboard.updateInfoValue('business-tax-id', user.businessInfo?.taxId || 'Not provided');
    Dashboard.updateInfoValue('business-established', user.businessInfo?.establishedYear || 'Not provided');
    Dashboard.updateInfoValue('business-employees', user.businessInfo?.employeeCount || 'Not provided');
  },

  // Update info value helper
  updateInfoValue: (elementId, value) => {
    const element = document.getElementById(elementId);
    if (element) {
      element.textContent = value;
    }
  },

  // Load About section
  loadAboutSection: (user) => {
    const aboutContent = document.getElementById('about-content');
    if (aboutContent) {
      aboutContent.textContent = user.professionalInfo?.about || 'No about information provided yet.';
    }
  },

  // Load Experience section
  loadExperienceSection: (user) => {
    const experienceContent = document.getElementById('experience-content');
    if (experienceContent) {
      const experiences = user.professionalInfo?.experiences || [];
      if (experiences.length === 0) {
        experienceContent.innerHTML = '<div class="empty-state"><p>No experience added yet.</p></div>';
      } else {
        experienceContent.innerHTML = experiences.map(exp => `
          <div class="experience-item">
            <div class="item-header">
              <div>
                <h3 class="item-title">${exp.title}</h3>
                <p class="item-company">${exp.company}</p>
                <p class="item-duration">${exp.startDate} - ${exp.endDate || 'Present'}</p>
              </div>
              <div class="item-actions">
                <button class="btn-outline" onclick="Dashboard.editExperience('${exp.id}')">Edit</button>
                <button class="btn-outline" onclick="Dashboard.deleteExperience('${exp.id}')">Delete</button>
              </div>
            </div>
            <p class="item-description">${exp.description}</p>
          </div>
        `).join('');
      }
    }
  },

  // Load Education section
  loadEducationSection: (user) => {
    const educationContent = document.getElementById('education-content');
    if (educationContent) {
      const educations = user.professionalInfo?.educations || [];
      if (educations.length === 0) {
        educationContent.innerHTML = '<div class="empty-state"><p>No education added yet.</p></div>';
      } else {
        educationContent.innerHTML = educations.map(edu => `
          <div class="education-item">
            <div class="item-header">
              <div>
                <h3 class="item-title">${edu.degree}</h3>
                <p class="item-company">${edu.institution}</p>
                <p class="item-duration">${edu.startDate} - ${edu.endDate || 'Present'}</p>
              </div>
              <div class="item-actions">
                <button class="btn-outline" onclick="Dashboard.editEducation('${edu.id}')">Edit</button>
                <button class="btn-outline" onclick="Dashboard.deleteEducation('${edu.id}')">Delete</button>
              </div>
            </div>
            <p class="item-description">${edu.description || ''}</p>
          </div>
        `).join('');
      }
    }
  },

  // Load Skills section
  loadSkillsSection: (user) => {
    const skillsContent = document.getElementById('skills-content');
    if (skillsContent) {
      const skills = user.professionalInfo?.skills || [];
      if (skills.length === 0) {
        skillsContent.innerHTML = '<div class="empty-state"><p>No skills added yet.</p></div>';
      } else {
        skillsContent.innerHTML = `
          <div class="skills-grid">
            ${skills.map(skill => `
              <div class="skill-tag">
                ${skill}
                <button class="remove-skill" onclick="Dashboard.removeSkill('${skill}')">×</button>
              </div>
            `).join('')}
          </div>
        `;
      }
    }
  },

  // Load Certifications section
  loadCertificationsSection: (user) => {
    const certificationsContent = document.getElementById('certifications-content');
    if (certificationsContent) {
      const certifications = user.professionalInfo?.certifications || [];
      if (certifications.length === 0) {
        certificationsContent.innerHTML = '<div class="empty-state"><p>No certifications added yet.</p></div>';
      } else {
        certificationsContent.innerHTML = certifications.map(cert => `
          <div class="certification-item">
            <div class="item-header">
              <div>
                <h3 class="item-title">${cert.name}</h3>
                <p class="item-company">${cert.issuer}</p>
                <p class="item-duration">Issued: ${cert.issueDate}${cert.expiryDate ? ` - Expires: ${cert.expiryDate}` : ''}</p>
              </div>
              <div class="item-actions">
                <button class="btn-outline" onclick="Dashboard.editCertification('${cert.id}')">Edit</button>
                <button class="btn-outline" onclick="Dashboard.deleteCertification('${cert.id}')">Delete</button>
              </div>
            </div>
            <p class="item-description">${cert.description || ''}</p>
          </div>
        `).join('');
      }
    }
  },

  // Load Posts section
  loadPostsSection: (user) => {
    const postsContent = document.getElementById('posts-content');
    if (postsContent) {
      const posts = DataManager.getPosts().filter(post => post.authorId === user.id);
      if (posts.length === 0) {
        postsContent.innerHTML = '<div class="empty-state"><p>No posts yet. Share your thoughts and updates!</p></div>';
      } else {
        postsContent.innerHTML = posts.slice(0, 5).map(post => `
          <div class="post-item">
            <div class="post-header">
              <span class="post-author">${user.companyName}</span>
              <span class="post-date">${Utils.formatDate(post.createdAt)}</span>
            </div>
            <div class="post-content">${post.content}</div>
            <div class="post-actions">
              <button class="post-action">👍 Like</button>
              <button class="post-action">💬 Comment</button>
              <button class="post-action">🔄 Share</button>
            </div>
          </div>
        `).join('');
      }
    }
  },

  // Edit section functions
  editSection: (section) => {
    if (section === 'basic') {
      Dashboard.showBasicInfoModal();
    } else if (section === 'contact') {
      Dashboard.showContactInfoModal();
    } else if (section === 'business') {
      Dashboard.showBusinessInfoModal();
    } else if (section === 'about') {
      Dashboard.showAboutModal();
    }
  },

  // Add functions for professional sections
  addExperience: () => {
    Dashboard.showExperienceModal();
  },

  addEducation: () => {
    Dashboard.showEducationModal();
  },

  addSkill: () => {
    Dashboard.showSkillModal();
  },

  addCertification: () => {
    Dashboard.showCertificationModal();
  },

  createPost: () => {
    Dashboard.showPostModal();
  },

  // Modal functions
  showBasicInfoModal: () => {
    const currentUser = AuthManager.getCurrentUser();
    
    const modal = Dashboard.createModal('Edit Basic Information', `
      <form id="basic-info-form">
        <div class="form-group">
          <label for="basic-company-name">Company Name *</label>
          <input type="text" id="basic-company-name" required value="${currentUser.companyName || ''}">
        </div>
        <div class="form-group">
          <label for="basic-email">Email *</label>
          <input type="email" id="basic-email" required value="${currentUser.email || ''}">
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" onclick="Dashboard.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Save</button>
        </div>
      </form>
    `);
    
    document.body.appendChild(modal);
    modal.classList.add('show');
    
    document.getElementById('basic-info-form').addEventListener('submit', (e) => {
      e.preventDefault();
      Dashboard.saveBasicInfo();
    });
  },

  showContactInfoModal: () => {
    const currentUser = AuthManager.getCurrentUser();
    
    const modal = Dashboard.createModal('Edit Contact Information', `
      <form id="contact-info-form">
        <div class="form-group">
          <label for="contact-name">Contact Person</label>
          <input type="text" id="contact-name" value="${currentUser.contactInfo?.name || ''}">
        </div>
        <div class="form-group">
          <label for="contact-phone">Phone</label>
          <input type="tel" id="contact-phone" value="${currentUser.contactInfo?.phone || ''}">
        </div>
        <div class="form-group">
          <label for="contact-address">Address</label>
          <textarea id="contact-address" rows="3">${currentUser.contactInfo?.address || ''}</textarea>
        </div>
        <div class="form-group">
          <label for="contact-city">City</label>
          <input type="text" id="contact-city" value="${currentUser.contactInfo?.city || ''}">
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" onclick="Dashboard.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Save</button>
        </div>
      </form>
    `);
    
    document.body.appendChild(modal);
    modal.classList.add('show');
    
    document.getElementById('contact-info-form').addEventListener('submit', (e) => {
      e.preventDefault();
      Dashboard.saveContactInfo();
    });
  },

  showBusinessInfoModal: () => {
    const currentUser = AuthManager.getCurrentUser();
    
    const modal = Dashboard.createModal('Edit Business Information', `
      <form id="business-info-form">
        <div class="form-group">
          <label for="business-license">Business License</label>
          <input type="text" id="business-license" value="${currentUser.businessInfo?.licenseNumber || ''}">
        </div>
        <div class="form-group">
          <label for="business-tax-id">Tax ID</label>
          <input type="text" id="business-tax-id" value="${currentUser.businessInfo?.taxId || ''}">
        </div>
        <div class="form-group">
          <label for="business-established">Established Year</label>
          <input type="number" id="business-established" value="${currentUser.businessInfo?.establishedYear || ''}">
        </div>
        <div class="form-group">
          <label for="business-employees">Number of Employees</label>
          <input type="number" id="business-employees" value="${currentUser.businessInfo?.employeeCount || ''}">
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" onclick="Dashboard.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Save</button>
        </div>
      </form>
    `);
    
    document.body.appendChild(modal);
    modal.classList.add('show');
    
    document.getElementById('business-info-form').addEventListener('submit', (e) => {
      e.preventDefault();
      Dashboard.saveBusinessInfo();
    });
  },

  showAboutModal: () => {
    const currentUser = AuthManager.getCurrentUser();
    const aboutText = currentUser.professionalInfo?.about || '';
    
    const modal = Dashboard.createModal('Edit About', `
      <form id="about-form">
        <div class="form-group">
          <label for="about-text">About</label>
          <textarea id="about-text" rows="6" placeholder="Tell us about yourself and your professional background...">${aboutText}</textarea>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" onclick="Dashboard.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Save</button>
        </div>
      </form>
    `);
    
    document.body.appendChild(modal);
    modal.classList.add('show');
    
    document.getElementById('about-form').addEventListener('submit', (e) => {
      e.preventDefault();
      Dashboard.saveAbout();
    });
  },

  showExperienceModal: (experienceId = null) => {
    const experience = experienceId ? 
      AuthManager.getCurrentUser().professionalInfo?.experiences?.find(exp => exp.id === experienceId) : null;
    
    const modal = Dashboard.createModal(experienceId ? 'Edit Experience' : 'Add Experience', `
      <form id="experience-form">
        <div class="form-group">
          <label for="exp-title">Job Title *</label>
          <input type="text" id="exp-title" required value="${experience?.title || ''}">
        </div>
        <div class="form-group">
          <label for="exp-company">Company *</label>
          <input type="text" id="exp-company" required value="${experience?.company || ''}">
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="exp-start">Start Date *</label>
            <input type="date" id="exp-start" required value="${experience?.startDate || ''}">
          </div>
          <div class="form-group">
            <label for="exp-end">End Date</label>
            <input type="date" id="exp-end" value="${experience?.endDate || ''}">
          </div>
        </div>
        <div class="form-group">
          <label for="exp-description">Description</label>
          <textarea id="exp-description" rows="4" placeholder="Describe your role and achievements...">${experience?.description || ''}</textarea>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" onclick="Dashboard.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">${experienceId ? 'Update' : 'Add'} Experience</button>
        </div>
      </form>
    `);
    
    document.body.appendChild(modal);
    modal.classList.add('show');
    
    document.getElementById('experience-form').addEventListener('submit', (e) => {
      e.preventDefault();
      Dashboard.saveExperience(experienceId);
    });
  },

  showEducationModal: (educationId = null) => {
    const education = educationId ? 
      AuthManager.getCurrentUser().professionalInfo?.educations?.find(edu => edu.id === educationId) : null;
    
    const modal = Dashboard.createModal(educationId ? 'Edit Education' : 'Add Education', `
      <form id="education-form">
        <div class="form-group">
          <label for="edu-degree">Degree *</label>
          <input type="text" id="edu-degree" required value="${education?.degree || ''}">
        </div>
        <div class="form-group">
          <label for="edu-institution">Institution *</label>
          <input type="text" id="edu-institution" required value="${education?.institution || ''}">
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="edu-start">Start Date *</label>
            <input type="date" id="edu-start" required value="${education?.startDate || ''}">
          </div>
          <div class="form-group">
            <label for="edu-end">End Date</label>
            <input type="date" id="edu-end" value="${education?.endDate || ''}">
          </div>
        </div>
        <div class="form-group">
          <label for="edu-description">Description</label>
          <textarea id="edu-description" rows="3" placeholder="Additional details...">${education?.description || ''}</textarea>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" onclick="Dashboard.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">${educationId ? 'Update' : 'Add'} Education</button>
        </div>
      </form>
    `);
    
    document.body.appendChild(modal);
    modal.classList.add('show');
    
    document.getElementById('education-form').addEventListener('submit', (e) => {
      e.preventDefault();
      Dashboard.saveEducation(educationId);
    });
  },

  showSkillModal: () => {
    const modal = Dashboard.createModal('Add Skill', `
      <form id="skill-form">
        <div class="form-group">
          <label for="skill-name">Skill Name *</label>
          <input type="text" id="skill-name" required placeholder="e.g., JavaScript, Project Management">
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" onclick="Dashboard.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Add Skill</button>
        </div>
      </form>
    `);
    
    document.body.appendChild(modal);
    modal.classList.add('show');
    
    document.getElementById('skill-form').addEventListener('submit', (e) => {
      e.preventDefault();
      Dashboard.saveSkill();
    });
  },

  showCertificationModal: (certificationId = null) => {
    const certification = certificationId ? 
      AuthManager.getCurrentUser().professionalInfo?.certifications?.find(cert => cert.id === certificationId) : null;
    
    const modal = Dashboard.createModal(certificationId ? 'Edit Certification' : 'Add Certification', `
      <form id="certification-form">
        <div class="form-group">
          <label for="cert-name">Certification Name *</label>
          <input type="text" id="cert-name" required value="${certification?.name || ''}">
        </div>
        <div class="form-group">
          <label for="cert-issuer">Issuing Organization *</label>
          <input type="text" id="cert-issuer" required value="${certification?.issuer || ''}">
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="cert-issue">Issue Date *</label>
            <input type="date" id="cert-issue" required value="${certification?.issueDate || ''}">
          </div>
          <div class="form-group">
            <label for="cert-expiry">Expiry Date</label>
            <input type="date" id="cert-expiry" value="${certification?.expiryDate || ''}">
          </div>
        </div>
        <div class="form-group">
          <label for="cert-description">Description</label>
          <textarea id="cert-description" rows="3" placeholder="Additional details...">${certification?.description || ''}</textarea>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" onclick="Dashboard.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">${certificationId ? 'Update' : 'Add'} Certification</button>
        </div>
      </form>
    `);
    
    document.body.appendChild(modal);
    modal.classList.add('show');
    
    document.getElementById('certification-form').addEventListener('submit', (e) => {
      e.preventDefault();
      Dashboard.saveCertification(certificationId);
    });
  },

  showPostModal: () => {
    const modal = Dashboard.createModal('Create Post', `
      <form id="post-form">
        <div class="form-group">
          <label for="post-content">What's on your mind? *</label>
          <textarea id="post-content" rows="6" required placeholder="Share your thoughts, updates, or insights..."></textarea>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" onclick="Dashboard.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Post</button>
        </div>
      </form>
    `);
    
    document.body.appendChild(modal);
    modal.classList.add('show');
    
    document.getElementById('post-form').addEventListener('submit', (e) => {
      e.preventDefault();
      Dashboard.savePost();
    });
  },

  // Create modal helper
  createModal: (title, content) => {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>${title}</h3>
          <button class="close-btn" onclick="Dashboard.closeModal()">×</button>
        </div>
        ${content}
      </div>
    `;
    return modal;
  },

  closeModal: () => {
    const modal = document.querySelector('.modal.show');
    if (modal) {
      modal.remove();
    }
  },

  // Save functions
  saveBasicInfo: () => {
    const companyName = document.getElementById('basic-company-name').value;
    const email = document.getElementById('basic-email').value;
    const currentUser = AuthManager.getCurrentUser();
    
    currentUser.companyName = companyName;
    currentUser.email = email;
    currentUser.updatedAt = new Date().toISOString();
    
    AuthManager.updateUser(currentUser);
    Dashboard.loadBasicInfoSection(currentUser);
    Dashboard.closeModal();
    Utils.showNotification('Basic information updated successfully!', 'success');
  },

  saveContactInfo: () => {
    const name = document.getElementById('contact-name').value;
    const phone = document.getElementById('contact-phone').value;
    const address = document.getElementById('contact-address').value;
    const city = document.getElementById('contact-city').value;
    const currentUser = AuthManager.getCurrentUser();
    
    if (!currentUser.contactInfo) {
      currentUser.contactInfo = {};
    }
    
    currentUser.contactInfo.name = name;
    currentUser.contactInfo.phone = phone;
    currentUser.contactInfo.address = address;
    currentUser.contactInfo.city = city;
    currentUser.updatedAt = new Date().toISOString();
    
    AuthManager.updateUser(currentUser);
    Dashboard.loadContactInfoSection(currentUser);
    Dashboard.closeModal();
    Utils.showNotification('Contact information updated successfully!', 'success');
  },

  saveBusinessInfo: () => {
    const licenseNumber = document.getElementById('business-license').value;
    const taxId = document.getElementById('business-tax-id').value;
    const establishedYear = document.getElementById('business-established').value;
    const employeeCount = document.getElementById('business-employees').value;
    const currentUser = AuthManager.getCurrentUser();
    
    if (!currentUser.businessInfo) {
      currentUser.businessInfo = {};
    }
    
    currentUser.businessInfo.licenseNumber = licenseNumber;
    currentUser.businessInfo.taxId = taxId;
    currentUser.businessInfo.establishedYear = establishedYear;
    currentUser.businessInfo.employeeCount = employeeCount;
    currentUser.updatedAt = new Date().toISOString();
    
    AuthManager.updateUser(currentUser);
    Dashboard.loadBusinessInfoSection(currentUser);
    Dashboard.closeModal();
    Utils.showNotification('Business information updated successfully!', 'success');
  },

  saveAbout: () => {
    const aboutText = document.getElementById('about-text').value;
    const currentUser = AuthManager.getCurrentUser();
    
    if (!currentUser.professionalInfo) {
      currentUser.professionalInfo = {};
    }
    
    currentUser.professionalInfo.about = aboutText;
    currentUser.updatedAt = new Date().toISOString();
    
    AuthManager.updateUser(currentUser);
    Dashboard.loadAboutSection(currentUser);
    Dashboard.closeModal();
    Utils.showNotification('About section updated successfully!', 'success');
  },

  saveExperience: (experienceId = null) => {
    const title = document.getElementById('exp-title').value;
    const company = document.getElementById('exp-company').value;
    const startDate = document.getElementById('exp-start').value;
    const endDate = document.getElementById('exp-end').value;
    const description = document.getElementById('exp-description').value;
    
    const currentUser = AuthManager.getCurrentUser();
    
    if (!currentUser.professionalInfo) {
      currentUser.professionalInfo = {};
    }
    if (!currentUser.professionalInfo.experiences) {
      currentUser.professionalInfo.experiences = [];
    }
    
    const experience = {
      id: experienceId || Utils.generateId(),
      title,
      company,
      startDate,
      endDate: endDate || null,
      description
    };
    
    if (experienceId) {
      const index = currentUser.professionalInfo.experiences.findIndex(exp => exp.id === experienceId);
      if (index !== -1) {
        currentUser.professionalInfo.experiences[index] = experience;
      }
    } else {
      currentUser.professionalInfo.experiences.push(experience);
    }
    
    currentUser.updatedAt = new Date().toISOString();
    AuthManager.updateUser(currentUser);
    Dashboard.loadExperienceSection(currentUser);
    Dashboard.closeModal();
    Utils.showNotification('Experience saved successfully!', 'success');
  },

  saveEducation: (educationId = null) => {
    const degree = document.getElementById('edu-degree').value;
    const institution = document.getElementById('edu-institution').value;
    const startDate = document.getElementById('edu-start').value;
    const endDate = document.getElementById('edu-end').value;
    const description = document.getElementById('edu-description').value;
    
    const currentUser = AuthManager.getCurrentUser();
    
    if (!currentUser.professionalInfo) {
      currentUser.professionalInfo = {};
    }
    if (!currentUser.professionalInfo.educations) {
      currentUser.professionalInfo.educations = [];
    }
    
    const education = {
      id: educationId || Utils.generateId(),
      degree,
      institution,
      startDate,
      endDate: endDate || null,
      description
    };
    
    if (educationId) {
      const index = currentUser.professionalInfo.educations.findIndex(edu => edu.id === educationId);
      if (index !== -1) {
        currentUser.professionalInfo.educations[index] = education;
      }
    } else {
      currentUser.professionalInfo.educations.push(education);
    }
    
    currentUser.updatedAt = new Date().toISOString();
    AuthManager.updateUser(currentUser);
    Dashboard.loadEducationSection(currentUser);
    Dashboard.closeModal();
    Utils.showNotification('Education saved successfully!', 'success');
  },

  saveSkill: () => {
    const skillName = document.getElementById('skill-name').value.trim();
    
    if (!skillName) return;
    
    const currentUser = AuthManager.getCurrentUser();
    
    if (!currentUser.professionalInfo) {
      currentUser.professionalInfo = {};
    }
    if (!currentUser.professionalInfo.skills) {
      currentUser.professionalInfo.skills = [];
    }
    
    if (!currentUser.professionalInfo.skills.includes(skillName)) {
      currentUser.professionalInfo.skills.push(skillName);
      currentUser.updatedAt = new Date().toISOString();
      AuthManager.updateUser(currentUser);
      Dashboard.loadSkillsSection(currentUser);
      Dashboard.closeModal();
      Utils.showNotification('Skill added successfully!', 'success');
    } else {
      Utils.showNotification('Skill already exists!', 'error');
    }
  },

  saveCertification: (certificationId = null) => {
    const name = document.getElementById('cert-name').value;
    const issuer = document.getElementById('cert-issuer').value;
    const issueDate = document.getElementById('cert-issue').value;
    const expiryDate = document.getElementById('cert-expiry').value;
    const description = document.getElementById('cert-description').value;
    
    const currentUser = AuthManager.getCurrentUser();
    
    if (!currentUser.professionalInfo) {
      currentUser.professionalInfo = {};
    }
    if (!currentUser.professionalInfo.certifications) {
      currentUser.professionalInfo.certifications = [];
    }
    
    const certification = {
      id: certificationId || Utils.generateId(),
      name,
      issuer,
      issueDate,
      expiryDate: expiryDate || null,
      description
    };
    
    if (certificationId) {
      const index = currentUser.professionalInfo.certifications.findIndex(cert => cert.id === certificationId);
      if (index !== -1) {
        currentUser.professionalInfo.certifications[index] = certification;
      }
    } else {
      currentUser.professionalInfo.certifications.push(certification);
    }
    
    currentUser.updatedAt = new Date().toISOString();
    AuthManager.updateUser(currentUser);
    Dashboard.loadCertificationsSection(currentUser);
    Dashboard.closeModal();
    Utils.showNotification('Certification saved successfully!', 'success');
  },

  savePost: () => {
    const content = document.getElementById('post-content').value.trim();
    
    if (!content) return;
    
    const currentUser = AuthManager.getCurrentUser();
    const newPost = {
      id: Utils.generateId(),
      authorId: currentUser.id,
      authorName: currentUser.companyName,
      content,
      createdAt: new Date().toISOString(),
      likes: 0,
      comments: []
    };
    
    const posts = DataManager.getPosts();
    posts.unshift(newPost);
    DataManager.set('posts', posts);
    
    Dashboard.loadPostsSection(currentUser);
    Dashboard.closeModal();
    Utils.showNotification('Post created successfully!', 'success');
  },

  // Delete functions
  removeSkill: (skillName) => {
    const currentUser = AuthManager.getCurrentUser();
    if (currentUser.professionalInfo?.skills) {
      currentUser.professionalInfo.skills = currentUser.professionalInfo.skills.filter(skill => skill !== skillName);
      currentUser.updatedAt = new Date().toISOString();
      AuthManager.updateUser(currentUser);
      Dashboard.loadSkillsSection(currentUser);
      Utils.showNotification('Skill removed successfully!', 'success');
    }
  },

  deleteExperience: (experienceId) => {
    if (confirm('Are you sure you want to delete this experience?')) {
      const currentUser = AuthManager.getCurrentUser();
      if (currentUser.professionalInfo?.experiences) {
        currentUser.professionalInfo.experiences = currentUser.professionalInfo.experiences.filter(exp => exp.id !== experienceId);
        currentUser.updatedAt = new Date().toISOString();
        AuthManager.updateUser(currentUser);
        Dashboard.loadExperienceSection(currentUser);
        Utils.showNotification('Experience deleted successfully!', 'success');
      }
    }
  },

  deleteEducation: (educationId) => {
    if (confirm('Are you sure you want to delete this education?')) {
      const currentUser = AuthManager.getCurrentUser();
      if (currentUser.professionalInfo?.educations) {
        currentUser.professionalInfo.educations = currentUser.professionalInfo.educations.filter(edu => edu.id !== educationId);
        currentUser.updatedAt = new Date().toISOString();
        AuthManager.updateUser(currentUser);
        Dashboard.loadEducationSection(currentUser);
        Utils.showNotification('Education deleted successfully!', 'success');
      }
    }
  },

  deleteCertification: (certificationId) => {
    if (confirm('Are you sure you want to delete this certification?')) {
      const currentUser = AuthManager.getCurrentUser();
      if (currentUser.professionalInfo?.certifications) {
        currentUser.professionalInfo.certifications = currentUser.professionalInfo.certifications.filter(cert => cert.id !== certificationId);
        currentUser.updatedAt = new Date().toISOString();
        AuthManager.updateUser(currentUser);
        Dashboard.loadCertificationsSection(currentUser);
        Utils.showNotification('Certification deleted successfully!', 'success');
      }
    }
  },

  // Edit functions
  editExperience: (experienceId) => {
    Dashboard.showExperienceModal(experienceId);
  },

  editEducation: (educationId) => {
    Dashboard.showEducationModal(educationId);
  },

  editCertification: (certificationId) => {
    Dashboard.showCertificationModal(certificationId);
  },

  // Show buyer dashboard
  showBuyerDashboard: () => {
    const buyerDashboard = document.getElementById('buyer-dashboard');
    const sellerDashboard = document.getElementById('seller-dashboard');
    const professionalProfile = document.getElementById('professional-profile');
    const buyerActions = document.getElementById('buyer-actions');
    const sellerActions = document.getElementById('seller-actions');
    
    if (buyerDashboard) buyerDashboard.style.display = 'block';
    if (sellerDashboard) sellerDashboard.style.display = 'none';
    if (professionalProfile) professionalProfile.style.display = 'none';
    if (buyerActions) buyerActions.style.display = 'flex';
    if (sellerActions) sellerActions.style.display = 'none';
  },

  // Show seller dashboard
  showSellerDashboard: () => {
    const buyerDashboard = document.getElementById('buyer-dashboard');
    const sellerDashboard = document.getElementById('seller-dashboard');
    const professionalProfile = document.getElementById('professional-profile');
    const buyerActions = document.getElementById('buyer-actions');
    const sellerActions = document.getElementById('seller-actions');
    
    if (buyerDashboard) buyerDashboard.style.display = 'none';
    if (sellerDashboard) sellerDashboard.style.display = 'block';
    if (professionalProfile) professionalProfile.style.display = 'block';
    if (buyerActions) buyerActions.style.display = 'none';
    if (sellerActions) sellerActions.style.display = 'flex';
  },

  // Load buyer data
  loadBuyerData: (buyerId) => {
    // Load orders
    const orders = OrderManager.getOrdersByBuyer(buyerId);
    const rfqs = RFQManager.getRFQsByBuyer(buyerId);
    
    // Update buyer stats
    Dashboard.updateBuyerStats(orders, rfqs);
    
    // Load recent orders
    Dashboard.loadBuyerRecentOrders(orders.slice(0, 5));
    
    // Load recommended products
    Dashboard.loadRecommendedProducts();
  },

  // Load seller data
  loadSellerData: (sellerId) => {
    // Load products
    const products = ProductManager.getProductsBySeller(sellerId);
    
    // Load orders
    const orders = OrderManager.getOrdersBySeller(sellerId);
    
    // Update seller stats
    Dashboard.updateSellerStats(products, orders);
    
    // Load recent orders
    Dashboard.loadSellerRecentOrders(orders.slice(0, 5));
    
    // Load top products
    Dashboard.loadSellerTopProducts(products.slice(0, 4));
  },

  // Update buyer stats
  updateBuyerStats: (orders, rfqs = []) => {
    const totalOrders = orders.length;
    const totalSpent = orders.reduce((sum, order) => sum + (order.totalPrice || 0), 0);
    const pendingRFQs = rfqs.filter(rfq => rfq.status === 'open').length;
    const favoriteSellers = 0; // TODO: Implement favorites system
    
    // Update buyer stat cards
    const totalOrdersElement = document.getElementById('buyer-total-orders');
    const totalSpentElement = document.getElementById('buyer-total-spent');
    const pendingRfqsElement = document.getElementById('buyer-pending-rfqs');
    const favoriteSellersElement = document.getElementById('buyer-favorite-sellers');
    
    if (totalOrdersElement) totalOrdersElement.textContent = totalOrders;
    if (totalSpentElement) totalSpentElement.textContent = Utils.formatCurrency(totalSpent);
    if (pendingRfqsElement) pendingRfqsElement.textContent = pendingRFQs;
    if (favoriteSellersElement) favoriteSellersElement.textContent = favoriteSellers;
  },

  // Update seller stats
  updateSellerStats: (products, orders = []) => {
    const totalProducts = products.length;
    const activeProducts = products.filter(p => p.status === 'active').length;
    const totalRevenue = orders.reduce((sum, order) => sum + (order.totalPrice || 0), 0);
    const pendingOrders = orders.filter(order => order.status === 'pending').length;
    const averageRating = products.length > 0 ? 
      (products.reduce((sum, product) => sum + (product.rating || 0), 0) / products.length).toFixed(1) : '0.0';
    
    // Update seller stat cards
    const totalProductsElement = document.getElementById('seller-total-products');
    const totalRevenueElement = document.getElementById('seller-total-revenue');
    const pendingOrdersElement = document.getElementById('seller-pending-orders');
    const customerRatingElement = document.getElementById('seller-customer-rating');
    
    if (totalProductsElement) totalProductsElement.textContent = totalProducts;
    if (totalRevenueElement) totalRevenueElement.textContent = Utils.formatCurrency(totalRevenue);
    if (pendingOrdersElement) pendingOrdersElement.textContent = pendingOrders;
    if (customerRatingElement) customerRatingElement.textContent = averageRating;
  },

  // Load buyer recent orders
  loadBuyerRecentOrders: (orders) => {
    const ordersContainer = document.getElementById('buyer-recent-orders');
    if (!ordersContainer) return;
    
    if (orders.length === 0) {
      ordersContainer.innerHTML = '<div class="empty-state"><p>No recent orders. Start shopping!</p></div>';
      return;
    }
    
    ordersContainer.innerHTML = orders.map(order => `
      <div class="order-item">
        <div class="order-info">
          <h4>Order #${order.id}</h4>
          <p>${order.productName || 'Multiple Products'}</p>
          <span class="order-date">${Utils.formatDate(order.createdAt)}</span>
        </div>
        <div class="order-status">
          <span class="status-badge status-${order.status}">${order.status}</span>
          <span class="order-total">${Utils.formatCurrency(order.totalPrice)}</span>
        </div>
      </div>
    `).join('');
  },

  // Load seller recent orders
  loadSellerRecentOrders: (orders) => {
    const ordersContainer = document.getElementById('seller-recent-orders');
    if (!ordersContainer) return;
    
    if (orders.length === 0) {
      ordersContainer.innerHTML = '<div class="empty-state"><p>No recent orders. Promote your products!</p></div>';
      return;
    }
    
    ordersContainer.innerHTML = orders.map(order => `
      <div class="order-item">
        <div class="order-info">
          <h4>Order #${order.id}</h4>
          <p>${order.productName || 'Multiple Products'}</p>
          <span class="order-date">${Utils.formatDate(order.createdAt)}</span>
        </div>
        <div class="order-status">
          <span class="status-badge status-${order.status}">${order.status}</span>
          <span class="order-total">${Utils.formatCurrency(order.totalPrice)}</span>
        </div>
      </div>
    `).join('');
  },

  // Load recommended products for buyers
  loadRecommendedProducts: () => {
    const productsContainer = document.getElementById('buyer-recommended-products');
    if (!productsContainer) return;
    
    const products = ProductManager.getAllProducts().slice(0, 4);
    
    if (products.length === 0) {
      productsContainer.innerHTML = '<div class="empty-state"><p>No products available.</p></div>';
      return;
    }
    
    productsContainer.innerHTML = products.map(product => `
      <div class="product-card">
        <div class="product-card-image">
          <img src="${product.images && product.images[0] ? product.images[0] : 'assets/images/placeholder.svg'}" 
               alt="${product.name}" 
               onerror="this.src='assets/images/placeholder.svg'">
        </div>
        <div class="product-card-content">
          <h3 class="product-card-title">${Utils.sanitizeHTML(product.name)}</h3>
          <p class="product-card-description">${Utils.sanitizeHTML(product.description)}</p>
          <div class="product-card-meta">
            <span class="product-card-price">${Utils.formatCurrency(product.price, product.currency)}</span>
            <span class="product-card-category">${product.category}</span>
          </div>
          <div class="product-card-actions">
            <button class="btn btn-primary btn-sm" onclick="window.location.href='product.html?id=${product.id}'">
              View Details
            </button>
          </div>
        </div>
      </div>
    `).join('');
  },

  // Load seller top products
  loadSellerTopProducts: (products) => {
    const productsContainer = document.getElementById('seller-top-products');
    if (!productsContainer) return;
    
    if (products.length === 0) {
      productsContainer.innerHTML = '<div class="empty-state"><p>No products yet. Add your first product!</p></div>';
      return;
    }
    
    productsContainer.innerHTML = products.map(product => `
      <div class="product-card">
        <div class="product-card-image">
          <img src="${product.images && product.images[0] ? product.images[0] : 'assets/images/placeholder.svg'}" 
               alt="${product.name}" 
               onerror="this.src='assets/images/placeholder.svg'">
        </div>
        <div class="product-card-content">
          <h3 class="product-card-title">${Utils.sanitizeHTML(product.name)}</h3>
          <p class="product-card-description">${Utils.sanitizeHTML(product.description)}</p>
          <div class="product-card-meta">
            <span class="product-card-price">${Utils.formatCurrency(product.price, product.currency)}</span>
            <span class="product-card-category">${product.category}</span>
          </div>
          <div class="product-card-actions">
            <button class="btn btn-primary btn-sm" onclick="window.location.href='product.html?id=${product.id}'">
              View Details
            </button>
          </div>
        </div>
      </div>
    `).join('');
  },

  // Update RFQ stats
  updateRFQStats: (rfqs) => {
    // This could be used for both buyer and seller RFQ stats
    // Implementation depends on specific requirements
  },

  // Load recent orders
  loadRecentOrders: (orders, containerId) => {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    // Sort orders by date (newest first)
    const recentOrders = orders
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5);
    
    if (recentOrders.length === 0) {
      container.innerHTML = '<p class="text-gray-500">No recent orders</p>';
      return;
    }
    
    container.innerHTML = recentOrders.map(order => {
      const product = ProductManager.getProductById(order.productId);
      const productName = product ? product.name : 'Unknown Product';
      
      return `
        <div class="order-item">
          <div class="order-info">
            <h4>${Utils.sanitizeHTML(productName)}</h4>
            <p class="text-sm text-gray-500">Order #${order.id}</p>
          </div>
          <div class="order-meta">
            <span class="status-badge ${order.status}">${order.status}</span>
            <span class="text-sm text-gray-500">${Utils.formatDate(order.createdAt)}</span>
          </div>
        </div>
      `;
    }).join('');
  },

  // Get dashboard summary
  getDashboardSummary: () => {
    const currentUser = AuthManager.getCurrentUser();
    if (!currentUser) return null;
    
    const summary = {
      user: currentUser,
      orders: [],
      products: [],
      rfqs: []
    };
    
    if (currentUser.role === 'buyer') {
      summary.orders = OrderManager.getOrdersByBuyer(currentUser.id);
      summary.rfqs = RFQManager.getRFQsByBuyer(currentUser.id);
    } else if (currentUser.role === 'seller') {
      summary.orders = OrderManager.getOrdersBySeller(currentUser.id);
      summary.products = ProductManager.getProductsBySeller(currentUser.id);
      summary.rfqs = RFQManager.getRFQsBySeller(currentUser.id);
    }
    
    return summary;
  },

  // Refresh dashboard data
  refresh: () => {
    Dashboard.loadUserData();
  }
};

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  if (window.location.pathname.includes('dashboard.html')) {
    Dashboard.init();
  }
});

// Export for global access
window.Dashboard = Dashboard;
