# HTML Formatting

Every lesson and reference document is a self-contained HTML file. Follow these rules to ensure consistent, readable output.

## Font selection by language

Pick fonts based on the **language of the lesson content**, not the code examples. The conversation language is the primary signal.

| Language                  | Primary font                        | Fallback                                           | Notes                                                                                                                                                                     |
| ------------------------- | ----------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vietnamese                | `Noto Sans`                       | `Arial, sans-serif`                              | Covers all Vietnamese diacritics (ă, â, ê, ô, ơ, ư, and their tone marks). Avoid`Times New Roman` — it has poor rendering for Vietnamese accents at small sizes. |
| English                   | `Inter` or `Noto Sans`          | `system-ui, sans-serif`                          | Clean geometric sans-serif, excellent at all sizes.                                                                                                                       |
| Japanese                  | `Noto Sans JP`                    | `Hiragino Sans, Meiryo, sans-serif`              | Full CJK coverage.                                                                                                                                                        |
| Chinese (Simplified)      | `Noto Sans SC`                    | `PingFang SC, Microsoft YaHei, sans-serif`       |                                                                                                                                                                           |
| Chinese (Traditional)     | `Noto Sans TC`                    | `PingFang TC, Microsoft JhengHei, sans-serif`    |                                                                                                                                                                           |
| Korean                    | `Noto Sans KR`                    | `Apple SD Gothic Neo, Malgun Gothic, sans-serif` |                                                                                                                                                                           |
| Code-heavy (any language) | `JetBrains Mono` or `Fira Code` | `Consolas, monospace`                            | Use for`<code>` and `<pre>` blocks only.                                                                                                                              |

When the lesson mixes languages (e.g. Vietnamese text with English code), set the **body** font to match the conversation language and use the code font inside `<code>` / `<pre>` tags.

```html
<style>
  body {
    font-family: 'Noto Sans', Arial, sans-serif;
    line-height: 1.7;
  }
  code, pre {
    font-family: 'JetBrains Mono', Consolas, monospace;
  }
</style>
```

## Self-contained requirement

Every HTML file must work offline — no external CDN links for fonts, styles, or scripts. Use Google Fonts `@import` only if you embed the CSS inline via `<style>` tags (the browser will fetch the font on first load, but the file still opens correctly without it via fallback fonts). Prefer embedding a minimal subset or using system fonts when possible.

## Layout rules

- **Max content width**: 720px, centered. Wider lines hurt readability.
- **Typography scale**: Use a modular scale (e.g. 1.25). Body text 16–18px, headings step up from there.
- **Spacing**: Generous margins between sections. Use `2rem` minimum between major blocks.
- **Print-friendly**: Include `@media print` styles. Lessons should look good on paper.
- **Responsive**: Use relative units (`rem`, `%`, `em`) — no fixed pixel widths on content containers.
- **Light/dark mode**: Every lesson must support both via CSS custom properties AND a manual toggle button. See below.

## Color palette

Use a consistent color palette across all lessons. Light mode is the default; dark mode inverts the surface and text while keeping accent colors readable. Every lesson must include a **toggle button** so users can override their OS setting.

```css
/* ── Light mode (default) ── */
:root, [data-theme="light"] {
  --bg: #ffffff;
  --surface: #f8f9fa;
  --text: #1a1a2e;
  --text-muted: #6c757d;
  --accent: #2563eb;
  --accent-hover: #1d4ed8;
  --border: #dee2e6;
  --code-bg: #f1f3f5;
  --highlight: #fff3cd;
}

/* ── Dark mode (auto via OS) ── */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --bg: #1a1a2e;
    --surface: #16213e;
    --text: #e0e0e0;
    --text-muted: #a0a0b0;
    --accent: #60a5fa;
    --accent-hover: #93bbfd;
    --border: #2a2a4a;
    --code-bg: #0f172a;
    --highlight: #4a3f00;
  }
}

/* ── Dark mode (manual toggle) ── */
[data-theme="dark"] {
  --bg: #1a1a2e;
  --surface: #16213e;
  --text: #e0e0e0;
  --text-muted: #a0a0b0;
  --accent: #60a5fa;
  --accent-hover: #93bbfd;
  --border: #2a2a4a;
  --code-bg: #0f172a;
  --highlight: #4a3f00;
}

/* ── Theme toggle button ── */
.theme-toggle {
  position: fixed;
  top: 1rem;
  right: 1rem;
  background: var(--surface);
  border: 1px solid var(--border);
  color: var(--text);
  border-radius: 8px;
  padding: 0.5rem 0.75rem;
  cursor: pointer;
  font-size: 1.1rem;
  z-index: 1000;
  transition: background 0.2s, color 0.2s;
}

.theme-toggle:hover {
  background: var(--accent);
  color: var(--bg);
}

body {
  background-color: var(--bg);
  color: var(--text);
  font-family: 'Noto Sans', Arial, sans-serif;
  line-height: 1.7;
  max-width: 720px;
  margin: 0 auto;
  padding: 2rem;
}

code, pre {
  font-family: 'JetBrains Mono', Consolas, monospace;
  background-color: var(--code-bg);
  border: 1px solid var(--border);
  border-radius: 4px;
}

pre {
  padding: 1rem;
  overflow-x: auto;
}

a {
  color: var(--accent);
  text-decoration: none;
}

a:hover {
  color: var(--accent-hover);
  text-decoration: underline;
}

blockquote {
  border-left: 3px solid var(--accent);
  margin: 1.5rem 0;
  padding: 0.5rem 1rem;
  background-color: var(--surface);
  border-radius: 4px;
}

hr {
  border: none;
  border-top: 1px solid var(--border);
  margin: 2rem 0;
}

@media print {
  :root {
    --bg: #ffffff;
    --text: #000000;
    --accent: #000000;
  }
  body { max-width: 100%; padding: 0; }
}
```

Every lesson must use these CSS custom properties (`var(--bg)`, `var(--text)`, etc.) instead of hardcoded color values. This guarantees consistent appearance across light and dark mode without per-element overrides.

## Toggle button

Every lesson must include a theme toggle button and the following `<script>` before `</body>`. The button persists the user's choice to `localStorage` so it survives page reloads. On first visit, it follows the OS preference.

```html
<button class="theme-toggle" id="themeToggle" aria-label="Toggle dark mode">🌓</button>

<script>
(function () {
  const toggle = document.getElementById('themeToggle');
  const root = document.documentElement;

  // Determine initial theme: localStorage > OS preference > default (light)
  function getPreferredTheme() {
    const stored = localStorage.getItem('theme');
    if (stored) return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function applyTheme(theme) {
    root.setAttribute('data-theme', theme);
    toggle.textContent = theme === 'dark' ? '☀️' : '🌓';
  }

  applyTheme(getPreferredTheme());

  toggle.addEventListener('click', function () {
    const current = root.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    localStorage.setItem('theme', next);
  });

  // React to OS preference changes (only when user hasn't manually toggled)
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function (e) {
    if (!localStorage.getItem('theme')) {
      applyTheme(e.matches ? 'dark' : 'light');
    }
  });
})();
</script>
```

The toggle appears as a fixed button in the top-right corner (see `.theme-toggle` in the CSS above). It shows 🌓 in light mode and ☀️ in dark mode.
