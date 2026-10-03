export function ThemeScript() {
  const scriptContent = `(function() {
  try {
    var match = document.cookie.match(/(?:^|; )cartograph_theme=([^;]*)/);
    var theme = match ? decodeURIComponent(match[1]) : null;
    if (!theme) {
      theme = localStorage.getItem('cartograph_theme') || 'system';
    }
    var isDark = false;
    if (theme === 'dark') {
      isDark = true;
    } else if (theme === 'light') {
      isDark = false;
    } else {
      isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    var root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      root.setAttribute('data-theme', 'dark');
    } else {
      root.classList.remove('dark');
      root.setAttribute('data-theme', 'light');
    }
  } catch (e) {}
})();`;

  return (
    <script
      dangerouslySetInnerHTML={{ __html: scriptContent }}
      suppressHydrationWarning
    />
  );
}
