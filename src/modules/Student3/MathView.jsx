import React, { useMemo } from 'react';
import katex from 'katex';

/**
 * Renders mathematical formulas using KaTeX.
 * Handles both inline and display (block) mode safely.
 */
export default function MathView({ math, display = false, className = '' }) {
  const html = useMemo(() => {
    try {
      return katex.renderToString(math, {
        displayMode: display,
        throwOnError: false,
      });
    } catch {
      return `<code>${math}</code>`;
    }
  }, [math, display]);

  return (
    <span
      className={`inline-block font-serif ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
