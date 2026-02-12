// import { getMetadata } from '../../scripts/aem.js';
// import { isAuthorEnvironment, moveInstrumentation } from '../../scripts/scripts.js';
// import { getHostname } from '../../scripts/utils.js';

/**
 * @param {HTMLElement} block
 */
export default async function decorate(block) {
  // const CONFIG = {
  //   WRAPPER_SERVICE_URL: 'https://3635370-refdemoapigateway-stage.adobeioruntime.net/api/v1/web/ref-demo-api-gateway/fetch-cf',
  //   GRAPHQL_QUERY: '/graphql/execute.json/wknd-shared/groceryItemDmByPath',
  // };

  // const hostnameFromPlaceholders = await getHostname();
  // const hostname = hostnameFromPlaceholders ? hostnameFromPlaceholders : getMetadata('hostname');
  // const aemauthorurl = getMetadata('authorurl') || 'https://author-p130746-e1275972.adobeaemcloud.com';
  // const aempublishurl = hostname?.replace('author', 'publish')?.replace(/\/$/, '');
  // const isAuthor = isAuthorEnvironment();

  const ul = document.createElement('ul');
  const rows = [...block.children];

  let i = 0;
  while (i < rows.length) {
    const row = rows[i];
    let contentPath = '';
    let templateURL = '';
    let usedPair = false;

    // Try structure: one row = one block with two field divs (field 0 = reference, field 1 = template)
    const field0 = row?.children?.[0];
    const field1 = row?.children?.[1];
    if (field0?.children?.[1] && field1?.children?.[1]) {
      const a0 = field0.children[1].querySelector('a');
      const a1 = field1.children[1].querySelector('a');
      contentPath = a0?.textContent?.trim() || a0?.href?.trim() || '';
      templateURL = a1?.href?.trim() || a1?.textContent?.trim() || '';
    }

    // Fallback: pair of rows (row i = reference, row i+1 = template)
    if ((!contentPath || !templateURL) && i < rows.length - 1) {
      const rowRef = rows[i];
      const rowTemplate = rows[i + 1];
      const colRef = rowRef?.children?.[1];
      const colTemplate = rowTemplate?.children?.[1];
      contentPath = colRef?.querySelector('a')?.textContent?.trim() || colRef?.querySelector('a')?.href?.trim() || '';
      templateURL = colTemplate?.querySelector('a')?.href?.trim() || colTemplate?.querySelector('a')?.textContent?.trim() || '';
      if (contentPath || templateURL) {
        usedPair = true;
      }
    }

    if (contentPath && contentPath.startsWith('http')) {
      try {
        contentPath = new URL(contentPath).pathname;
      } catch {
        // keep as-is
      }
    }

    const li = document.createElement('li');
    li.innerHTML = `
      <div class="flyer-debug" style="padding: 1rem; border: 1px solid #ccc; margin-bottom: 0.5rem; font-family: monospace; font-size: 12px;">
        <div><strong>Content path:</strong> ${contentPath || '(empty)'}</div>
        <div><strong>Template URL:</strong> ${templateURL || '(empty)'}</div>
      </div>
    `;
    ul.append(li);

    i += usedPair ? 2 : 1;
  }

  block.textContent = '';
  block.append(ul);
  block.classList.add('flyer-container');

  /*
  // --- COMMENTED OUT: full fetch + image logic ---
  for (let i = 0; i < rows.length - 1; i += 2) {
    const rowRef = rows[i];
    const rowTemplate = rows[i + 1];
    ...
    moveInstrumentation(rowRef, li);
    li.append(finalImg);
    ul.append(li);
  }
  */
}

