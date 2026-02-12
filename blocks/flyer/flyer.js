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
 * Extract content fragment path and DM template URL from a row element.
 * Tries: (1) two-column with value divs, (2) data-aue-prop, (3) all links in row (first=path, second=template).
 * @param {Element} row
 * @returns {{ contentPath: string, templateURL: string }}
 */
function extractPathAndTemplateFromRow(row) {
  let contentPath = '';
  let templateURL = '';
  const field0 = row?.children?.[0];
  const field1 = row?.children?.[1];
  if (field0?.children?.[1] && field1?.children?.[1]) {
    const a0 = field0.children[1].querySelector('a');
    const a1 = field1.children[1].querySelector('a');
    contentPath = a0?.textContent?.trim() || a0?.href?.trim() || '';
    templateURL = a1?.href?.trim() || a1?.textContent?.trim() || '';
  }
  if (!contentPath || !templateURL) {
    const refEl = row?.querySelector?.('[data-aue-prop="reference"] a, [data-aue-prop="reference"]');
    const tmplEl = row?.querySelector?.('[data-aue-prop="dm_template_url"] a, [data-aue-prop="dm_template_url"]');
    if (refEl) contentPath = refEl.href?.trim() || refEl.textContent?.trim() || '';
    if (tmplEl) templateURL = tmplEl.href?.trim() || tmplEl.textContent?.trim() || '';
  }
  if (!contentPath || !templateURL) {
    const links = row?.querySelectorAll?.('a[href]') || [];
    if (links.length >= 1) contentPath = contentPath || links[0].href?.trim() || links[0].textContent?.trim() || '';
    if (links.length >= 2) templateURL = templateURL || links[1].href?.trim() || links[1].textContent?.trim() || '';
  }
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

  let i = 0;
  while (i < rows.length) {
    const row = rows[i];
    let contentPath = '';
    let templateURL = '';
    let usedPair = false;

    const one = extractPathAndTemplateFromRow(row);
    contentPath = one.contentPath;
    templateURL = one.templateURL;

    if ((!contentPath || !templateURL) && i < rows.length - 1) {
      const rowRef = rows[i];
      const rowTemplate = rows[i + 1];
      const colRef = rowRef?.children?.[1];
      const colTemplate = rowTemplate?.children?.[1];
      const refVal = colRef?.querySelector('a')?.textContent?.trim() || colRef?.querySelector('a')?.href?.trim() || '';
      const tmplVal = colTemplate?.querySelector('a')?.href?.trim() || colTemplate?.querySelector('a')?.textContent?.trim() || '';
      if (refVal) contentPath = contentPath || refVal;
      if (tmplVal) templateURL = templateURL || tmplVal;
      if (contentPath || templateURL) usedPair = true;
    }

    if (contentPath && contentPath.startsWith('http')) {
      try {
        contentPath = new URL(contentPath).pathname;
      } catch {
        // keep as-is
      }
    }

    const li = document.createElement('li');
    moveInstrumentation(row, li);

    if (!contentPath || !templateURL) {
      li.dataset.flyerRowIndex = String(i);
      li.textContent = `Row ${i}`;
      ul.append(li);
      i += usedPair ? 2 : 1;
      continue;
    }

    let requestUrl = '';
    let requestOptions = { method: 'GET', headers: { 'Content-Type': 'application/json' } };
    if (isAuthor && aemauthorurl) {
      requestUrl = `${aemauthorurl}${CONFIG.GRAPHQL_QUERY};path=${encodeURIComponent(contentPath)};ts=${Date.now()}`;
    } else if (aempublishurl) {
      requestUrl = CONFIG.WRAPPER_SERVICE_URL;
      requestOptions = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          graphQLPath: `${aempublishurl}${CONFIG.GRAPHQL_QUERY}`,
          cfPath: contentPath,
          variation: `master;ts=${Date.now()}`,
        }),
      };
    }

    try {
      const response = requestUrl ? await fetch(requestUrl, requestOptions) : null;
      if (!response?.ok) {
        li.textContent = `Row ${i} (fetch failed)`;
        ul.append(li);
        i += usedPair ? 2 : 1;
        continue;
      }

      const data = await response.json();
      const item = data?.data?.groceryItemDmByPath?.item ?? data?.data?.groceryItemByPath?.item;
      if (!item) {
        li.textContent = `Row ${i} (no item)`;
        ul.append(li);
        i += usedPair ? 2 : 1;
        continue;
      }

      const params = buildParamObject(item, isAuthor);
      const finalUrl = buildDmImageUrl(templateURL, params);
      const img = document.createElement('img');
      img.className = 'grocery-dm-image';
      img.src = finalUrl;
      img.alt = (item.title || 'Grocery item') || '';
      img.loading = 'lazy';
      img.onerror = function onError() {
        this.alt = 'Image failed to load';
      };
      li.append(img);
      ul.append(li);
    } catch (err) {
      console.warn('Flyer row fetch error:', err);
      li.textContent = `Row ${i} (error)`;
      ul.append(li);
    }

    i += usedPair ? 2 : 1;
  }

  block.textContent = '';
  block.append(ul);
  block.classList.add('flyer-container');
}
