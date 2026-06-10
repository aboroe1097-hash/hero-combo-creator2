// Site-wide SEO — meta tags, Open Graph, JSON-LD (https://roc-vts.com)
import { translations } from './translations.js';

export const SITE_URL = 'https://roc-vts.com';
export const SITE_NAME = 'Hero Combo Creator';
export const SITE_LOGO = `${SITE_URL}/images/logo.png`;

const DEFAULT_LANG = 'en';

function seoStrings(lang) {
  const t = translations[lang] || translations.en;
  return {
    title: t.seoTitle || `${SITE_NAME} — Rise of Castles Ice & Fire | VTS 1097`,
    description: t.seoDescription || 'Free Rise of Castles: Ice & Fire tools — hero combo builder, Eden map planner, loyalty calculator, tech research, and Hero Atlas for VTS State 1097.',
    keywords: t.seoKeywords || 'Rise of Castles, Ice and Fire, hero combo, Eden map, VTS 1097, combo creator, loyalty calculator, tech research, Hero Atlas',
  };
}

function setMeta(attr, key, content) {
  if (!content) return;
  let el = document.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setLink(rel, href, extra = {}) {
  let el = document.querySelector(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
  Object.entries(extra).forEach(([k, v]) => el.setAttribute(k, v));
}

function injectJsonLd(data) {
  const id = 'vts-jsonld-primary';
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement('script');
    el.id = id;
    el.type = 'application/ld+json';
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

export function applySeo(lang = localStorage.getItem('vts_hero_lang') || DEFAULT_LANG) {
  const { title, description, keywords } = seoStrings(lang);
  const pageUrl = `${SITE_URL}/`;

  document.title = title;
  document.documentElement.lang = lang === 'kr' ? 'ko' : lang;

  setMeta('name', 'description', description);
  setMeta('name', 'keywords', keywords);
  setMeta('name', 'robots', 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1');
  setMeta('name', 'googlebot', 'index, follow');
  setMeta('property', 'og:title', title);
  setMeta('property', 'og:description', description);
  setMeta('property', 'og:url', pageUrl);
  setMeta('property', 'og:image', SITE_LOGO);
  setMeta('property', 'og:image:alt', `${SITE_NAME} logo`);
  setMeta('property', 'og:type', 'website');
  setMeta('property', 'og:site_name', SITE_NAME);
  setMeta('property', 'og:locale', lang === 'en' ? 'en_US' : lang);
  setMeta('name', 'twitter:card', 'summary_large_image');
  setMeta('name', 'twitter:title', title);
  setMeta('name', 'twitter:description', description);
  setMeta('name', 'twitter:image', SITE_LOGO);

  setLink('canonical', pageUrl);

  injectJsonLd({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        url: pageUrl,
        name: SITE_NAME,
        description,
        inLanguage: lang,
        publisher: { '@id': `${SITE_URL}/#organization` },
      },
      {
        '@type': 'Organization',
        '@id': `${SITE_URL}/#organization`,
        name: 'VTS State 1097',
        url: pageUrl,
        logo: {
          '@type': 'ImageObject',
          url: SITE_LOGO,
        },
      },
      {
        '@type': 'WebApplication',
        '@id': `${SITE_URL}/#app`,
        name: SITE_NAME,
        url: pageUrl,
        description,
        applicationCategory: 'GameApplication',
        operatingSystem: 'Any',
        browserRequirements: 'Requires JavaScript',
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
        },
        featureList: [
          'Hero combo builder and generator',
          'Hero Atlas with skills and synergies',
          'Eden map planner with paths and team plan',
          'Eden loyalty upgrade calculator',
          'Tech research calculator',
          'Combo counters',
        ],
        publisher: { '@id': `${SITE_URL}/#organization` },
      },
    ],
  });
}

export function initSeo() {
  applySeo();
}