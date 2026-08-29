const fs = require('fs');
const path = require('path');

const jsDir = path.resolve(__dirname, '../sistema/js');

const mapping = {
  // API
  'supabase.js': 'api',
  'auth.js': 'api',
  'credstore.js': 'api',
  // Utils
  'config.js': 'utils',
  'dom.js': 'utils',
  'icons.js': 'utils',
  'media.js': 'utils',
  'print.js': 'utils',
  'state.js': 'utils',
  'storage.js': 'utils',
  'ui.js': 'utils',
  'util.js': 'utils',
  // Shared
  'branding-catalogos.js': 'shared',
  'branding.js': 'shared',
  'comunes.js': 'shared',
  'datos.js': 'shared',
  // Views
  'admin.js': 'views',
  'agenda.js': 'views',
  'areas.js': 'views',
  'blog.js': 'views',
  'categorias.js': 'views',
  'certificados.js': 'views',
  'clientes.js': 'views',
  'consultas.js': 'views',
  'credenciales.js': 'views',
  'dashboard.js': 'views',
  'exportar.js': 'views',
  'finanzas.js': 'views',
  'horas.js': 'views',
  'imagenes.js': 'views',
  'informe.js': 'views',
  'membrete-base.js': 'views',
  'membrete.js': 'views',
  'modelos.js': 'views',
  'opiniones.js': 'views',
  'papelera.js': 'views',
  'plantillas.js': 'views',
  'portal-cliente.js': 'views',
  'procesos.js': 'views',
  'reportes.js': 'views',
  'sellos.js': 'views',
  'sitio.js': 'views',
  'tareas.js': 'views',
  'tarjetas.js': 'views',
  'draft.js': 'views',
  // Roots
  'app.js': ''
};

// Ensure directories exist
const dirs = [...new Set(Object.values(mapping))].filter(Boolean);
dirs.forEach(d => {
  const p = path.join(jsDir, d);
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
});

const files = fs.readdirSync(jsDir).filter(f => f.endsWith('.js'));

files.forEach(file => {
  if (!mapping.hasOwnProperty(file)) {
    // If it's a directory or already moved file, ignore
    return;
  }
  
  const filePath = path.join(jsDir, file);
  if (!fs.statSync(filePath).isFile()) return;

  const content = fs.readFileSync(filePath, 'utf-8');
  
  // Replace imports like: import { x } from './auth.js'; 
  // with: import { x } from '@/api/auth.js';
  const updatedContent = content.replace(/from\s+['"]\.\/([^'"]+)['"]/g, (match, importedFile) => {
    const targetFolder = mapping[importedFile];
    if (targetFolder === undefined) {
      console.warn(`Warning: imported file ${importedFile} not in mapping!`);
      return match;
    }
    const aliasPath = targetFolder ? `@/${targetFolder}/${importedFile}` : `@/${importedFile}`;
    return `from '${aliasPath}'`;
  });

  // Also catch dynamic imports if any: import('./file.js')
  const fullyUpdatedContent = updatedContent.replace(/import\(\s*['"]\.\/([^'"]+)['"]\s*\)/g, (match, importedFile) => {
    const targetFolder = mapping[importedFile];
    if (targetFolder === undefined) return match;
    const aliasPath = targetFolder ? `@/${targetFolder}/${importedFile}` : `@/${importedFile}`;
    return `import('${aliasPath}')`;
  });

  const destFolder = mapping[file];
  const destPath = destFolder ? path.join(jsDir, destFolder, file) : path.join(jsDir, file);

  // Write new content to new path
  fs.writeFileSync(destPath, fullyUpdatedContent);
  
  // Delete old file if it moved
  if (destFolder) {
    fs.unlinkSync(path.join(jsDir, file));
  }
  console.log(`Migrated ${file} -> ${destFolder || 'root'}`);
});
console.log('Refactor complete!');
