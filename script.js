// Global variables
let products = [];
let notifications = [];
let scannerActive = false;

// DOM Elements
const serialInput = document.getElementById('serial-input');
const manualScanBtn = document.getElementById('manual-scan-btn');
const startCameraBtn = document.getElementById('start-camera');
const stopCameraBtn = document.getElementById('stop-camera');
const productList = document.getElementById('product-list');
const notificationList = document.getElementById('notification-list');
const productSearch = document.getElementById('product-search');
const totalProductsEl = document.getElementById('total-products');
const productsSoldEl = document.getElementById('products-sold');
const totalSalesEl = document.getElementById('total-sales');
const videoPreview = document.getElementById('video-preview');

// API URLs
const API_URL = 'http://localhost:3000';

// Fetch all products from API
async function fetchProducts() {
    showLoading(productList);
    try {
        const response = await fetch(`${API_URL}/products`);
        products = await response.json();
        updateStats();
        renderProductList(products);
    } catch (error) {
        console.error('Error fetching products:', error);
        addNotification('Error loading products', 'alert');
        productList.innerHTML = '<div class="error-message">Failed to load products. Please try again.</div>';
    }
}

// Fetch notifications from API
async function fetchNotifications() {
    showLoading(notificationList);
    try {
        const response = await fetch(`${API_URL}/notifications`);
        notifications = await response.json();
        renderNotifications();
    } catch (error) {
        console.error('Error fetching notifications:', error);
        notificationList.innerHTML = '<div class="error-message">Failed to load notifications.</div>';
    }
}

// Show loading indicator
function showLoading(element) {
    element.innerHTML = '<div class="loading"></div>';
}

// Scan product by serial number
async function scanProduct(serialNumber) {
    try {
        const response = await fetch(`${API_URL}/products?serialNumber=${serialNumber}`);
        const matchedProducts = await response.json();
        
        if (matchedProducts.length > 0) {
            const product = matchedProducts[0];
            
            if (product.status === 'in-stock') {
                // Mark product as sold
                await updateProductStatus(product.id, 'sold');
                addNotification(`Product sold: ${product.name} (${product.serialNumber})`, 'sale');
                // Play success sound
                playSound('success');
            } else {
                addNotification(`Product already sold: ${product.name} (${product.serialNumber})`, 'alert');
                // Play alert sound
                playSound('alert');
            }
        } else {
            addNotification(`No product found with serial number: ${serialNumber}`, 'alert');
            // Play alert sound
            playSound('alert');
        }
        
        // Clear input after scan
        serialInput.value = '';
        
        // Refresh product list
        await fetchProducts();
        
    } catch (error) {
        console.error('Error scanning product:', error);
        addNotification('Error scanning product', 'alert');
    }
}

// Play sound effect
function playSound(type) {
    // This is a placeholder - in a real app you'd implement actual sounds
    console.log(`Playing ${type} sound`);
}

// Update product status (in-stock or sold)
async function updateProductStatus(productId, status) {
    try {
        const response = await fetch(`${API_URL}/products/${productId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status })
        });
        
        return await response.json();
        
    } catch (error) {
        console.error('Error updating product status:', error);
        throw error;
    }
}

// Add new notification
async function addNotification(message, type = 'sale') {
    const notification = {
        id: Date.now(),
        message,
        type,
        timestamp: new Date().toISOString()
    };
    
    try {
        // Save notification to API
        const response = await fetch(`${API_URL}/notifications`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(notification)
        });
        
        // Add to local notifications
        notifications.unshift(notification);
        
        // Keep only the 20 most recent notifications
        if (notifications.length > 20) {
            notifications.pop();
        }
        
        // Update UI
        renderNotifications();
        
    } catch (error) {
        console.error('Error saving notification:', error);
    }
}

// Render product list
function renderProductList(productsToRender) {
    if (productsToRender.length === 0) {
        productList.innerHTML = '<div class="empty-message">No products found</div>';
        return;
    }

    productList.innerHTML = '';
    
    productsToRender.forEach(product => {
        const productEl = document.createElement('div');
        productEl.classList.add('product-item');
        
        productEl.innerHTML = `
            <div class="product-info">
                <div class="product-name">${product.name}</div>
                <div class="product-serial">SN: ${product.serialNumber}</div>
                <div class="product-price">$${product.price.toFixed(2)}</div>
                <div class="product-status ${product.status}">${product.status === 'in-stock' ? 'In Stock' : 'Sold'}</div>
            </div>
            <div class="product-actions">
                ${product.status === 'in-stock' ? 
                  `<button class="btn btn-primary mark-sold" data-id="${product.id}">Mark as Sold</button>` : 
                  ''}
            </div>
        `;
        
        productList.appendChild(productEl);
    });
    
    // Add event listeners to "Mark as Sold" buttons
    document.querySelectorAll('.mark-sold').forEach(button => {
        button.addEventListener('click', async () => {
            const productId = button.getAttribute('data-id');
            await updateProductStatus(productId, 'sold');
            
            // Get product details for notification
            const product = products.find(p => p.id == productId);
            addNotification(`Product sold: ${product.name} (${product.serialNumber})`, 'sale');
            
            // Refresh product list
            await fetchProducts();
        });
    });
}

// Render notifications
function renderNotifications() {
    if (notifications.length === 0) {
        notificationList.innerHTML = '<div class="empty-message">No notifications yet</div>';
        return;
    }

    notificationList.innerHTML = '';
    
    notifications.forEach(notification => {
        const notificationEl = document.createElement('div');
        notificationEl.classList.add('notification-item');
        
        const timestamp = new Date(notification.timestamp);
        const timeString = timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        
        notificationEl.innerHTML = `
            <div class="notification-icon ${notification.type}">
                ${notification.type === 'sale' ? '💰' : '⚠️'}
            </div>
            <div class="notification-content">
                <div class="notification-title">${notification.message}</div>
                <div class="notification-time">${timeString}</div>
            </div>
        `;
        
        notificationList.appendChild(notificationEl);
    });
}

// Update statistics
function updateStats() {
    const totalProducts = products.length;
    const soldProducts = products.filter(p => p.status === 'sold').length;
    const totalSales = products
        .filter(p => p.status === 'sold')
        .reduce((total, product) => total + product.price, 0);
    
    totalProductsEl.textContent = totalProducts;
    productsSoldEl.textContent = soldProducts;
    totalSalesEl.textContent = `$${totalSales.toFixed(2)}`;
}

// Initialize barcode scanner
function initBarcodeScanner() {
    Quagga.init({
        inputStream: {
            name: "Live",
            type: "LiveStream",
            target: document.querySelector("#video-preview"),
            constraints: {
                width: 640,
                height: 480,
                facingMode: "environment"
            },
        },
        decoder: {
            readers: [
                "code_128_reader",
                "ean_reader",
                "ean_8_reader",
                "code_39_reader",
                "upc_reader",
                "upc_e_reader"
            ]
        }
    }, function(err) {
        if (err) {
            console.error("Error initializing Quagga:", err);
            addNotification("Could not start camera scanner", "alert");
            return;
        }
        scannerActive = true;
        Quagga.start();
        
        // Add scanning animation
        document.getElementById('scanner-view').classList.add('scanning');
    });
    
    // When a barcode is detected
    Quagga.onDetected(function(result) {
        if (result.codeResult) {
            const code = result.codeResult.code;
            serialInput.value = code;
            scanProduct(code);
            
            // Briefly pause to avoid multiple scans
            Quagga.pause();
            setTimeout(() => {
                if (scannerActive) {
                    Quagga.start();
                }
            }, 2000);
        }
    });
}

// Stop barcode scanner
function stopBarcodeScanner() {
    if (scannerActive) {
        Quagga.stop();
        scannerActive = false;
        document.getElementById('scanner-view').classList.remove('scanning');
    }
}

// Event Listeners
manualScanBtn.addEventListener('click', () => {
    const serialNumber = serialInput.value.trim();
    if (serialNumber) {
        scanProduct(serialNumber);
    } else {
        addNotification('Please enter a serial number', 'alert');
    }
});

serialInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const serialNumber = serialInput.value.trim();
        if (serialNumber) {
            scanProduct(serialNumber);
        } else {
            addNotification('Please enter a serial number', 'alert');
        }
    }
});

startCameraBtn.addEventListener('click', () => {
    initBarcodeScanner();
});

stopCameraBtn.addEventListener('click', () => {
    stopBarcodeScanner();
});

productSearch.addEventListener('input', () => {
    const searchTerm = productSearch.value.toLowerCase();
    const filteredProducts = products.filter(product => 
        product.name.toLowerCase().includes(searchTerm) || 
        product.serialNumber.toLowerCase().includes(searchTerm)
    );
    renderProductList(filteredProducts);
});

// Initialize app
async function initApp() {
    await fetchProducts();
    await fetchNotifications();
}

// Start the app when DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);