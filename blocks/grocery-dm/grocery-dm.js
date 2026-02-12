import { getMetadata } from '../../scripts/aem.js';
import { isAuthorEnvironment } from '../../scripts/scripts.js';
import { getHostname } from '../../scripts/utils.js';

/**
 * @param {HTMLElement} block
 */
export default async function decorate(block) {
  const CONFIG = {
    WRAPPER_SERVICE_URL: 'https://3635370-refdemoapigateway-stage.adobeioruntime.net/api/v1/web/ref-demo-api-gateway/fetch-cf',
    GRAPHQL_QUERY: '/graphql/execute.json/wknd-shared/groceryItemDmByPath',
  };

  // Get Content Fragment path from user input (first child - reference field)
  const contentPath = block.querySelector(':scope div:nth-child(1) > div a')?.textContent?.trim();
  
  // Get Dynamic Media Template URL from user input (second child - dm_template_url field)
  // Since it's now an aem-content component, read it as a link
  const templateURL = block.querySelector(':scope div:nth-child(2) > div a')?.textContent?.trim();
  
  if (!contentPath) {
    console.error('Missing Content Fragment path');
    block.innerHTML = '<p>Error: Content Fragment path is required</p>';
    return;
  }
  
  if (!templateURL) {
    console.error('Missing Dynamic Media Template URL');
    block.innerHTML = '<p>Error: Dynamic Media Template URL is required</p>';
    return;
  }

  const hostnameFromPlaceholders = await getHostname();
  const hostname = hostnameFromPlaceholders ? hostnameFromPlaceholders : getMetadata('hostname');
  const aemauthorurl = getMetadata('authorurl') || 'https://author-p130746-e1275972.adobeaemcloud.com';
  
  const aempublishurl = hostname?.replace('author', 'publish')?.replace(/\/$/, '');
  
  const isAuthor = isAuthorEnvironment();

  // Prepare request configuration based on environment
  const requestConfig = isAuthor 
  ? {
      url: `${aemauthorurl}${CONFIG.GRAPHQL_QUERY};path=${contentPath};ts=${Date.now()}`,
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    }
  : {
      url: `${CONFIG.WRAPPER_SERVICE_URL}`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        graphQLPath: `${aempublishurl}${CONFIG.GRAPHQL_QUERY}`,
        cfPath: contentPath,
        variation: `master;ts=${Date.now()}`
      })
    };

  try {
    // Fetch data
    const response = await fetch(requestConfig.url, {
      method: requestConfig.method,
      headers: requestConfig.headers,
      ...(requestConfig.body && { body: requestConfig.body })
    });

    if (!response.ok) {
      console.error(`Error making GraphQL request: ${response.status}`);
      block.innerHTML = '<p>Error: Unable to load grocery item</p>';
      return;
    }

    const offer = await response.json();
    
    // Get the grocery item data
    const groceryItem = offer?.data?.groceryItemByPath?.item;
    
    if (!groceryItem) {
      console.error('No grocery item found in response:', offer);
      block.innerHTML = '<p>Error: No grocery item data found</p>';
      return;
    }

    // Create parameter object from the grocery item response
    const paramObject = {};
    
    // Helper function to convert Scene7 URL from parent object
    const convertDynamicUrl = (parentObj) => {
      if (!parentObj || typeof parentObj !== 'object' || !parentObj._dmS7Url) {
        return null;
      }
      const s7Url = parentObj._dmS7Url;
      // Strip out https://s7d1.scene7.com/is/image/ prefix
      const prefix = 'https://s7d1.scene7.com/is/image/';
      if (s7Url.startsWith(prefix)) {
        return s7Url.substring(prefix.length);
      }
      return s7Url;
    };

    // Handle special fields first and remove them from the object
    const convertedImage = convertDynamicUrl(groceryItem.image);
    if (convertedImage) {
      paramObject.image = convertedImage;
    }
    delete groceryItem.image;
    
    const convertedBrandImage = convertDynamicUrl(groceryItem.brandImage);
    if (convertedBrandImage) {
      paramObject.brandImage = convertedBrandImage;
    }
    delete groceryItem.brandImage;
    
    if (groceryItem.fineprint && typeof groceryItem.fineprint === 'object' && groceryItem.fineprint.plaintext) {
      paramObject.fineprint = groceryItem.fineprint.plaintext;
    }
    delete groceryItem.fineprint;
    
    // Process remaining fields (image, brandImage, and fineprint are now removed, so no checks needed)
    Object.keys(groceryItem).forEach(key => {
      const value = groceryItem[key];
      // Only include primitive values (string, number, boolean)
      if (value !== null && value !== undefined && 
          (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean')) {
        paramObject[key] = value;
      }
    });

    // Construct the query string with $ prefix on all keys
    const queryString = Object.entries(paramObject)
      .map(([key, value]) => `$${key}=${encodeURIComponent(value)}`)
      .join('&');

    // Combine with template URL
    let finalUrl = templateURL.includes('?') 
      ? `${templateURL}&${queryString}` 
      : `${templateURL}?${queryString}`;

    console.log("Final URL:", finalUrl);

    // Create and append the image element
    if (finalUrl) {
      const finalImg = document.createElement('img');
      Object.assign(finalImg, {
        className: 'grocery-dm-image',
        src: finalUrl,
        alt: 'Grocery Dynamic Media Template',
      });
      
      // Add error handling for image load failure
      finalImg.onerror = function() {
        console.warn('Failed to load image:', finalUrl);
        // Set fallback image
        this.src = 'https://smartimaging.scene7.com/is/image/DynamicMediaNA/WKND%20Template?wid=2000&hei=2000&qlt=100&fit=constrain';
        this.alt = 'Fallback image - template image not correctly authored';
      };
      
      block.innerHTML = '';
      block.append(finalImg);
    }
  } catch (error) {
    console.error('Error rendering grocery dynamic media template', {
      error: error.message,
      stack: error.stack
    });
    block.innerHTML = '<p>Error loading grocery item</p>';
  }
}

