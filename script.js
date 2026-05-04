const sheetCSVUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTVrfaoWolZWM7pY-3obKbd4MZ0PWicUB9jzvgihfrovOAC4HWBrRS9w3DtOx3kugPr4gNbscfYfCno/pub?output=csv";
const contactEmail = "dan@woodandwaves.com"; 

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

function loadHomepage() {
    if(!document.getElementById('product-list')) return;

    fetchInventory(function(data) {
        document.getElementById('loading').style.display = 'none';
        const container = document.getElementById('product-list');

        data.forEach(item => {
            // Skip empty rows
            if (!item.ID || !item.Name) return;

            // NEW: Skip this item completely if the Status is "Sold"
            if (item.Status && item.Status.trim().toLowerCase() === 'sold') {
                return; 
            }

            const imageList = item.Image ? item.Image.split(',') : [];
            const firstImage = imageList.length > 0 ? imageList[0].trim() : '';

            const card = document.createElement('div');
            card.className = 'card';
            card.innerHTML = `
                <img src="images/${firstImage}" alt="${item.Name}" onerror="this.src='https://via.placeholder.com/250?text=No+Image'">
                <h2>${item.Name}</h2>
                <div class="price">${item.Price}</div>
                <a href="item.html?id=${item.ID}" class="btn">View Details</a>
            `;
            container.appendChild(card);
        });
    });
}

function loadItemDetails() {
    const urlParams = new URLSearchParams(window.location.search);
    const itemId = urlParams.get('id');

    if (!itemId) {
        document.getElementById('loading').innerText = "Item not found.";
        return;
    }

    fetchInventory(function(data) {
        document.getElementById('loading').style.display = 'none';
        const container = document.getElementById('item-details');
        const item = data.find(row => row.ID === itemId);

        if (item) {
            // NEW: If someone somehow has a direct link to a sold item, let them know it's gone
            if (item.Status && item.Status.trim().toLowerCase() === 'sold') {
                container.innerHTML = "<h2>Item Sold</h2><p>Sorry, this item has already been sold and is no longer available.</p>";
                return;
            }

            const imageList = item.Image ? item.Image.split(',') : [];
            
            let imagesHTML = '';
            imageList.forEach(imgName => {
                let cleanName = imgName.trim();
                if(cleanName) {
                    imagesHTML += `<img src="images/${cleanName}" alt="${item.Name}" onerror="this.src='https://via.placeholder.com/500?text=No+Image'">`;
                }
            });

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

if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/' || window.location.pathname === '') {
    window.onload = loadHomepage;
} else if (window.location.pathname.endsWith('item.html')) {
    window.onload = loadItemDetails;
}