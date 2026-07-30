const fs = require('fs');
const path = require('path');

function toPascalCase(str) {
  return str.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('');
}

function toCamelCase(str) {
  const pascal = toPascalCase(str);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

const uiOldNames = [
  "accordion", "alert-dialog", "alert", "aspect-ratio", "avatar", "badge",
  "breadcrumb", "button", "calendar", "card", "carousel", "checkbox",
  "collapsible", "command", "context-menu", "dialog", "drawer", "dropdown-menu",
  "form", "hover-card", "input-otp", "input", "label", "menubar",
  "navigation-menu", "pagination", "popover", "progress", "radio-group",
  "resizable", "scroll-area", "select", "separator", "sheet", "skeleton",
  "slider", "sonner", "switch", "table", "tabs", "textarea", "toast",
  "toaster", "toggle-group", "toggle", "tooltip"
];

const hooksOldNames = ["use-toast"];

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  // fix ui imports
  content = content.replace(/(from\s+['"].*?ui\/)([a-zA-Z0-9-]+)(['"])/g, (match, p1, p2, p3) => {
    if (uiOldNames.includes(p2)) {
      return p1 + toPascalCase(p2) + p3;
    }
    return match;
  });

  // fix hooks imports
  content = content.replace(/(from\s+['"].*?hooks\/)([a-zA-Z0-9-]+)(['"])/g, (match, p1, p2, p3) => {
    if (hooksOldNames.includes(p2)) {
      return p1 + toCamelCase(p2) + p3;
    }
    return match;
  });

  // fix App.js import
  content = content.replace(/(from\s+['"].*?\/)App(?:\.js)?(['"])/g, `$1App$2`);
  // also fix import App from './App'
  content = content.replace(/import\s+App\s+from\s+['"]\.\/App(\.js)?['"]/g, `import App from './App'`);

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Fixed imports in', filePath);
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath);
    } else if (fullPath.endsWith('.js') || fullPath.endsWith('.jsx')) {
      fixFile(fullPath);
    }
  }
}

walkDir('d:/Code/2026/EY Project/Procura/Procura-Tool/frontend/src');
