// --- YOUR SETTINGS ---
const sheetCSVUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTVrfaoWolZWM7pY-3obKbd4MZ0PWicUB9jzvgihfrovOAC4HWBrRS9w3DtOx3kugPr4gNbscfYfCno/pub?output=csv";
const contactEmail = "dan@woodandwaves.com"; 

const githubUsername = "wood-and-waves"; 
const githubRepo = "forsale";           
const githubBranch = "main"; // Note: If your default branch is called "master" instead of "main", change this word.

// --- THE ENGINE ---
let repoFiles = [];

// Step 1: Ask GitHub for a map of all your files
async function fetchRepoMap() {
    try {
        const response = await fetch(`https://api.github.com/repos/${githubUsername}/${githubRepo}/git/trees/${githubBranch}?recursive=1`);
        const data = await response.json();
        
        if (data.tree) {
            // Filter out everything except files inside the "images" folder
            repoFiles = data.tree.filter(file => file.path.startsWith('images/') && file.type === 'blob');
        }
    } catch (error) {
        console.error("Could not fetch folder map from GitHub:", error);
    }
}

// Step 2: Grab the Google Sheet data
function fetchInventory(callback) {
    Papa.parse(sheetCSVUrl, {
        download: true,
        header: true,
        complete: function(results) { callback(results.data); },
        error: function(err) {
            console.error("Error:", err);
            document.getElementById('loading').innerText = "Failed to load inventory.";
        }
    });
}

// Step 3: Load the Homepage
async function loadHomepage() {
    if(!document.getElementById('product-list')) return;

    await fetchRepoMap(); // Wait for the GitHub map to load

    fetchInventory(function(data) {
        document.getElementById('loading').style.display = 'none';
        const container = document.getElementById('product-list');

        data.forEach(item => {
            if (!item.ID || !item.Name) return;
            if (item.Status && item.Status.trim().toLowerCase() === 'sold') return;

            const folderName = item.Image ? item.Image.trim() : '';
            
            // Find all images in the GitHub map that match this folder name
            const itemImages = repoFiles.filter(file => file.path.startsWith(`images/${folderName}/`));
            
            // Grab the first image found to use as the cover photo, or a placeholder if none exist
            const firstImage = itemImages.length > 0 ? itemImages[0].path : '';
            // We use jsdelivr to serve the raw GitHub files securely
            const imageSrc = firstImage ? `https://cdn.jsdelivr.net/gh/${githubUsername}/${githubRepo}@${githubBranch}/${firstImage}` : 'https://via.placeholder.com/250?text=No+Image';

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
    });
}

// Step 4: Load the Item Details Page
async function loadItemDetails() {
    const urlParams = new URLSearchParams(window.location.search);
    const itemId = urlParams.get('id');

    if (!itemId) {
        document.getElementById('loading').innerText = "Item not found.";
        return;
    }

    await fetchRepoMap(); // Wait for the GitHub map to load

    fetchInventory(function(data) {
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
                // Loop through every image found in that folder and add it to the gallery
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
    });
}

// Fire the correct function based on the page
if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/' || window.location.pathname === '') {
    window.onload = loadHomepage;
} else if (window.location.pathname.endsWith('item.html')) {
    window.onload = loadItemDetails;
}
