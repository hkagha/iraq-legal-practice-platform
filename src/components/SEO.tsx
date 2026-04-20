import { useEffect } from 'react';

interface SEOProps {
  title: string;
  description?: string;
  canonical?: string;
}

/**
 * Lightweight per-page SEO helper. Updates <title>, meta description,
 * canonical link, and og:title/og:description without adding a dependency.
 */
export default function SEO({ title, description, canonical }: SEOProps) {
  useEffect(() => {
    const fullTitle = title.length > 60 ? title.slice(0, 57) + '…' : title;
    document.title = fullTitle;

    const setMeta = (selector: string, attr: 'name' | 'property', key: string, content: string) => {
      let el = document.head.querySelector<HTMLMetaElement>(selector);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    if (description) {
      const desc = description.length > 160 ? description.slice(0, 157) + '…' : description;
      setMeta('meta[name="description"]', 'name', 'description', desc);
      setMeta('meta[property="og:description"]', 'property', 'og:description', desc);
      setMeta('meta[name="twitter:description"]', 'name', 'twitter:description', desc);
    }
    setMeta('meta[property="og:title"]', 'property', 'og:title', fullTitle);
    setMeta('meta[name="twitter:title"]', 'name', 'twitter:title', fullTitle);

    // Canonical
    const href = canonical || window.location.href.split('#')[0].split('?')[0];
    let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = document.createElement('link');
      link.setAttribute('rel', 'canonical');
      document.head.appendChild(link);
    }
    link.setAttribute('href', href);
  }, [title, description, canonical]);

  return null;
}
