export default async function decorate(block) {
  console.log('Grocery carousel block is loading!');
  
  // Clear the block
  block.innerHTML = '';
  
  // Add simple test content with a visible change
  block.innerHTML = `
    <div style="padding: 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border: 3px solid #4c51bf; border-radius: 8px; color: white;">
      <h2 style="margin: 0 0 15px 0; color: white;">Grocery Carousel - Working!</h2>
      <p style="margin: 0; font-size: 18px;">✅ Block is loading successfully and updates are being applied!</p>
      <p style="margin: 10px 0 0 0; opacity: 0.9;">Icons: 
        <img src="${window.hlx.codeBasePath}/icons/cart-icon.svg" alt="Cart" width="32" height="32" style="vertical-align: middle; margin: 0 5px; filter: brightness(0) invert(1);" />
        <img src="${window.hlx.codeBasePath}/icons/heart-icon.svg" alt="Heart" width="32" height="32" style="vertical-align: middle; margin: 0 5px; filter: brightness(0) invert(1);" />
        <img src="${window.hlx.codeBasePath}/icons/canada-flag.svg" alt="Canada" width="32" height="32" style="vertical-align: middle; margin: 0 5px;" />
      </p>
    </div>
  `;
  
  console.log('Grocery carousel test content added with styling update');
}

