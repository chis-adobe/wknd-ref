import { getMetadata } from '../../scripts/aem.js';
import createSlider from '../../scripts/slider.js';

function isAuthorEnvironment() {
  return window.location.hostname.includes('author') || window.location.hostname === 'localhost';
}

function createProductTile(product) {
  const tile = document.createElement('div');
  tile.className = 'grocery-product-tile';
  
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
      <img src="${product.image || ''}" alt="${product.name || ''}" />
    </div>
    
    <div class="product-info">
      ${product.brand ? `<div class="product-brand">${product.brand}</div>` : ''}
      <div class="product-name">${product.name || ''}</div>
      ${product.size ? `<div class="product-size">${product.size}</div>` : ''}
      
      <div class="product-pricing">
        ${product.regularPrice ? `<div class="regular-price">$${product.regularPrice} ea.</div>` : ''}
        <div class="sale-price">$${product.price || ''} ea.</div>
        ${product.unitPrice ? `<div class="unit-price">${product.unitPrice}</div>` : ''}
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
  // Get the diet type from the block
  const dietType = block.querySelector(':scope div:nth-child(1) > div')?.textContent?.trim() || '';
  
  // Clear the block
  block.innerHTML = '';
  
  // Get hostname and construct GraphQL URL
  const hostname = getMetadata('hostname');
  const aempublishurl = hostname?.replace('author', 'publish')?.replace(/\/$/, '') || '';
  const graphqlPath = '/graphql/execute.json/wknd-shared/groceryItems';
  const isAuthor = isAuthorEnvironment();
  
  // Construct the request URL
  let requestUrl = '';
  if (isAuthor && hostname) {
    requestUrl = `${hostname}${graphqlPath}${dietType ? `;dietType=${dietType}` : ''};ts=${Date.now()}`;
  } else if (aempublishurl) {
    requestUrl = `${aempublishurl}${graphqlPath}${dietType ? `;dietType=${dietType}` : ''}`;
  }
  
  if (!requestUrl) {
    console.error('Unable to construct GraphQL request URL');
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
    // Adjust the path based on your actual GraphQL response structure
    const groceryItems = data?.data?.groceryItemsList?.items || data?.data?.groceryItems || [];
    
    if (!groceryItems || groceryItems.length === 0) {
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

