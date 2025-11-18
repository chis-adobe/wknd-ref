export default async function decorate(block) {
  console.log('Grocery carousel block is loading!');
  
  // Clear the block
  block.innerHTML = '';
  
  // Add simple test content
  block.innerHTML = `
    <div style="padding: 20px; background: #f0f0f0; border: 2px solid #333;">
      <h2>🛒 Grocery Carousel Test</h2>
      <p>If you can see this, the block is loading successfully!</p>
      <p>Block class: ${block.className}</p>
      <img src="${window.hlx.codeBasePath}/icons/cart-icon.svg" alt="Cart" width="48" height="48" />
      <img src="${window.hlx.codeBasePath}/icons/heart-icon.svg" alt="Heart" width="48" height="48" />
      <img src="${window.hlx.codeBasePath}/icons/canada-flag.svg" alt="Canada" width="48" height="48" />
    </div>
  `;
  
  console.log('Grocery carousel test content added');
}

