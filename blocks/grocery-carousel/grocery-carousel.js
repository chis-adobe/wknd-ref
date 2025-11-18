export default async function decorate(block) {
  console.log('Grocery carousel block is loading!');
  
  // Clear the block
  block.innerHTML = '';
  
  // Add simple test content
  block.innerHTML = `
    <div style="padding: 20px; border: 2px solid #333;">
      <h2>Grocery Carousel Test</h2>
      <p>If you can see this, the block is loading successfully!</p>
    </div>
  `;
  
  console.log('Grocery carousel test content added');
}

