// --- YOUR SETTINGS ---
const sheetCSVUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTVrfaoWolZWM7pY-3obKbd4MZ0PWicUB9jzvgihfrovOAC4HWBrRS9w3DtOx3kugPr4gNbscfYfCno/pub?output=csv";
const contactEmail = "dan@woodandwaves.com"; 

const githubUsername = "wood-and-waves"; 
const githubRepo = "forsale";           
const githubBranch = "main"; 

// --- THE ENGINE (SPEED UPGRADED) ---

// Step 1: Get GitHub Map (with memory)
async function fetchRepoMap() {
    // Check if the browser already memorized the map
    const cachedMap = sessionStorage.getItem('woodAndWavesMap');
    if (cachedMap) return JSON.parse(cachedMap);

    try {
        const response = await fetch(`https://api.github.com/repos/${githubUsername}/${githubRepo}/git/trees/${githubBranch}?recursive=1`);
        const data = await response.json();
        
        if (data.tree) {
            const files = data.tree.filter(file => file.path.startsWith('images/') && file.type === 'blob');
            // Save to memory for the next page click
            sessionStorage.setItem('woodAndWavesMap', JSON.stringify(files));
            return files;
        }
    } catch (error) {
        console.error("Could not fetch folder map from GitHub:", error);
        return [];
    }
}

// Step 2: Get Google Sheet Inventory (with memory)
function fetchInventory() {
    return new Promise((resolve, reject) => {
        // Check if the browser already memorized the inventory
        const cachedData = sessionStorage.getItem('woodAndWavesInventory');
        if (cachedData) {
            resolve(JSON.parse(cachedData));
            return;
        }

        Papa.parse(sheetCSVUrl, {
            download: true,
            header: true,
            complete: function(results) { 
                // Save to memory for the next page click
                sessionStorage.setItem('woodAndWavesInventory', JSON.stringify(results.data));
                resolve(results.data); 
            },
            error: function(err) {
                console.error("Error:", err);
                document.getElementById('loading').innerText = "Failed to load inventory.";
                reject(err);
            }
        });
    });
}

// Step 3: Load the Homepage Fast
async function loadHomepage() {
    if(!document.getElementById('product-list')) return;

    // Multitasking: Fetch Google and GitHub at the EXACT same time
    const [repoFiles, data] = await Promise.all([fetchRepoMap(), fetchInventory()]);

    document.getElementById('loading').style.display = 'none';
    const container = document.getElementById('product-list');

    data.forEach(item => {
        if (!item.ID || !item.Name) return;
        if (item.Status && item.Status.trim().toLowerCase() === 'sold') return;

        const folderName = item.Image ? item.Image.trim() : '';
        const itemImages = repoFiles.filter(file => file.path.startsWith(`images/${folderName}/`));
        
        let targetImagePath = '';
        
        if (itemImages.length > 0) {
            const coverImage = itemImages.find(img => img.path.toLowerCase().includes('cover'));
            targetImagePath = coverImage ? coverImage.path : itemImages[0].path;
        }

        const imageSrc = targetImagePath ? `https://cdn.jsdelivr.net/gh/${githubUsername}/${githubRepo}@${githubBranch}/${targetImagePath}` : 'https://via.placeholder.com/250?text=No+Image';

        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <img src="${imageSrc}" alt="${item.Name}">
            <h2>${item.Name}</h2>
            <div class="price">${item.Price}</div>
            <a href="item.html?id=${item.ID}" class="btn">View Details</a>
        `;
        container.appendChild(card);
    });
}

// Step 4: Load the Item Details Page Fast
async function loadItemDetails() {
    const urlParams = new URLSearchParams(window.location.search);
    const itemId = urlParams.get('id');

    if (!itemId) {
        document.getElementById('loading').innerText = "Item not found.";
        return;
    }

    // Multitasking: Fetch Google and GitHub at the EXACT same time
    const [repoFiles, data] = await Promise.all([fetchRepoMap(), fetchInventory()]);

    document.getElementById('loading').style.display = 'none';
    const container = document.getElementById('item-details');
    const item = data.find(row => row.ID === itemId);

    if (item) {
        if (item.Status && item.Status.trim().toLowerCase() === 'sold') {
            container.innerHTML = "<h2>Item Sold</h2><p>Sorry, this item has already been sold and is no longer available.</p>";
            return;
        }

        const folderName = item.Image ? item.Image.trim() : '';
        const itemImages = repoFiles.filter(file => file.path.startsWith(`images/${folderName}/`));
        
        let imagesHTML = '';
        if (itemImages.length > 0) {
            itemImages.forEach(img => {
                const imgSrc = `https://cdn.jsdelivr.net/gh/${githubUsername}/${githubRepo}@${githubBranch}/${img.path}`;
                imagesHTML += `<img src="${imgSrc}" alt="${item.Name}">`;
            });
        } else {
            imagesHTML = `<img src="https://via.placeholder.com/500?text=No+Image" alt="No images found">`;
        }

        container.innerHTML = `
            <div class="item-image gallery">
                ${imagesHTML}
            </div>
            <div class="item-info">
                <h2>${item.Name}</h2>
                <div class="price">${item.Price}</div>
                <p>${item.Description}</p>
                <a href="mailto:${contactEmail}?subject=Wood & Waves Inquiry: ${item.Name}" class="btn" style="background-color: #e67e22;">Contact to Buy</a>
            </div>
        `;
    } else {
        container.innerHTML = "<p>Item not found.</p>";
    }
}

// Fire the correct function based on the page
if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/' || window.location.pathname === '') {
    window.onload = loadHomepage;
} else if (window.location.pathname.endsWith('item.html')) {
    window.onload = loadItemDetails;
}
