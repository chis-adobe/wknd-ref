import { getMetadata } from '../../scripts/aem.js';
import { isAuthorEnvironment, moveInstrumentation } from '../../scripts/scripts.js';
import { getHostname } from '../../scripts/utils.js';

const CONFIG = {
  WRAPPER_SERVICE_URL: 'https://3635370-refdemoapigateway-stage.adobeioruntime.net/api/v1/web/ref-demo-api-gateway/fetch-cf',
  GRAPHQL_QUERY: '/graphql/execute.json/wknd-shared/groceryItemDmByPath',
};

const S7_IMAGE_BASE = 'https://s7d1.scene7.com/is/image/';

/**
 * Strip S7 base URL to get the asset path for DM template params.
 * @param {string} url
 * @returns {string}
 */
function stripS7Base(url) {
  if (!url || typeof url !== 'string') return '';
  return url.startsWith(S7_IMAGE_BASE) ? url.slice(S7_IMAGE_BASE.length) : url;
}

/**
 * Build param object from Content Fragment item for Dynamic Media template.
 * image/brandImage use _dmS7Url (strip S7 base); fineprint → plaintext; rest passed as-is.
 * @param {Record<string, unknown>} item
 * @param {boolean} isAuthor
 * @returns {Record<string, string>}
 */
function buildParamObject(item, isAuthor) {
  const params = {};
  if (!item) return params;

  const image = item.image?.value ?? item.image;
  const brandImage = item.brandImage?.value ?? item.brandImage;
  const getUrl = (obj) => {
    if (!obj || typeof obj !== 'object') return '';
    return obj._dmS7Url ?? (isAuthor ? obj._authorUrl : obj._publishUrl) ?? obj._authorUrl ?? obj._publishUrl ?? '';
  };
  const imageUrl = getUrl(image);
  const brandImageUrl = getUrl(brandImage);
  if (imageUrl) params.image = stripS7Base(imageUrl);
  if (brandImageUrl) params.brandImage = stripS7Base(brandImageUrl);

  const fineprint = item.fineprint ?? item.plaintext ?? '';
  if (fineprint) params.fineprint = typeof fineprint === 'string' ? fineprint : (fineprint?.plaintext ?? '');

  ['title', 'brand', 'price', 'previousPrice', 'pricePerQuantity', 'size'].forEach((key) => {
    const val = item[key];
    if (val != null && val !== '') params[key] = String(val);
  });

  return params;
}

/**
 * Build final Dynamic Media image URL from template base + params ($key=value).
 * @param {string} templateURL
 * @param {Record<string, string>} params
 * @returns {string}
 */
function buildDmImageUrl(templateURL, params) {
  const query = Object.entries(params)
    .map(([k, v]) => `$${k}=${encodeURIComponent(v)}`)
    .join('&');
  const sep = templateURL.includes('?') ? '&' : '?';
  return `${templateURL}${sep}${query}`;
}

/**
 * Normalize content fragment path: use pathname if full URL, strip trailing .html.
 * @param {string} path
 * @returns {string}
 */
function normalizeContentPath(path) {
  if (!path || typeof path !== 'string') return '';
  let p = path.trim();
  if (p.startsWith('http')) {
    try {
      p = new URL(p).pathname;
    } catch {
      // keep as-is
    }
  }
  return p.replace(/\.html$/i, '');
}

/**
 * Extract content fragment path and DM template URL from a row.
 * Row structure: two divs — first = reference (Content Fragment) link, second = template (DM) link.
 * @param {Element} row
 * @returns {{ contentPath: string, templateURL: string }}
 */
function extractPathAndTemplateFromRow(row) {
  const firstDiv = row?.children?.[0];
  const secondDiv = row?.children?.[1];
  const refLink = firstDiv?.querySelector?.('a');
  const templateLink = secondDiv?.querySelector?.('a');

  const contentPath = normalizeContentPath(
    refLink?.getAttribute('title')?.trim() || refLink?.href?.trim() || refLink?.textContent?.trim() || ''
  );
  const templateURL = (templateLink?.href?.trim() || templateLink?.textContent?.trim() || '').trim();

  return { contentPath, templateURL };
}

/**
 * @param {HTMLElement} block
 */
export default async function decorate(block) {
  const hostnameFromPlaceholders = await getHostname();
  const hostname = hostnameFromPlaceholders ?? getMetadata('hostname');
  const aemauthorurl = getMetadata('authorurl') || 'https://author-p130746-e1275972.adobeaemcloud.com';
  const aempublishurl = hostname?.replace('author', 'publish')?.replace(/\/$/, '') ?? '';
  const isAuthor = isAuthorEnvironment();

  const ul = document.createElement('ul');
  const rows = [...block.children];

  rows.forEach((row, i) => {
    const { contentPath, templateURL } = extractPathAndTemplateFromRow(row);

    const li = document.createElement('li');
    moveInstrumentation(row, li);
    li.dataset.flyerRowIndex = String(i);

    // Debug: show extracted values so you can confirm we're retrieving them correctly
    const debug = document.createElement('div');
    debug.className = 'flyer-row-debug';
    debug.style.cssText = 'padding: 0.5rem; margin-bottom: 0.5rem; font-family: monospace; font-size: 12px; background: #f5f5f5; border: 1px solid #ddd;';
    debug.innerHTML = `<div><strong>contentPath:</strong> ${contentPath ? contentPath.replace(/</g, '&lt;') : '(empty)'}</div><div><strong>templateURL:</strong> ${templateURL ? templateURL.replace(/</g, '&lt;') : '(empty)'}</div>`;
    li.append(debug);

    // Render row as-is: move row's children into the li
    while (row.firstElementChild) {
      li.append(row.firstElementChild);
    }

    ul.append(li);
  });

  block.textContent = '';
  block.append(ul);
  block.classList.add('flyer-container');
}
