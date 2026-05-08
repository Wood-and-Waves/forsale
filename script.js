// --- YOUR SETTINGS ---
const sheetCSVUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTVrfaoWolZWM7pY-3obKbd4MZ0PWicUB9jzvgihfrovOAC4HWBrRS9w3DtOx3kugPr4gNbscfYfCno/pub?output=csv";
const contactEmail = "dan@woodandwaves.com"; 

const githubUsername = "wood-and-waves"; 
const githubRepo = "forsale";           
const githubBranch = "main"; 

// --- THE ENGINE (Fully Optimized with Caching & Navigation) ---

// Helper: Numerical Sort Function (ensures consistent order across pages)
function numericalIDSort(a, b) {
    const idA = parseFloat(a.ID) || 0;
    const idB = parseFloat(b.ID) || 0;
    return idA - idB; 
}

// Step 1: Get GitHub Map (with memory & hidden file filter)
async function fetchRepoMap() {
    const cachedMap = sessionStorage.getItem('woodAndWavesMap');
    if (cachedMap) return JSON.parse(cachedMap);

    try {
        const response = await fetch(`https://api.github.com/repos/${githubUsername}/${githubRepo}/git/trees/${githubBranch}?recursive=1`);
        const data = await response.json();
        
        if (data.tree) {
            // NEW LOGIC: Only grab files that end in actual image extensions
            const validExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
            
            const files = data.tree.filter(file => {
                const isFile = file.type === 'blob';
                const inImagesFolder = file.path.startsWith('images/');
                // Check if the file ends with one of our valid extensions
                const isRealImage = validExtensions.some(ext => file.path.toLowerCase().endsWith(ext));
                
                return isFile && inImagesFolder && isRealImage;
            });
            
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
        const cachedData = sessionStorage.getItem('woodAndWavesInventory');
        if (cachedData) {
            resolve(JSON.parse(cachedData));
            return;
        }

        Papa.parse(sheetCSVUrl, {
            download: true,
            header: true,
            complete: function(results) { 
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

// Step 3: Load the Homepage (NOW WITH CLICKABLE CARDS)
async function loadHomepage() {
    if(!document.getElementById('product-list')) return;

    const [repoFiles, rawData] = await Promise.all([fetchRepoMap(), fetchInventory()]);

    const sortedData = rawData.sort(numericalIDSort);

    document.getElementById('loading').style.display = 'none';
    const container = document.getElementById('product-list');

    sortedData.forEach(item => {
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

        // NEW LOGIC: Make the entire card a clickable link
        const card = document.createElement('a'); 
        card.href = `item.html?id=${item.ID}`;
        card.className = 'card';
        card.style.textDecoration = 'none'; // Prevents link underlines
        card.style.color = 'inherit';       // Keeps the text color normal
        card.style.display = 'block';       // Ensures the box stays a box

        // Note: The "View Details" link is now a <span> so it doesn't conflict with the main card link
        card.innerHTML = `
            <img src="${imageSrc}" alt="${item.Name}">
            <h2>${item.Name}</h2>
            <div class="price">${item.Price}</div>
            <span class="btn">View Details</span> 
        `;
        container.appendChild(card);
    });
}
// Step 4: Load the Item Details Page (NOW WITH NAVIGATION)
async function loadItemDetails() {
    const urlParams = new URLSearchParams(window.location.search);
    const itemId = urlParams.get('id');

    if (!itemId) {
        document.getElementById('loading').innerText = "Item not found.";
        return;
    }

    const [repoFiles, rawData] = await Promise.all([fetchRepoMap(), fetchInventory()]);

    document.getElementById('loading').style.display = 'none';
    const mainContainer = document.getElementById('item-details');
    const navContainer = document.getElementById('item-nav');

    const item = rawData.find(row => row.ID === itemId);

    if (item) {
        if (item.Status && item.Status.trim().toLowerCase() === 'sold') {
            mainContainer.innerHTML = "<h2>Item Sold</h2><p>Sorry, this item has already been sold and is no longer available.</p>";
            navContainer.style.display = 'none'; // Hide nav on sold page
            return;
        }

        // --- Render Item Details ---
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

        mainContainer.innerHTML = `
            <div class="item-image gallery">
                ${imagesHTML}
            </div>
            <div class="item-info">
                <h2>${item.Name}</h2>
                <div class="price">${item.Price}</div>
                <p>${item.Description}</p>
                <a href="mailto:${contactEmail}?subject=Item Inquiry: ${item.Name}" class="btn" style="background-color: #e67e22;">Contact to Buy</a>
            </div>
        `;

        // --- Render Next/Previous Navigation (NEW LOGIC) ---
        
        // Filter out sold items so navigation only points to available gear
        const availableData = rawData.filter(i => {
            if (!i.ID || !i.Name) return false;
            if (i.Status && i.Status.trim().toLowerCase() === 'sold') return false;
            return true;
        });

        // Ensure navigation order matches the homepage sort
        const sortedAvailable = availableData.sort(numericalIDSort);

        // Find current item index
        const currentIndex = sortedAvailable.findIndex(i => i.ID === itemId);
        
        if (currentIndex !== -1) {
            const prevItem = sortedAvailable[currentIndex - 1];
            const nextItem = sortedAvailable[currentIndex + 1];

            let navHTML = '';
            
            if (prevItem) {
                // Shorten name if it's too long for the button
                const prevName = prevItem.Name.length > 30 ? prevItem.Name.substring(0, 27) + '...' : prevItem.Name;
                const extraClass = (!nextItem) ? 'only-prev' : ''; // Special alignment CSS
                navHTML += `<a href="item.html?id=${prevItem.ID}" class="nav-btn ${extraClass}">&larr; Previous: ${prevName}</a>`;
            }

            if (nextItem) {
                // Shorten name if it's too long for the button
                const nextName = nextItem.Name.length > 30 ? nextItem.Name.substring(0, 27) + '...' : nextItem.Name;
                const extraClass = (!prevItem) ? 'only-next' : ''; // Special alignment CSS
                navHTML += `<a href="item.html?id=${nextItem.ID}" class="nav-btn ${extraClass}">Next: ${nextName} &rarr;</a>`;
            }

            navContainer.innerHTML = navHTML;
        }

    } else {
        mainContainer.innerHTML = "<p>Item not found.</p>";
        navContainer.style.display = 'none';
    }
}

// Fire the correct function based on the page
if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/' || window.location.pathname === '') {
    window.onload = loadHomepage;
} else if (window.location.pathname.endsWith('item.html')) {
    window.onload = loadItemDetails;
}