const fs = require('fs');
const path = require('path');

const stylesPath = path.join(__dirname, '../sistema/css/panel.css');
const content = fs.readFileSync(stylesPath, 'utf-8');

// I will split the file by the main comments "/* ----------" and "/* ===="
const chunks = content.split(/(?=\/\* ============================================================|\/\* ----------)/);

let variables = '';
let base = '';
let components = [];

chunks.forEach(chunk => {
    if (chunk.trim() === '') return;
    
    if (chunk.includes('LexFive — Sistema de Gestión Legal')) {
        variables += chunk;
    } else {
        const titleMatch = chunk.match(/\/\* (?:==========|----------) (.+?) (?:==========|----------) \*\//);
        if (titleMatch) {
            let title = titleMatch[1].trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
            components.push({
                name: title,
                content: chunk
            });
        } else {
            // Probably un-commented block or print queries
            if (chunk.includes('@media print')) {
                components.push({
                    name: 'print',
                    content: chunk
                });
            } else if (chunk.includes('@media (max-width')) {
                 components.push({
                    name: 'responsive',
                    content: chunk
                });
            } else {
                components.push({
                    name: 'misc-' + Math.random().toString(36).substring(7),
                    content: chunk
                });
            }
        }
    }
});

fs.writeFileSync(path.join(__dirname, '../sistema/css/components/variables-y-base.css'), variables);

let imports = `/* ============================================================
   LexFive — Sistema de Gestión Legal (Panel)
   ============================================================ */

@import './components/variables-y-base.css';
`;

components.forEach(comp => {
    if(comp.name === '') comp.name = 'misc-' + Math.random().toString(36).substring(7);
    const filename = `${comp.name}.css`;
    fs.writeFileSync(path.join(__dirname, '../sistema/css/components', filename), comp.content);
    imports += `@import './components/${filename}';\n`;
});

fs.writeFileSync(stylesPath, imports);
console.log('Panel CSS dividido con éxito!');
