# 📄 Product Requirement Document (PRD)
**Project:** B2B Marketplace (Demo)  
**Tech Stack:** HTML, CSS, JavaScript (Vanilla JS)  

---

## 1. Overview
A demo web app that simulates a **B2B marketplace** with two roles: **Buyer** and **Seller**.  
- **Buyer:** Browse products, view details, raise RFQs, place orders.  
- **Seller:** Manage profile, list products, handle orders.  

This demo is **static-first** with minimal JavaScript interactivity. Data is handled using **localStorage / mock JSON**.  

---

## 2. Pages

### Authentication
- **register.html** → User signup  
- **index.html (Login)** → User login  

### Buyer Flow
- **marketplace.html** → Product catalog  
- **product.html** → Product details  
- **rfq.html** → RFQ / Enquiry form  
- **orders.html** → View placed orders  
- **dashboard.html** → Overview  

### Seller Flow
- **profile.html** → Company profile  
- **products.html** → Seller's product list  
- **add-product.html** → Add/Edit product  
- **orders.html** → View received orders  
- **dashboard.html** → Stats & quick actions  

### Shared Pages
- **chat.html** → Technical discussion  
- **ticket.html** → Raise support queries  
- **posts.html** → Posts/Blogs  

---

## 3. Features (Demo Scope)
- **Navigation:** Simple navbar between pages  
- **Data Simulation:** Products/orders stored in localStorage or JSON file  
- **Forms:** Register, Login, Add Product, RFQ, Orders (no backend)  
- **UI Components:**  
  - Product cards (Marketplace)  
  - Forms (Login, RFQ, Add Product)  
  - Tables (Orders)  
- **Responsive Layout:** Basic CSS Flex/Grid  

---

## 4. Tech Stack
- **Frontend:** HTML5, CSS3, JavaScript (ES6)  
- **Data:** localStorage / dummy JSON files  
- **Design:** Responsive with Flexbox/Grid  
- **No Backend:** All client-side demo  

---

## 5. Demo Flow
1. User opens `index.html` → Login/Register  
2. If Buyer → Redirect to `marketplace.html` / `dashboard.html`  
3. If Seller → Redirect to `profile.html` / `products.html`  
4. Buyer selects product → `product.html` → RFQ (`rfq.html`) or Order  
5. Seller adds products via `add-product.html`, shown in `marketplace.html`  
6. Orders and RFQs shown in `orders.html`  

---

## 6. Next Steps
1. Create **static HTML templates** for all pages.  
2. Add **CSS styling** (navbar, forms, product cards).  
3. Use **JavaScript** for:  
   - Page navigation  
   - Form validation  
   - Saving/loading products & orders in localStorage  
   - Simple interactive chat/ticket mock  

---

✅ This PRD is tailored for an **HTML, CSS, JS demo project**.
