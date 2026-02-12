import { moveInstrumentation } from '../../scripts/scripts.js';

/**
 * @param {HTMLElement} block
 */
export default function decorate(block) {
  const ul = document.createElement('ul');
  
  // Process each child (grocery-dm block)
  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    
    moveInstrumentation(row, li);
    while (row.firstElementChild) li.append(row.firstElementChild);
    
    ul.append(li);
  });
  
  block.textContent = '';
  block.append(ul);
  block.classList.add('flyer-container');
}

