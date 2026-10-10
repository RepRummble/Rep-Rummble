import { useEffect } from 'react';

const BASE_TITLE = 'Reprummble';
const SITE_URL = 'https://reprummble.com';

interface PageMeta {
  title: string;
  description?: string;
  canonical?: string;
}

export function usePageMeta({ title, description, canonical }: PageMeta) {
  useEffect(() => {
    const fullTitle = title === BASE_TITLE
      ? `${BASE_TITLE} — Train Smarter. Recover Faster. Live Stronger.`
      : `${title} | ${BASE_TITLE}`;

    document.title = fullTitle;

    if (description) {
      let metaDesc = document.querySelector<HTMLMetaElement>('meta[name="description"]');
      if (!metaDesc) {
        metaDesc = document.createElement('meta');
        metaDesc.name = 'description';
        document.head.appendChild(metaDesc);
      }
      metaDesc.content = description;

      const ogDesc = document.querySelector<HTMLMetaElement>('meta[property="og:description"]');
      if (ogDesc) ogDesc.content = description;

      const twDesc = document.querySelector<HTMLMetaElement>('meta[name="twitter:description"]');
      if (twDesc) twDesc.content = description;
    }

    const canonicalPath = canonical ?? '';
    const canonicalUrl = canonicalPath
      ? `${SITE_URL}${canonicalPath}`
      : SITE_URL;

    let link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'canonical';
      document.head.appendChild(link);
    }
    link.href = canonicalUrl;

    const ogUrl = document.querySelector<HTMLMetaElement>('meta[property="og:url"]');
    if (ogUrl) ogUrl.content = canonicalUrl;

    const ogTitle = document.querySelector<HTMLMetaElement>('meta[property="og:title"]');
    if (ogTitle) ogTitle.content = fullTitle;

    const twTitle = document.querySelector<HTMLMetaElement>('meta[name="twitter:title"]');
    if (twTitle) twTitle.content = fullTitle;
  }, [title, description, canonical]);
}
