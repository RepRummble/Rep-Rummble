import React from 'react';
import { Link } from 'react-router-dom';

export interface BreadcrumbItem {
  label: string;
  to?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export default function Breadcrumb({ items }: BreadcrumbProps) {
  const schemaItems = [
    { name: 'Home', item: 'https://reprummble.com/' },
    ...items.map((crumb, i) => ({
      name: crumb.label,
      item: crumb.to ? `https://reprummble.com${crumb.to}` : undefined,
      position: i + 2,
    })),
  ];

  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: schemaItems.map((crumb, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: crumb.name,
      ...(crumb.item ? { item: crumb.item } : {}),
    })),
  });

  return (
    <>
      {/* JSON-LD for search engines — JSON.stringify escapes all HTML; script[type=ld+json] is never parsed as HTML */}
      {/* nosemgrep: react-dangerouslysetinnerhtml */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />

      <nav className="breadcrumb" aria-label="Breadcrumb">
        <ol className="breadcrumb-list">
          <li className="breadcrumb-item">
            <Link to="/">Home</Link>
          </li>
          {items.map((crumb, idx) => (
            <li key={idx} className="breadcrumb-item">
              <span className="breadcrumb-sep" aria-hidden="true">/</span>
              {crumb.to && idx < items.length - 1 ? (
                <Link to={crumb.to}>{crumb.label}</Link>
              ) : (
                <span aria-current="page">{crumb.label}</span>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </>
  );
}
