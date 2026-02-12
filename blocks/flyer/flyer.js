import { moveInstrumentation } from '../../scripts/scripts.js';

/**
 * Flyer block: output each row with its index only.
 * @param {HTMLElement} block
 */
export default async function decorate(block) {
  const ul = document.createElement('ul');
  const rows = [...block.children];

  rows.forEach((row, index) => {
    const li = document.createElement('li');
    moveInstrumentation(row, li);
    li.dataset.flyerRowIndex = String(index);
    li.textContent = `Row ${index}`;
    ul.append(li);
  });

  block.textContent = '';
  block.append(ul);
  block.classList.add('flyer-container');
}
