/**
 * @param {HTMLElement} block
 */
export default function decorate(block) {
  // Flyer block is a container that accepts grocery-dm blocks
  // The children (grocery-dm blocks) will be rendered as-is
  block.classList.add('flyer-container');
}

