// js/shop.js

let products = [];
let cart = [];
let currentCategoryFilter = 'All';
let currentUser = null;
let isSignupMode = false;
let isAdminMode = false;

// --- Fonctions d'interface ---
document.addEventListener('DOMContentLoaded', () => {
    const savedUser = localStorage.getItem('clientUser');
    if (savedUser) {
        try {
            currentUser = JSON.parse(savedUser);
        } catch(e) {}
    }
    
    fetchProducts();
    setupModals();
    updateCartUI();
    setupCategoryFilters();
    updateAuthUI();
});

// Écouter les modifications du localStorage pour mettre à jour le site en temps réel
// depuis l'onglet administrateur.
window.addEventListener('storage', (e) => {
    if (e.key === 'demoProducts') {
        fetchProducts();
    }
});

// Admin Mode Toggle
document.addEventListener('DOMContentLoaded', () => {
    const toggleAdminBtn = document.getElementById('toggle-admin-btn');
    if (toggleAdminBtn) {
        toggleAdminBtn.addEventListener('click', () => {
            isAdminMode = !isAdminMode;
            renderProducts();
            if (isAdminMode) {
                toggleAdminBtn.style.opacity = '1';
                toggleAdminBtn.style.color = 'var(--primary)';
                const productsSection = document.getElementById('products-section-title');
                if (productsSection) {
                    const headerOffset = 100;
                    const elementPosition = productsSection.getBoundingClientRect().top;
                    const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
                    window.scrollTo({
                         top: offsetPosition,
                         behavior: "smooth"
                    });
                }
            } else {
                toggleAdminBtn.style.opacity = '0.5';
                toggleAdminBtn.style.color = '';
            }
        });
    }
});

async function fetchProducts() {
    if (db) {
        try {
            const snapshot = await db.collection("products").orderBy("createdAt", "desc").get();
            products = [];
            snapshot.forEach(doc => {
                products.push({ id: doc.id, ...doc.data() });
            });
            renderFeaturedProducts();
            renderProducts();
        } catch (error) {
            console.error("Erreur de chargement des produits", error);
        }
    } else {
        // Mode démo
        const defaultDemos = [
            { id: "p1", name: "Veste Blazer Noir", price: 25000, size: "M", category: "Homme", img: "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=500&auto=format&fit=crop&q=60" },
            { id: "p2", name: "Robe d'Été Fleurie", price: 15000, size: "S", category: "Femme", img: "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=500&auto=format&fit=crop&q=60" },
            { id: "p3", name: "Chemise Blanche Premium", price: 12000, size: "L", category: "Homme", img: "https://images.unsplash.com/photo-1596755094514-f87e32f85e98?w=500&auto=format&fit=crop&q=60" },
            { id: "p4", name: "Sac en Cuir Vintage", price: 35000, size: "Unique", category: "Sacs", img: "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=500&auto=format&fit=crop&q=60" },
            { id: "p5", name: "T-Shirt Basique Homme", price: 2500, size: "M", category: "Homme", img: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500&auto=format&fit=crop&q=60" },
            { id: "p6", name: "Polo Manches Courtes", price: 3500, size: "L", category: "Homme", img: "https://images.unsplash.com/photo-1586363104862-3a5e2ab60d99?w=500&auto=format&fit=crop&q=60" },
            { id: "p7", name: "Chemise Décontractée", price: 4500, size: "XL", category: "Homme", img: "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=500&auto=format&fit=crop&q=60" },
            { id: "p8", name: "Pantalon en Toile", price: 5500, size: "42", category: "Homme", img: "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=500&auto=format&fit=crop&q=60" },
            { id: "p9", name: "Short d'Été Plage", price: 2000, size: "M", category: "Homme", img: "https://images.unsplash.com/photo-1591195853828-11db59a44f6b?w=500&auto=format&fit=crop&q=60" },
            { id: "p10", name: "Pantalon Kaki Boss Homme", price: 12000, size: "XL, XXL", category: "Homme", img: "./solide-kaki-pantalon-noir-gris-boss-homme-5-300x300.jpg" },
            { id: "p11", name: "Article Homme Classique", price: 6000, size: "XL, XXL", category: "Homme", img: "./1.jpg" }
        ];

        const saved = localStorage.getItem('demoProducts');
        if (saved) {
            products = JSON.parse(saved);
        } else {
            products = defaultDemos;
            localStorage.setItem('demoProducts', JSON.stringify(products));
        }
        renderFeaturedProducts();
        renderProducts();
    }
}

function renderFeaturedProducts() {
    const grid = document.getElementById('featured-products-grid');
    if (!grid) return;
    
    grid.innerHTML = '';
    
    // Les produits sont déjà triés du plus récent au plus ancien (via unshift/desc).
    // On prend les 4 premiers pour la une.
    const featured = products.slice(0, 4);
    
    if(featured.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align:center; color:#A3AED0; padding:2rem;">Aucun produit à la une pour le moment.</p>';
        return;
    }
    
    featured.forEach(p => {
        const sizeStr = p.size || 'Unique';
        const sizes = sizeStr.split(',').map(s => s.trim()).filter(s => s);
        
        let sizeSelectorHtml = '';
        if (sizes.length > 1) {
            sizeSelectorHtml = `
                <div style="margin-bottom:0.8rem;">
                    <select class="size-select-${p.id}-featured" style="width:100%; padding:0.4rem; border:1px solid var(--border); border-radius:5px; outline:none; font-family:var(--font-main);">
                        ${sizes.map(s => `<option value="${s}">Taille: ${s}</option>`).join('')}
                    </select>
                </div>
            `;
        } else {
            sizeSelectorHtml = `<p style="font-size: 0.85rem; color: #A3AED0; margin-bottom: 0.8rem;">Taille: ${sizes[0]}</p>`;
        }

        const card = document.createElement('div');
        card.className = 'product-card fade-up';
        card.innerHTML = `
            <img src="${p.img}" alt="${p.name}" class="product-image">
            <div class="product-info">
                <span class="badge" style="background:#F4F7FE; color:#D6407C; font-size:0.75rem; padding:0.2rem 0.6rem; border-radius:4px; display:inline-block; margin-bottom:0.5rem;">Nouveau</span>
                <h3 class="product-title">${p.name}</h3>
                ${sizeSelectorHtml}
                <p class="product-price">${p.price.toLocaleString()} FCFA</p>
                <button class="btn btn-outline add-to-cart-btn" data-id="${p.id}" data-context="featured">
                    <i data-lucide="shopping-cart"></i> Ajouter
                </button>
            </div>
        `;
        grid.appendChild(card);
    });
    
    lucide.createIcons();
}

function renderProducts() {
    const grid = document.getElementById('products-grid');
    if (!grid) return;
    
    grid.innerHTML = '';
    
    const filteredProducts = currentCategoryFilter === 'All' 
        ? products 
        : products.filter(p => p.category === currentCategoryFilter);
        
    if(filteredProducts.length === 0 && !isAdminMode) {
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align:center; color:#A3AED0; padding:2rem;">Aucun produit disponible dans cette catégorie pour le moment.</p>';
        return;
    }
    
    if (isAdminMode) {
        const addCard = document.createElement('div');
        addCard.className = 'product-card fade-up';
        addCard.style.display = 'flex';
        addCard.style.flexDirection = 'column';
        addCard.style.justifyContent = 'center';
        addCard.style.alignItems = 'center';
        addCard.style.cursor = 'pointer';
        addCard.style.background = '#F8FAFC';
        addCard.style.border = '2px dashed #CBD5E1';
        addCard.style.minHeight = '350px';
        addCard.innerHTML = `
            <i data-lucide="plus-circle" style="width: 48px; height: 48px; color: var(--primary); margin-bottom: 1rem;"></i>
            <h3 style="color: var(--primary);">Ajouter un produit</h3>
        `;
        addCard.addEventListener('click', () => {
            document.getElementById('product-modal').classList.add('open');
        });
        grid.appendChild(addCard);
    }
    
    filteredProducts.forEach(p => {
        const sizeStr = p.size || 'Unique';
        const sizes = sizeStr.split(',').map(s => s.trim()).filter(s => s);
        
        let sizeSelectorHtml = '';
        if (sizes.length > 1) {
            sizeSelectorHtml = `
                <div style="margin-bottom:0.8rem;">
                    <select class="size-select-${p.id}" style="width:100%; padding:0.4rem; border:1px solid var(--border); border-radius:5px; outline:none; font-family:var(--font-main);">
                        ${sizes.map(s => `<option value="${s}">Taille: ${s}</option>`).join('')}
                    </select>
                </div>
            `;
        } else {
            sizeSelectorHtml = `<p style="font-size: 0.85rem; color: #A3AED0; margin-bottom: 0.8rem;">Taille: ${sizes[0]}</p>`;
        }

        let deleteBtnHtml = isAdminMode ? `<button class="btn btn-sm btn-outline delete-product-btn" data-id="${p.id}" style="position: absolute; top: 10px; right: 10px; z-index: 10; border-color: var(--danger); color: var(--danger); background: white; padding: 0.4rem; border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.1);"><i data-lucide="trash-2" style="width: 18px; height: 18px;"></i></button>` : '';

        const card = document.createElement('div');
        card.className = 'product-card fade-up';
        card.style.position = 'relative'; // Pour le bouton supprimer absolu
        card.innerHTML = `
            ${deleteBtnHtml}
            <img src="${p.img}" alt="${p.name}" class="product-image">
            <div class="product-info">
                <span class="badge" style="background:#F4F7FE; color:#D6407C; font-size:0.75rem; padding:0.2rem 0.6rem; border-radius:4px; display:inline-block; margin-bottom:0.5rem;">${p.category || 'Non classé'}</span>
                <h3 class="product-title">${p.name}</h3>
                ${sizeSelectorHtml}
                <p class="product-price">${p.price.toLocaleString()} FCFA</p>
                <button class="btn btn-outline add-to-cart-btn" data-id="${p.id}">
                    <i data-lucide="shopping-cart"></i> Ajouter
                </button>
            </div>
        `;
        grid.appendChild(card);
    });
    
    // Réinitialiser les icônes pour les nouveaux éléments
    lucide.createIcons();
    
    // Listeners pour les boutons d'ajout
    document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
        // Prevent duplicate bindings if button already has listener
        if (btn.hasAttribute('data-listener')) return;
        btn.setAttribute('data-listener', 'true');
        
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.getAttribute('data-id');
            const context = e.currentTarget.getAttribute('data-context'); // To differentiate featured vs normal
            const product = products.find(p => p.id === id);
            
            let selectedSize = product.size;
            // Find correct select based on context
            let sizeSelectClass = context === 'featured' ? `.size-select-${id}-featured` : `.size-select-${id}`;
            const sizeSelect = document.querySelector(sizeSelectClass);
            
            if (sizeSelect) {
                selectedSize = sizeSelect.value;
            } else {
                const sizes = (product.size || 'Unique').split(',').map(s => s.trim()).filter(s => s);
                selectedSize = sizes[0] || 'Unique';
            }
            
            addToCart(id, selectedSize);
        });
    });

    // Listeners pour les boutons de suppression (Admin Mode)
    document.querySelectorAll('.delete-product-btn').forEach(btn => {
        if (btn.hasAttribute('data-listener')) return;
        btn.setAttribute('data-listener', 'true');
        
        btn.addEventListener('click', (e) => {
            e.stopPropagation(); // Évite de déclencher d'autres événements sur la carte
            const id = e.currentTarget.getAttribute('data-id');
            if(confirm("Êtes-vous sûr de vouloir supprimer définitivement ce produit ?")) {
                products = products.filter(p => p.id !== id);
                localStorage.setItem('demoProducts', JSON.stringify(products));
                renderFeaturedProducts();
                renderProducts(); // Recharger la grille
            }
        });
    });
}

function setupCategoryFilters() {
    const titleEl = document.getElementById('products-section-title');
    const resetBtn = document.getElementById('reset-filter-btn');
    
    document.querySelectorAll('.filter-category').forEach(card => {
        card.addEventListener('click', (e) => {
            const category = e.currentTarget.getAttribute('data-category');
            currentCategoryFilter = category;
            
            if(titleEl) titleEl.textContent = `Collection ${category}`;
            if(resetBtn) resetBtn.classList.remove('hidden');
            
            const heroSection = document.getElementById('hero-section');
            const categoriesSection = document.getElementById('categories-section');
            
            if (heroSection) heroSection.style.display = 'none';
            if (categoriesSection) categoriesSection.style.display = 'none';
            
            renderProducts();
            
            window.scrollTo({
                 top: 0,
                 behavior: "smooth"
            });
        });
    });
    
    if(resetBtn) {
        resetBtn.addEventListener('click', () => {
            currentCategoryFilter = 'All';
            if(titleEl) titleEl.textContent = "Tous nos produits";
            resetBtn.classList.add('hidden');
            
            const heroSection = document.getElementById('hero-section');
            const categoriesSection = document.getElementById('categories-section');
            
            if (heroSection) heroSection.style.display = 'flex';
            if (categoriesSection) categoriesSection.style.display = 'block';
            
            renderProducts();
            
            if (categoriesSection) {
                const header = document.querySelector('.navbar');
                const headerHeight = header ? header.offsetHeight : 80;
                const elementPosition = categoriesSection.getBoundingClientRect().top + window.scrollY;
                const offsetPosition = elementPosition - headerHeight - 20;
                window.scrollTo({ top: offsetPosition, behavior: "smooth" });
            }
        });
    }
}

function addToCart(productId, selectedSize) {
    const product = products.find(p => p.id === productId);
    
    const existing = cart.find(item => item.id === productId && item.selectedSize === selectedSize);
    
    if (existing) {
        existing.quantity += 1;
    } else {
        cart.push({ ...product, selectedSize: selectedSize, quantity: 1 });
    }
    
    updateCartUI();
    document.getElementById('cart-modal').classList.add('open');
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    updateCartUI();
}

window.updateQuantity = (index, change) => {
    const item = cart[index];
    if (item) {
        item.quantity += change;
        if (item.quantity <= 0) {
            cart.splice(index, 1);
        }
        updateCartUI();
    }
};

function updateCartUI() {
    const cartCount = document.getElementById('cart-count');
    const cartItems = document.getElementById('cart-items');
    const cartTotalPrice = document.getElementById('cart-total-price');
    
    // Total d'articles
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartCount.textContent = totalItems;
    
    // Rendu des articles
    if (cart.length === 0) {
        cartItems.innerHTML = '<p class="cart-empty">Votre panier est vide.</p>';
        cartTotalPrice.textContent = '0 FCFA';
        return;
    }
    
    let total = 0;
    cartItems.innerHTML = '';
    
    cart.forEach((item, index) => {
        total += item.price * item.quantity;
        const itemEl = document.createElement('div');
        itemEl.className = 'cart-item';
        itemEl.innerHTML = `
            <img src="${item.img}" alt="${item.name}" class="cart-item-img">
            <div class="cart-item-details">
                <h4 class="cart-item-title">${item.name} <span style="font-size:0.8rem; font-weight:normal; color:#A3AED0;">(Taille: ${item.selectedSize})</span></h4>
                <p class="cart-item-price">${item.price.toLocaleString()} FCFA</p>
                <div class="cart-item-actions">
                    <div style="display:flex; align-items:center; gap:0.5rem;">
                        <button class="quantity-btn decrease" onclick="updateQuantity(${index}, -1)">-</button>
                        <span>${item.quantity}</span>
                        <button class="quantity-btn increase" onclick="updateQuantity(${index}, 1)">+</button>
                    </div>
                    <button class="remove-btn" onclick="cart.splice(${index}, 1); updateCartUI();"><i data-lucide="trash-2"></i> Supprimer</button>
                </div>
            </div>
        `;
        cartItems.appendChild(itemEl);
    });
    
    cartTotalPrice.textContent = total.toLocaleString() + ' FCFA';
    lucide.createIcons();
    
    cartTotalPrice.textContent = total.toLocaleString() + ' FCFA';
    lucide.createIcons();
}

function setupModals() {
    const cartModal = document.getElementById('cart-modal');
    const checkoutModal = document.getElementById('checkout-modal');
    const authModal = document.getElementById('auth-modal');
    
    // --- Auth Modal & Dropdown ---
    const menuLoginBtn = document.getElementById('menu-login-btn');
    if (menuLoginBtn) {
        menuLoginBtn.addEventListener('click', () => {
            authModal.classList.add('open');
        });
    }

    const menuLogoutBtn = document.getElementById('menu-logout-btn');
    if (menuLogoutBtn) {
        menuLogoutBtn.addEventListener('click', () => {
            if (currentUser) {
                currentUser = null;
                localStorage.removeItem('clientUser');
                updateAuthUI();
            }
        });
    }
    
    document.getElementById('close-auth-btn').addEventListener('click', () => authModal.classList.remove('open'));
    document.getElementById('auth-overlay').addEventListener('click', () => authModal.classList.remove('open'));
    
    const authToggleBtn = document.getElementById('toggle-auth-mode');
    if (authToggleBtn) {
        authToggleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            isSignupMode = !isSignupMode;
            document.getElementById('auth-title').textContent = isSignupMode ? "Inscription" : "Connexion";
            document.getElementById('auth-submit-btn').textContent = isSignupMode ? "S'inscrire" : "Se connecter";
            document.getElementById('auth-signup-fields').style.display = isSignupMode ? "block" : "none";
            document.getElementById('auth-email-label').textContent = isSignupMode ? "Email" : "Email ou Prénom et Nom";
            document.getElementById('auth-email').placeholder = isSignupMode ? "votre@email.com" : "votre@email.com ou Alioune Fall";
            document.getElementById('auth-email').type = isSignupMode ? "email" : "text";
            document.getElementById('auth-name').required = isSignupMode;
            document.getElementById('auth-phone').required = isSignupMode;
            document.getElementById('auth-address').required = isSignupMode;
            e.currentTarget.textContent = isSignupMode ? "Déjà un compte ? Se connecter" : "Pas encore de compte ? S'inscrire";
        });
    }
    
    document.getElementById('auth-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const loginIdentifier = document.getElementById('auth-email').value.trim();
        const name = document.getElementById('auth-name').value.trim();
        const phone = document.getElementById('auth-phone').value.trim();
        const address = document.getElementById('auth-address').value.trim();
        
        let userToSave = null;
        
        if (isSignupMode) {
            userToSave = { 
                email: loginIdentifier,
                name: name,
                phone: phone,
                address: address
            };
            // Sauvegarder dans notre "fausse BDD" locale
            localStorage.setItem('demoUserDB_' + loginIdentifier, JSON.stringify(userToSave));
        } else {
            // Mode connexion : recherche par email ou nom
            let foundUser = null;
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key.startsWith('demoUserDB_')) {
                    const user = JSON.parse(localStorage.getItem(key));
                    if (user.email.toLowerCase() === loginIdentifier.toLowerCase() || 
                        (user.name && user.name.toLowerCase() === loginIdentifier.toLowerCase())) {
                        foundUser = user;
                        break;
                    }
                }
            }
            
            if (foundUser) {
                userToSave = foundUser;
            } else {
                // Compte inexistant localement, création temporaire pour la démo
                userToSave = { 
                    email: loginIdentifier.includes('@') ? loginIdentifier : 'client@anrif.com', 
                    name: loginIdentifier.includes('@') ? loginIdentifier.split('@')[0] : loginIdentifier 
                };
            }
        }
        
        currentUser = userToSave;
        localStorage.setItem('clientUser', JSON.stringify(currentUser));
        
        // Remplir auto le checkout
        fillCheckoutFromUser();
        
        authModal.classList.remove('open');
        updateAuthUI();
    });
    
    // Check local storage for existing session
    const savedUser = localStorage.getItem('clientUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        updateAuthUI();
        fillCheckoutFromUser();
    }

    
    // --- Notification Modal ---
    const notifModal = document.getElementById('notif-modal');
    const notifCount = document.getElementById('notif-count');
    
    document.getElementById('open-notif-btn').addEventListener('click', () => {
        if(notifModal) notifModal.classList.add('open');
    });
    
    document.getElementById('close-notif-btn').addEventListener('click', () => {
        if(notifModal) notifModal.classList.remove('open');
    });
    document.getElementById('notif-overlay').addEventListener('click', () => {
        if(notifModal) notifModal.classList.remove('open');
    });
    
    const markReadBtn = document.getElementById('mark-read-btn');
    if(markReadBtn) {
        markReadBtn.addEventListener('click', () => {
            if(notifCount) notifCount.style.display = 'none'; // Hide badge
            if(notifModal) notifModal.classList.remove('open');
            // In a real app, update DB to mark as read
        });
    }

    // --- Cart Modal ---
    document.getElementById('open-cart-btn').addEventListener('click', () => {
        cartModal.classList.add('open');
    });
    
    document.getElementById('close-cart-btn').addEventListener('click', () => {
        cartModal.classList.remove('open');
    });
    document.getElementById('cart-overlay').addEventListener('click', () => {
        cartModal.classList.remove('open');
    });
    
    // --- Checkout Modal ---
    document.getElementById('checkout-btn').addEventListener('click', () => {
        if (cart.length === 0) return alert('Votre panier est vide');
        cartModal.classList.remove('open');
        checkoutModal.classList.add('open');
    });
    
    document.getElementById('close-checkout-btn').addEventListener('click', () => {
        checkoutModal.classList.remove('open');
    });
    document.getElementById('checkout-overlay').addEventListener('click', () => {
        checkoutModal.classList.remove('open');
    });
    
    // --- Payment Options Logic ---
    const paymentRadios = document.querySelectorAll('input[name="payment-method"]');
    const paymentInstructions = document.getElementById('payment-instructions');
    const paymentText = document.getElementById('payment-text');
    const transactionIdInput = document.getElementById('transaction-id');
    
    if (paymentRadios) {
        paymentRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                const method = e.target.value;
                if(method === 'wave') {
                    paymentInstructions.style.display = 'block';
                    paymentText.textContent = "Veuillez effectuer un transfert Wave au numéro ci-dessous, puis renseignez l'ID de transaction reçu par SMS.";
                    transactionIdInput.required = true;
                } else if(method === 'orange') {
                    paymentInstructions.style.display = 'block';
                    paymentText.textContent = "Veuillez effectuer un transfert Orange Money au numéro ci-dessous, puis renseignez l'ID de transaction reçu par SMS.";
                    transactionIdInput.required = true;
                } else {
                    paymentInstructions.style.display = 'none';
                    transactionIdInput.required = false;
                }
            });
        });
    }
    
    // --- Receipt Modal ---
    const receiptModal = document.getElementById('receipt-modal');
    document.getElementById('close-receipt-btn').addEventListener('click', () => {
        if(receiptModal) receiptModal.classList.remove('open');
    });
    document.getElementById('print-receipt-btn').addEventListener('click', () => {
        window.print();
    });
    
    // Soumettre Commande (Modifié plus tard pour Phase 2)
    document.getElementById('checkout-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const btn = document.getElementById('submit-order-btn');
        btn.textContent = "Envoi en cours...";
        btn.disabled = true;
        
        const name = document.getElementById('order-name').value;
        const phone = document.getElementById('order-phone').value;
        const address = document.getElementById('order-address').value;
        
        const paymentMethodEl = document.querySelector('input[name="payment-method"]:checked');
        const paymentMethod = paymentMethodEl ? paymentMethodEl.value : 'Non spécifié';
        const transactionId = document.getElementById('transaction-id').value || 'N/A';
        
        const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0) + 2000;
        
        const orderId = 'CMD-' + Math.floor(10000 + Math.random() * 90000);
        
        const orderData = {
            orderId,
            name,
            phone,
            address,
            paymentMethod,
            transactionId,
            items: cart,
            total,
            status: (paymentMethod === 'cash') ? 'En attente de livraison' : 'En attente de validation',
            createdAt: db ? firebase.firestore.FieldValue.serverTimestamp() : new Date()
        };
        
        try {
            if(db) {
                await db.collection("orders").add(orderData);
            } else {
                console.log("Mode démo: Commande fictive");
                await new Promise(r => setTimeout(r, 1000));
            }
            
            // Generate receipt
            const receiptContent = document.getElementById('receipt-content');
            if (receiptContent) {
                let itemsHtml = orderData.items.map(item => `
                    <div style="display:flex; justify-content:space-between; font-size:0.9rem; margin-bottom:0.5rem; border-bottom:1px solid #EEE; padding-bottom:0.5rem;">
                        <span>${item.quantity}x ${item.name} <span style="font-size:0.75rem; color:#888;">(Taille: ${item.selectedSize || item.size || 'Unique'})</span></span>
                        <span>${(item.price * item.quantity).toLocaleString()} FCFA</span>
                    </div>
                `).join('');
                
                receiptContent.innerHTML = `
                    <div style="display:flex; justify-content:space-between; margin-bottom:1rem; border-bottom:2px solid var(--border); padding-bottom:1rem;">
                        <div>
                            <p style="font-size:0.85rem; color:var(--text-muted);">N° Commande</p>
                            <p style="font-weight:bold; color:var(--text-main);">${orderData.orderId}</p>
                        </div>
                        <div style="text-align:right;">
                            <p style="font-size:0.85rem; color:var(--text-muted);">Date</p>
                            <p style="font-weight:bold; color:var(--text-main);">${new Date().toLocaleDateString('fr-FR')}</p>
                        </div>
                    </div>
                    
                    <div style="margin-bottom:1rem;">
                        <h4 style="font-size:0.9rem; color:var(--text-muted); margin-bottom:0.5rem;">Client</h4>
                        <p style="font-size:0.95rem;">${orderData.name}<br>${orderData.phone}<br><span style="font-size:0.85rem;">${orderData.address}</span></p>
                    </div>
                    
                    <div style="margin-bottom:1.5rem;">
                        <h4 style="font-size:0.9rem; color:var(--text-muted); margin-bottom:0.5rem;">Articles</h4>
                        ${itemsHtml}
                        <div style="display:flex; justify-content:space-between; font-size:0.9rem; margin-top:0.5rem;">
                            <span>Frais de livraison</span>
                            <span>2 000 FCFA</span>
                        </div>
                    </div>
                    
                    <div style="display:flex; justify-content:space-between; align-items:center; background:var(--white); padding:1rem; border-radius:8px;">
                        <span style="font-weight:bold; color:var(--text-main);">Total</span>
                        <span style="font-weight:bold; font-size:1.2rem; color:var(--primary);">${orderData.total.toLocaleString()} FCFA</span>
                    </div>
                    
                    <div style="margin-top:1rem; text-align:center; font-size:0.85rem; color:var(--text-muted);">
                        <p>Moyen de paiement : <strong>${orderData.paymentMethod.toUpperCase()}</strong></p>
                        <p>Statut : <strong>${orderData.status}</strong></p>
                    </div>
                `;
            }
            
            cart = [];
            updateCartUI();
            checkoutModal.classList.remove('open');
            document.getElementById('checkout-form').reset();
            if(receiptModal) {
                receiptModal.classList.add('open');
                lucide.createIcons();
            } else {
                alert('Merci ! Votre commande a été enregistrée.');
            }
            
        } catch (error) {
            console.error("Erreur:", error);
            alert('Erreur.');
        } finally {
            btn.textContent = "Confirmer la Commande";
            btn.disabled = false;
        }
    });
}

function fillCheckoutFromUser() {
    if (!currentUser) return;
    const nameInput = document.getElementById('order-name');
    const phoneInput = document.getElementById('order-phone');
    const addressInput = document.getElementById('order-address');
    
    if (nameInput && currentUser.name) nameInput.value = currentUser.name;
    if (phoneInput && currentUser.phone) phoneInput.value = currentUser.phone;
    if (addressInput && currentUser.address) addressInput.value = currentUser.address;
}

function updateAuthUI() {
    const authBtnText = document.getElementById('auth-btn-text');
    const loggedOutMenu = document.getElementById('auth-menu-logged-out');
    const loggedInMenu = document.getElementById('auth-menu-logged-in');
    const menuUserName = document.getElementById('menu-user-name');
    
    if (!authBtnText || !loggedOutMenu || !loggedInMenu) return;
    
    if (currentUser) {
        authBtnText.textContent = currentUser.name.split(' ')[0]; // Prénom seulement
        loggedOutMenu.style.display = 'none';
        loggedInMenu.style.display = 'block';
        if (menuUserName) menuUserName.textContent = currentUser.name;
    } else {
        authBtnText.textContent = "Se connecter";
        loggedOutMenu.style.display = 'block';
        loggedInMenu.style.display = 'none';
    }
    lucide.createIcons();
}

// --- ADMIN MODAL LOGIC (Single Page App approach) ---
document.addEventListener('DOMContentLoaded', () => {
    const productModal = document.getElementById('product-modal');
    if (productModal) {
        document.getElementById('close-product-btn').addEventListener('click', () => productModal.classList.remove('open'));
        document.getElementById('close-product-overlay').addEventListener('click', () => productModal.classList.remove('open'));
        document.getElementById('cancel-product-btn').addEventListener('click', () => productModal.classList.remove('open'));

        const fileInput = document.getElementById('prod-img-file');
        const hiddenImgInput = document.getElementById('prod-img-base64');
        const previewContainer = document.getElementById('img-preview-container');
        const imgPreview = document.getElementById('img-preview');
        const dropzone = document.getElementById('image-dropzone');
        const removeImgBtn = document.getElementById('remove-img-btn');

        if(dropzone) {
            dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.style.borderColor = 'var(--primary)'; dropzone.style.background = '#F0F9FF'; });
            dropzone.addEventListener('dragleave', (e) => { e.preventDefault(); dropzone.style.borderColor = '#CBD5E1'; dropzone.style.background = '#F8FAFC'; });
            dropzone.addEventListener('drop', (e) => {
                e.preventDefault();
                dropzone.style.borderColor = '#CBD5E1'; dropzone.style.background = '#F8FAFC';
                if(e.dataTransfer.files.length) {
                    fileInput.files = e.dataTransfer.files;
                    handleShopFileSelect(e.dataTransfer.files[0]);
                }
            });
        }

        if(fileInput) {
            fileInput.addEventListener('change', function(e) {
                if (e.target.files.length) handleShopFileSelect(e.target.files[0]);
            });
        }

        function handleShopFileSelect(file) {
            if (file) {
                const reader = new FileReader();
                reader.onload = function(event) {
                    const img = new Image();
                    img.onload = function() {
                        const canvas = document.createElement('canvas');
                        const MAX_WIDTH = 800; const MAX_HEIGHT = 800;
                        let width = img.width; let height = img.height;
                        if (width > height) { if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; } } 
                        else { if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; } }
                        canvas.width = width; canvas.height = height;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0, width, height);
                        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                        
                        hiddenImgInput.value = dataUrl;
                        imgPreview.src = dataUrl;
                        dropzone.style.display = 'none';
                        previewContainer.style.display = 'block';
                        fileInput.removeAttribute('required');
                    };
                    img.src = event.target.result;
                };
                reader.readAsDataURL(file);
            }
        }

        if(removeImgBtn) {
            removeImgBtn.addEventListener('click', () => {
                hiddenImgInput.value = ''; fileInput.value = '';
                previewContainer.style.display = 'none'; dropzone.style.display = 'flex';
                fileInput.setAttribute('required', 'required');
            });
        }

        const addProductForm = document.getElementById('add-product-form');
        if(addProductForm) {
            addProductForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const btn = document.getElementById('save-product-btn');
                btn.textContent = "Sauvegarde...";
                btn.disabled = true;

                const newProduct = {
                    id: "demo_prod_" + Date.now(),
                    name: document.getElementById('prod-name').value,
                    price: Number(document.getElementById('prod-price').value),
                    size: document.getElementById('prod-size').value,
                    category: document.getElementById('prod-category').value,
                    img: document.getElementById('prod-img-base64').value
                };
                
                products.unshift(newProduct);
                localStorage.setItem('demoProducts', JSON.stringify(products));
                
                productModal.classList.remove('open');
                addProductForm.reset();
                previewContainer.style.display = 'none';
                dropzone.style.display = 'flex';
                hiddenImgInput.value = '';
                fileInput.setAttribute('required', 'required');
                
                btn.textContent = "Ajouter sur le site";
                btn.disabled = false;
                
                renderFeaturedProducts();
                renderProducts(); // Re-render instantly!
            });
        }
    }
});
