import { getMetadata } from '../../scripts/aem.js';
import { isAuthorEnvironment } from '../../scripts/scripts.js';
import { getHostname } from '../../scripts/utils.js';
import createSlider from '../../scripts/slider.js';

function createProductTile(product) {
  const tile = document.createElement('div');
  tile.className = 'grocery-product-tile';
  
  // Map the actual field names from the GraphQL response
  // Response fields: brand, title, size, price, pricePerQuantity, image
  tile.innerHTML = `
    <div class="product-badges">
      ${product.onSale ? '<div class="save-badge">Save</div>' : ''}
      ${product.isCanadian ? `
        <div class="canada-badge">
          <img src="${window.hlx.codeBasePath}/icons/canada-flag.svg" alt="Product of Canada" width="24" height="24" />
        </div>
      ` : ''}
    </div>
    
    <button type="button" class="favorite-btn" aria-label="Add to favourites">
      <img src="${window.hlx.codeBasePath}/icons/heart-icon.svg" alt="" width="24" height="24" />
    </button>
    
    <div class="product-image">
      <img src="${product.image || ''}" alt="${product.title || ''}" />
    </div>
    
    <div class="product-info">
      ${product.brand ? `<div class="product-brand">${product.brand}</div>` : ''}
      <div class="product-name">${product.title || ''}</div>
      ${product.size ? `<div class="product-size">${product.size}</div>` : ''}
      
      <div class="product-pricing">
        <div class="sale-price">${product.price || ''}</div>
        ${product.pricePerQuantity ? `<div class="unit-price">${product.pricePerQuantity}</div>` : ''}
      </div>
      
      ${product.hasVarieties ? '<button class="other-varieties">Other varieties</button>' : ''}
    </div>
    
    <button class="add-to-cart-btn" aria-label="Add to cart">
      <img src="${window.hlx.codeBasePath}/icons/cart-icon.svg" alt="" width="24" height="24" />
    </button>
  `;
  
  return tile;
}

export default async function decorate(block) {
  // Add the carousel class so slider.js can find it
  block.classList.add('carousel');
  
  // Get the diet type from the block
  const dietType = block.querySelector(':scope div:nth-child(1) > div')?.textContent?.trim() || '';
  
  // Clear the block
  block.innerHTML = '';
  
  // Get hostname following content-fragment pattern
  const hostnameFromPlaceholders = await getHostname();
  const hostname = hostnameFromPlaceholders ? hostnameFromPlaceholders : getMetadata('hostname');
  const aemauthorurl = getMetadata('authorurl') || '';
  const aempublishurl = hostname?.replace('author', 'publish')?.replace(/\/$/, '');
  
  const graphqlPath = '/graphql/execute.json/wknd-shared/groceryItems';
  const isAuthor = isAuthorEnvironment();
  
  // Construct request URL based on environment
  let requestUrl = '';
  if (isAuthor && aemauthorurl) {
    requestUrl = `${aemauthorurl}${graphqlPath}${dietType ? `;dietType=${dietType}` : ''};ts=${Date.now()}`;
  } else if (aempublishurl) {
    requestUrl = `${aempublishurl}${graphqlPath}${dietType ? `;dietType=${dietType}` : ''}`;
  }
  
  if (!requestUrl) {
    console.error('Unable to construct GraphQL request URL', {
      isAuthor,
      aemauthorurl,
      aempublishurl,
      hostname,
      dietType
    });
    block.innerHTML = '<p>Error: Unable to load grocery items</p>';
    return;
  }
  
  try {
    // Make the GraphQL request
    const response = await fetch(requestUrl, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!response.ok) {
      console.error(`Error making GraphQL request: ${response.status}`);
      block.innerHTML = '<p>Error loading grocery items</p>';
      return;
    }
    
    const data = await response.json();
    
    // Extract grocery items from response
    // The response structure is data.groceryItemList.items (note: singular "List")
    const groceryItems = data?.data?.groceryItemList?.items || [];
    
    if (!groceryItems || groceryItems.length === 0) {
      console.warn('No grocery items found in response:', data);
      block.innerHTML = '<p>No grocery items found</p>';
      return;
    }
    
    // Create carousel slider
    const slider = document.createElement('ul');
    slider.className = 'grocery-carousel-slider';
    
    // Create tiles for each grocery item
    groceryItems.forEach((item) => {
      const li = document.createElement('li');
      const tile = createProductTile(item);
      li.append(tile);
      slider.append(li);
    });
    
    block.append(slider);
    
    // Initialize the slider
    createSlider(block);
    
  } catch (error) {
    console.error('Error fetching grocery items:', error);
    block.innerHTML = '<p>Error loading grocery items</p>';
  }
}

