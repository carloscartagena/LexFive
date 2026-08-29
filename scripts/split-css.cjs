const fs = require('fs');
const path = require('path');

const stylesPath = path.join(__dirname, '../css/styles.css');
const content = fs.readFileSync(stylesPath, 'utf-8');

// I will split the file by the main comments "/* ----------"
const chunks = content.split(/\/\* =========================================================|\/\* ----------/);

let variables = '';
let base = '';
let components = [];

chunks.forEach(chunk => {
    if (chunk.trim() === '') return;
    
    if (chunk.includes('LexFive — Sitio público')) {
        variables += '/* =========================================================' + chunk;
    } else if (chunk.includes('Tipografía base') || chunk.trim().startsWith('* {')) {
        base += '/* ----------' + chunk;
    } else {
        const titleMatch = chunk.match(/(.+?)---------- \*\//);
        if (titleMatch) {
            let title = titleMatch[1].trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
            components.push({
                name: title,
                content: '/* ---------- ' + chunk
            });
        } else {
            // It might be the media queries at the end or dark mode
            if (chunk.includes('MODO OSCURO')) {
                components.push({
                    name: 'dark-mode',
                    content: '/* =========================================================' + chunk
                });
            } else if (chunk.includes('Páginas internas')) {
                components.push({
                    name: 'paginas-internas',
                    content: '/* =========================================================' + chunk
                });
            } else {
                base += chunk;
            }
        }
    }
});

// Extract variables explicitly since they don't have a /* --------- block
const rootMatch = variables.match(/:root\s*{[^}]*}[\s\S]*?(?=\* {)/);
if (rootMatch) {
    base = variables.substring(rootMatch.index + rootMatch[0].length) + base;
    variables = variables.substring(0, rootMatch.index + rootMatch[0].length);
}

fs.writeFileSync(path.join(__dirname, '../css/components/variables.css'), variables);
fs.writeFileSync(path.join(__dirname, '../css/components/base.css'), base);

let imports = `/* =========================================================
   LexFive — Estilos Principales
   ========================================================= */

@import './components/variables.css';
@import './components/base.css';
`;

components.forEach(comp => {
    if(comp.name === '') comp.name = 'misc-' + Math.random().toString(36).substring(7);
    const filename = `${comp.name}.css`;
    fs.writeFileSync(path.join(__dirname, '../css/components', filename), comp.content);
    imports += `@import './components/${filename}';\n`;
});

fs.writeFileSync(stylesPath, imports);
console.log('CSS dividido con éxito!');
