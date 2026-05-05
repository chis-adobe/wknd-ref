import { getMetadata } from '../../scripts/aem.js';
import { isAuthorEnvironment } from '../../scripts/scripts.js';

const GRAPHQL_PATH = '/graphql/execute.json/ref-demo-eds/synchronyOfferByPath';
/** Same program as fstab Franklin delivery (ref-demo GraphQL lives here). */
const DEFAULT_AEM_AUTHOR = 'https://author-p130746-e1275972.adobeaemcloud.com';

/**
 * Publish host for the same AEM program as the author base URL (avoids wrong publish from placeholders).
 * @param {string} authorBaseUrl
 * @returns {string}
 */
function publishUrlFromAuthor(authorBaseUrl) {
  const base = (authorBaseUrl || DEFAULT_AEM_AUTHOR).trim().replace(/\/$/, '');
  return base.replace(/\/\/author-/i, '//publish-');
}

/**
 * @param {Array<{ name: string, width: number }>|undefined} smartCrops
 * @param {number} viewportWidth
 * @returns {string}
 */
function pickSmartCropName(smartCrops, viewportWidth) {
  if (!smartCrops?.length) return '';
  const sorted = [...smartCrops].sort((a, b) => b.width - a.width);
  const fit = sorted.find((c) => c.width <= viewportWidth);
  return (fit || sorted[sorted.length - 1]).name;
}

/**
 * @param {string} dmUrl
 * @param {string} cropName
 * @returns {string}
 */
function buildImageSrc(dmUrl, cropName) {
  const base = dmUrl?.trim() || '';
  if (!base) return '';
  const withCrop = cropName ? `${base}:${cropName}` : base;
  const sep = withCrop.includes('?') ? '&' : '?';
  const date = new Date().toISOString().slice(0, 10);
  return `${withCrop}${sep}cb=${encodeURIComponent(date)}`;
}

/**
 * @param {string} path
 * @returns {string}
 */
function normalizePath(path) {
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
 * Resolve CTA URL from string or GraphQL ref shape ({ _publishUrl, _authorUrl }).
 * @param {string | { _publishUrl?: string, _authorUrl?: string } | null | undefined} ctaUrl
 * @param {boolean} isAuthor
 * @returns {string}
 */
function resolveCtaUrl(ctaUrl, isAuthor) {
  if (!ctaUrl) return '';
  if (typeof ctaUrl === 'string') return ctaUrl.trim();
  if (typeof ctaUrl === 'object') {
    const url = isAuthor ? ctaUrl._authorUrl : ctaUrl._publishUrl;
    return (url || ctaUrl._publishUrl || ctaUrl._authorUrl || '').trim();
  }
  return '';
}

/**
 * @param {HTMLElement} block
 * @returns {string}
 */
function extractPathFromBlock(block) {
  const refProp = block.querySelector('[data-aue-prop="reference"] a, [data-aue-prop="reference"]');
  const pathProp = block.querySelector('[data-aue-prop="path"] a, [data-aue-prop="path"]');
  const link = block.querySelector(':scope div:nth-child(1) a');
  const cell = block.querySelector(':scope div:nth-child(1) > div');
  const raw = refProp?.href?.trim()
    || refProp?.textContent?.trim()
    || refProp?.getAttribute?.('title')?.trim()
    || pathProp?.href?.trim()
    || pathProp?.textContent?.trim()
    || link?.getAttribute('title')?.trim()
    || link?.href?.trim()
    || link?.textContent?.trim()
    || cell?.textContent?.trim()
    || '';
  let path = normalizePath(raw);
  try {
    path = decodeURIComponent(path);
  } catch {
    // keep path
  }
  return path;
}

/**
 * @param {HTMLElement} block
 * @returns {string}
 */
function extractVariationFromBlock(block) {
  const prop = block.querySelector('[data-aue-prop="contentFragmentVariation"]');
  const row2 = block.querySelector(':scope div:nth-child(2) > div');
  const raw = prop?.textContent?.trim() || row2?.textContent?.trim() || '';
  const normalized = raw.toLowerCase().replace(/\s+/g, '_');
  return normalized || 'master';
}

/**
 * @param {HTMLElement} block
 */
export default async function decorate(block) {
  const contentPath = extractPathFromBlock(block);
  const variationName = extractVariationFromBlock(block);
  block.innerHTML = '';

  if (!contentPath) {
    block.innerHTML = '<p class="offer-error">Select a content fragment for the Offer block.</p>';
    return;
  }

  const aemauthorurl = (getMetadata('authorurl') || DEFAULT_AEM_AUTHOR).trim().replace(/\/$/, '');
  const aempublishurl = publishUrlFromAuthor(aemauthorurl);
  const isAuthorEnv = isAuthorEnvironment();

  let requestUrl = '';
  const variationParam = `;variation=${variationName}`;
  if (isAuthorEnv && aemauthorurl) {
    requestUrl = `${aemauthorurl}${GRAPHQL_PATH};path=${contentPath}${variationParam};ts=${Date.now()}`;
  } else if (aempublishurl) {
    requestUrl = `${aempublishurl}${GRAPHQL_PATH};path=${contentPath}${variationParam};ts=${Date.now()}`;
  }

  if (!requestUrl) {
    block.innerHTML = '<p class="offer-error">Unable to load offer (hostname not configured).</p>';
    return;
  }

  try {
    const response = await fetch(requestUrl, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      block.innerHTML = `<p class="offer-error">Offer request failed (${response.status}).</p>`;
      return;
    }

    const json = await response.json();
    const item = json?.data?.synchronyOfferByPath?.item
      ?? json?.data?.synchronyBannerByPath?.item;

    if (!item) {
      block.innerHTML = '<p class="offer-error">No offer data for this path.</p>';
      return;
    }

    const dmUrl = item.image?._dmS7Url || '';
    const smartCrops = item.image?._smartCrops;
    const ctaHref = resolveCtaUrl(item.ctaUrl, isAuthorEnv);

    const banner = document.createElement('div');
    banner.className = 'offer-banner';

    const textCol = document.createElement('div');
    textCol.className = 'offer-banner-text';

    if (item.title) {
      const h2 = document.createElement('h2');
      h2.className = 'offer-banner-title';
      h2.textContent = item.title;
      textCol.append(h2);
    }

    if (item.paragraph) {
      const p = document.createElement('p');
      p.className = 'offer-banner-paragraph';
      p.textContent = item.paragraph;
      textCol.append(p);
    }

    if (item.ctaLabel && ctaHref) {
      const btnWrap = document.createElement('p');
      btnWrap.className = 'offer-banner-cta';
      const a = document.createElement('a');
      a.className = 'offer-cta-button';
      a.href = ctaHref;
      a.textContent = item.ctaLabel;
      if (ctaHref.startsWith('http')) {
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
      }
      btnWrap.append(a);
      textCol.append(btnWrap);
    } else if (item.ctaLabel) {
      const btnWrap = document.createElement('p');
      btnWrap.className = 'offer-banner-cta';
      const span = document.createElement('span');
      span.className = 'offer-cta-button offer-cta-button--static';
      span.textContent = item.ctaLabel;
      btnWrap.append(span);
      textCol.append(btnWrap);
    }

    const mediaCol = document.createElement('div');
    mediaCol.className = 'offer-banner-media';

    if (dmUrl) {
      const img = document.createElement('img');
      img.className = 'offer-banner-image';
      img.alt = item.title || '';
      img.loading = 'eager';
      img.decoding = 'async';

      const updateSrc = () => {
        const vw = window.innerWidth || document.documentElement.clientWidth || 1200;
        const cropName = pickSmartCropName(smartCrops, vw);
        img.src = buildImageSrc(dmUrl, cropName);
      };

      updateSrc();
      let resizeTimer;
      const onResize = () => {
        window.clearTimeout(resizeTimer);
        resizeTimer = window.setTimeout(updateSrc, 150);
      };
      window.addEventListener('resize', onResize);
      mediaCol.append(img);
    }

    banner.append(textCol, mediaCol);
    block.append(banner);
  } catch (err) {
    console.error('Offer block error:', err);
    block.innerHTML = '<p class="offer-error">Error loading offer.</p>';
  }
}
