// js/admin.js

// Elements
const loginScreen = document.getElementById('login-screen');
const dashboardScreen = document.getElementById('dashboard-screen');
const loginForm = document.getElementById('login-form');
const logoutBtn = document.getElementById('logout-btn');
const ordersTbody = document.getElementById('orders-tbody');
const refreshBtn = document.getElementById('refresh-btn');

let currentOrders = [];
let currentProducts = [];

// Navigation elements
const navOrders = document.getElementById('nav-orders');
const navProducts = document.getElementById('nav-products');
const viewOrders = document.getElementById('view-orders');
const viewProducts = document.getElementById('view-products');

// Products Modal elements
const productModal = document.getElementById('product-modal');
const addProductForm = document.getElementById('add-product-form');

// Initialize Icons
lucide.createIcons();

// --- AUTHENTICATION ---
if (auth) {
    auth.onAuthStateChanged((user) => {
        if (user) {
            // Connected
            loginScreen.classList.add('hidden');
            dashboardScreen.classList.remove('hidden');
            fetchOrders();
            fetchProducts();
        } else {
            // Not connected
            loginScreen.classList.remove('hidden');
            dashboardScreen.classList.add('hidden');
        }
    });
} else {
    // Mode démo par défaut
    loginScreen.classList.remove('hidden');
    dashboardScreen.classList.add('hidden');
}

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const btn = document.getElementById('login-btn');
    const errorMsg = document.getElementById('login-error');
    
    btn.textContent = "Connexion...";
    errorMsg.textContent = "";
    
    try {
        if(auth) {
            await auth.signInWithEmailAndPassword(email, password);
        } else {
            // Mode Démo - Vérification des identifiants
            if (email === 'admin' && password === 'admin123') {
                console.log("Mode démo: Connexion réussie");
                loginScreen.classList.add('hidden');
                dashboardScreen.classList.remove('hidden');
                loadDemoOrders();
                fetchProducts();
            } else {
                throw new Error("Identifiants incorrects");
            }
        }
    } catch (error) {
        console.error("Erreur de connexion:", error);
        errorMsg.textContent = "Email ou mot de passe incorrect.";
        btn.textContent = "Se connecter";
    }
});

logoutBtn.addEventListener('click', async () => {
    if(auth) {
        await auth.signOut();
    } else {
        window.location.reload();
    }
});

// --- ORDERS MANAGEMENT ---
async function fetchOrders() {
    if(!db) {
        return loadDemoOrders();
    }
    
    try {
        refreshBtn.innerHTML = '<i data-lucide="loader"></i> Chargement...';
        
        const snapshot = await db.collection("orders").orderBy("createdAt", "desc").get();
        
        currentOrders = [];
        snapshot.forEach((doc) => {
            currentOrders.push({ id: doc.id, ...doc.data() });
        });
        
        renderOrders();
        updateStats();
        
    } catch (error) {
        console.error("Erreur lors de la récupération des commandes:", error);
    } finally {
        refreshBtn.innerHTML = '<i data-lucide="refresh-cw"></i> Actualiser';
        lucide.createIcons();
    }
}

refreshBtn.addEventListener('click', fetchOrders);

function renderOrders() {
    ordersTbody.innerHTML = '';
    
    if(currentOrders.length === 0) {
        ordersTbody.innerHTML = '<tr><td colspan="6" style="text-align:center">Aucune commande trouvée.</td></tr>';
        return;
    }
    
    currentOrders.forEach(order => {
        const tr = document.createElement('tr');
        
        let badgeClass = 'pending';
        if (order.status === 'Validée') badgeClass = 'valid';
        if (order.status === 'Annulée') badgeClass = 'rejected';
        
        // Format date
        let dateStr = "N/A";
        if(order.createdAt && order.createdAt.toDate) {
            dateStr = order.createdAt.toDate().toLocaleDateString('fr-FR');
        } else if (order.createdAt) {
            dateStr = "Aujourd'hui (Démo)";
        }
        
        tr.innerHTML = `
            <td>#${order.id.toString().substring(0,6).toUpperCase()}</td>
            <td><strong>${order.name}</strong><br><small>${order.phone}</small></td>
            <td>${dateStr}</td>
            <td><strong>${order.total.toLocaleString()} FCFA</strong></td>
            <td><span class="badge ${badgeClass}">${order.status}</span></td>
            <td>
                <button class="btn btn-sm btn-outline view-order-btn" data-id="${order.id}">
                    <i data-lucide="eye"></i> Voir
                </button>
            </td>
        `;
        ordersTbody.appendChild(tr);
    });
    
    lucide.createIcons();
    
    document.querySelectorAll('.view-order-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.getAttribute('data-id');
            openOrderModal(id);
        });
    });
}

function updateStats() {
    const newOrders = currentOrders.filter(o => o.status === 'En attente').length;
    const validatedOrders = currentOrders.filter(o => o.status === 'Validée').length;
    const revenue = currentOrders.filter(o => o.status === 'Validée').reduce((sum, o) => sum + o.total, 0);
    
    document.getElementById('stat-new').textContent = newOrders;
    document.getElementById('stat-validated').textContent = validatedOrders;
    document.getElementById('stat-revenue').textContent = revenue.toLocaleString() + ' FCFA';
    
    renderCharts();
}

let productsChartInstance = null;
let ordersChartInstance = null;
let timeChartInstance = null;

function renderCharts() {
    if (typeof Chart === 'undefined') return;

    // 1. Articles les plus vendus
    const productCounts = {};
    currentOrders.forEach(order => {
        if (order.status !== 'Annulée') {
            order.items.forEach(item => {
                if (productCounts[item.name]) {
                    productCounts[item.name] += item.quantity;
                } else {
                    productCounts[item.name] = item.quantity;
                }
            });
        }
    });

    const productLabels = Object.keys(productCounts);
    const productData = Object.values(productCounts);

    const ctxProducts = document.getElementById('productsChart');
    if (ctxProducts) {
        if (productsChartInstance) productsChartInstance.destroy();
        productsChartInstance = new Chart(ctxProducts.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: productLabels.length ? productLabels : ['Aucune donnée'],
                datasets: [{
                    data: productData.length ? productData : [1],
                    backgroundColor: ['#E63946', '#457B9D', '#1D3557', '#A8DADC', '#F1FAEE'],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { position: 'bottom' } }
            }
        });
    }

    // 2. Commandes des 7 derniers jours (À la place des visites pour avoir des données réelles)
    const last7Days = [];
    const ordersPerDay = [];
    
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        last7Days.push(d.toLocaleDateString('fr-FR', { weekday: 'short' }));
        
        const count = currentOrders.filter(o => {
            if (!o.createdAt) return false;
            let orderDate = o.createdAt.toDate ? o.createdAt.toDate() : new Date(o.createdAt);
            return orderDate.getDate() === d.getDate() && orderDate.getMonth() === d.getMonth();
        }).length;
        ordersPerDay.push(count);
    }

    const ctxVisits = document.getElementById('visitsChart');
    if (ctxVisits) {
        if (ordersChartInstance) ordersChartInstance.destroy();
        ordersChartInstance = new Chart(ctxVisits.getContext('2d'), {
            type: 'bar',
            data: {
                labels: last7Days,
                datasets: [{
                    label: 'Commandes par jour',
                    data: ordersPerDay,
                    backgroundColor: '#E63946',
                    borderRadius: 5
                }]
            },
            options: {
                responsive: true,
                scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
            }
        });
    }

    // 3. Heures de visites (Diagramme en ligne - Simulé pour l'exemple)
    const hours = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00'];
    const mockVisits = [12, 35, 89, 45, 60, 112, 140, 55];

    const ctxTime = document.getElementById('timeChart');
    if (ctxTime) {
        if (timeChartInstance) timeChartInstance.destroy();
        timeChartInstance = new Chart(ctxTime.getContext('2d'), {
            type: 'line',
            data: {
                labels: hours,
                datasets: [{
                    label: 'Visiteurs (Moyenne)',
                    data: mockVisits,
                    borderColor: '#457B9D',
                    backgroundColor: 'rgba(69, 123, 157, 0.2)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#1D3557',
                    pointRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: { y: { beginAtZero: true } }
            }
        });
    }
}

// --- MODAL ---
const modal = document.getElementById('order-modal');
const modalBody = document.getElementById('order-details-body');
const modalActions = document.getElementById('order-modal-actions');

function openOrderModal(orderId) {
    const order = currentOrders.find(o => o.id === orderId);
    if(!order) return;
    
    let itemsHtml = order.items.map(item => `
        <div class="order-item">
            <span>${item.quantity}x ${item.name}</span>
            <span>${(item.price * item.quantity).toLocaleString()} FCFA</span>
        </div>
    `).join('');
    
    modalBody.innerHTML = `
        <div class="order-detail-group">
            <h4>Client</h4>
            <p><strong>${order.name}</strong> (${order.phone})</p>
        </div>
        <div class="order-detail-group">
            <h4>Adresse de livraison</h4>
            <p>${order.address}</p>
        </div>
        <div class="order-items-list">
            <h4>Articles</h4>
            ${itemsHtml}
            <div class="order-item" style="border-top:2px solid var(--border); font-weight:bold; margin-top:0.5rem; padding-top:0.5rem;">
                <span>Total (avec livraison)</span>
                <span>${order.total.toLocaleString()} FCFA</span>
            </div>
        </div>
    `;
    
    modalActions.innerHTML = '';
    if(order.status === 'En attente') {
        modalActions.innerHTML = `
            <button class="btn btn-outline" id="btn-reject-order">Annuler</button>
            <button class="btn btn-success" id="btn-validate-order">Valider le Paiement</button>
        `;
        
        document.getElementById('btn-validate-order').addEventListener('click', () => updateOrderStatus(order.id, 'Validée'));
        document.getElementById('btn-reject-order').addEventListener('click', () => updateOrderStatus(order.id, 'Annulée'));
    } else {
        modalActions.innerHTML = `<button class="btn btn-outline" onclick="document.getElementById('order-modal').classList.remove('open')">Fermer</button>`;
    }
    
    modal.classList.add('open');
}

document.getElementById('close-modal-btn').addEventListener('click', () => modal.classList.remove('open'));
document.getElementById('close-modal-overlay').addEventListener('click', () => modal.classList.remove('open'));

async function updateOrderStatus(orderId, newStatus) {
    try {
        if(db) {
            await db.collection("orders").doc(orderId).update({ status: newStatus });
        } else {
            // Mode démo
            const o = currentOrders.find(x => x.id === orderId);
            if(o) o.status = newStatus;
        }
        
        modal.classList.remove('open');
        fetchOrders();
        
    } catch (error) {
        console.error("Erreur de mise à jour:", error);
        alert("Erreur lors de la mise à jour.");
    }
}

// --- DEMO DATA ---
function loadDemoOrders() {
    currentOrders = [
        {
            id: "demox1",
            name: "Amadou Diallo",
            phone: "77 123 45 67",
            address: "Almadies, Dakar",
            status: "En attente",
            createdAt: new Date(),
            total: 27000,
            items: [{ name: "Veste Blazer Noir", price: 25000, quantity: 1 }]
        },
        {
            id: "demoy2",
            name: "Fatou Sow",
            phone: "78 987 65 43",
            address: "Plateau, Dakar",
            status: "Validée",
            createdAt: new Date(),
            total: 37000,
            items: [{ name: "Sac en Cuir Vintage", price: 35000, quantity: 1 }]
        }
    ];
    renderOrders();
    updateStats();
}

// --- NAVIGATION ---
navOrders.addEventListener('click', (e) => {
    e.preventDefault();
    navOrders.classList.add('active');
    navProducts.classList.remove('active');
    viewOrders.classList.remove('hidden');
    viewProducts.classList.add('hidden');
});

navProducts.addEventListener('click', (e) => {
    e.preventDefault();
    navProducts.classList.add('active');
    navOrders.classList.remove('active');
    viewProducts.classList.remove('hidden');
    viewOrders.classList.add('hidden');
});

// --- PRODUCTS MANAGEMENT ---
async function fetchProducts() {
    if(!db) {
        return loadDemoProducts();
    }
    
    try {
        const snapshot = await db.collection("products").orderBy("createdAt", "desc").get();
        currentProducts = [];
        snapshot.forEach((doc) => {
            currentProducts.push({ id: doc.id, ...doc.data() });
        });
        renderAdminProducts();
    } catch (error) {
        console.error("Erreur récupération produits:", error);
    }
}

function renderAdminProducts() {
    const grid = document.getElementById('admin-products-grid');
    grid.innerHTML = '';
    
    currentProducts.forEach(p => {
        const div = document.createElement('div');
        div.className = 'admin-product-card';
        div.innerHTML = `
            <img src="${p.img}" alt="${p.name}">
            <div class="admin-product-info">
                <span class="badge" style="background:#F4F7FE; color:var(--primary); font-size:0.75rem; padding:0.2rem 0.6rem; border-radius:4px; display:inline-block; margin-bottom:0.3rem;">${p.category || 'Non classé'}</span>
                <h3>${p.name} <span style="font-size:0.8rem; color:var(--text-muted); font-weight:normal;">(Taille: ${p.size || 'Unique'})</span></h3>
                <p>${p.price.toLocaleString()} FCFA</p>
                <button class="btn btn-sm btn-outline delete-product-btn" data-id="${p.id}" style="margin-top:0.5rem; width:100%; border-color:var(--danger); color:var(--danger);">
                    <i data-lucide="trash-2"></i> Supprimer
                </button>
            </div>
        `;
        grid.appendChild(div);
    });
    
    lucide.createIcons();
    
    document.querySelectorAll('.delete-product-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            if(confirm("Supprimer ce produit ?")) {
                const id = e.currentTarget.getAttribute('data-id');
                if(db) {
                    await db.collection("products").doc(id).delete();
                } else {
                    currentProducts = currentProducts.filter(p => p.id !== id);
                    localStorage.setItem('demoProducts', JSON.stringify(currentProducts));
                }
                fetchProducts();
            }
        });
    });
}

// Add product modal
document.getElementById('btn-open-add-product').addEventListener('click', () => productModal.classList.add('open'));
document.getElementById('close-product-btn').addEventListener('click', () => productModal.classList.remove('open'));
document.getElementById('close-product-overlay').addEventListener('click', () => productModal.classList.remove('open'));
document.getElementById('cancel-product-btn').addEventListener('click', () => productModal.classList.remove('open'));

// Handle Image Upload
const fileInput = document.getElementById('prod-img-file');
const hiddenImgInput = document.getElementById('prod-img-base64');
const previewContainer = document.getElementById('img-preview-container');
const imgPreview = document.getElementById('img-preview');
const dropzone = document.getElementById('image-dropzone');
const removeImgBtn = document.getElementById('remove-img-btn');

// Drag and drop effects
dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.style.borderColor = 'var(--primary)';
    dropzone.style.background = '#F0F9FF';
});
dropzone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    dropzone.style.borderColor = '#CBD5E1';
    dropzone.style.background = '#F8FAFC';
});
dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.style.borderColor = '#CBD5E1';
    dropzone.style.background = '#F8FAFC';
    if(e.dataTransfer.files.length) {
        fileInput.files = e.dataTransfer.files;
        handleFileSelect(e.dataTransfer.files[0]);
    }
});

fileInput.addEventListener('change', function(e) {
    if (e.target.files.length) {
        handleFileSelect(e.target.files[0]);
    }
});

function handleFileSelect(file) {
    if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            const img = new Image();
            img.onload = function() {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 800;
                const MAX_HEIGHT = 800;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                // Compression JPEG pour une compatibilité universelle et alléger le localStorage
                const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                
                hiddenImgInput.value = dataUrl;
                imgPreview.src = dataUrl;
                dropzone.style.display = 'none';
                previewContainer.style.display = 'block';
                fileInput.removeAttribute('required'); // Remove required so form can submit
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }
}

removeImgBtn.addEventListener('click', () => {
    hiddenImgInput.value = '';
    fileInput.value = '';
    previewContainer.style.display = 'none';
    dropzone.style.display = 'flex';
    fileInput.setAttribute('required', 'required');
});


addProductForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('save-product-btn');
    btn.textContent = "Sauvegarde...";
    btn.disabled = true;
    
    const newProduct = {
        name: document.getElementById('prod-name').value,
        price: Number(document.getElementById('prod-price').value),
        size: document.getElementById('prod-size').value,
        category: document.getElementById('prod-category').value,
        img: document.getElementById('prod-img-base64').value,
        createdAt: db ? firebase.firestore.FieldValue.serverTimestamp() : new Date()
    };
    
    try {
        if(db) {
            await db.collection("products").add(newProduct);
        } else {
            newProduct.id = "demo_prod_" + Date.now();
            currentProducts.unshift(newProduct);
            localStorage.setItem('demoProducts', JSON.stringify(currentProducts));
        }
        productModal.classList.remove('open');
        addProductForm.reset();
        previewContainer.style.display = 'none';
        dropzone.style.display = 'flex';
        hiddenImgInput.value = '';
        fileInput.setAttribute('required', 'required');
        
        if(!db) {
            renderAdminProducts(); // In demo mode, directly re-render
        } else {
            fetchProducts();
        }
    } catch (err) {
        alert("Erreur lors de l'ajout.");
    } finally {
        btn.textContent = "Enregistrer";
        btn.disabled = false;
    }
});

function loadDemoProducts() {
    const saved = localStorage.getItem('demoProducts');
    if (saved) {
        currentProducts = JSON.parse(saved);
    } else {
        currentProducts = [
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
        localStorage.setItem('demoProducts', JSON.stringify(currentProducts));
    }
    renderAdminProducts();
}

