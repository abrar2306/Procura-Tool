const fs = require('fs');
const path = require('path');

function toPascalCase(str) {
  return str.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('');
}

function toCamelCase(str) {
  const pascal = toPascalCase(str);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

const uiDir = 'd:/Code/2026/EY Project/Procura/Procura-Tool/frontend/src/components/ui';
const hooksDir = 'd:/Code/2026/EY Project/Procura/Procura-Tool/frontend/src/hooks';

const uiFiles = fs.readdirSync(uiDir).filter(f => f.endsWith('.jsx'));
const hooksFiles = fs.readdirSync(hooksDir).filter(f => f.endsWith('.js'));

const cmds = [];

uiFiles.forEach(file => {
  const name = path.basename(file, '.jsx');
  const newName = toPascalCase(name) + '.jsx';
  if (file !== newName) {
    cmds.push(`git mv "src/components/ui/${file}" "src/components/ui/${newName}"`);
  }
});

hooksFiles.forEach(file => {
  const name = path.basename(file, '.js');
  const newName = toCamelCase(name) + '.js';
  if (file !== newName) {
    cmds.push(`git mv "src/hooks/${file}" "src/hooks/${newName}"`);
  }
});

cmds.push(`git mv "src/App.js" "src/App.jsx"`);

fs.writeFileSync('d:/Code/2026/EY Project/Procura/Procura-Tool/frontend/rename.ps1', cmds.join('\n'));
console.log('done');
