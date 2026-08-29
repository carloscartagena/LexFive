import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const filesToCopy = [
  'robots.txt',
  'sitemap.xml',
  'sistema/sw.js',
  'sistema/manifest.webmanifest',
];

// Añadir manuales y PDFs de la raíz
const rootDir = path.join(__dirname, '..');
fs.readdirSync(rootDir).forEach(file => {
  if (file.endsWith('.pdf') || file.endsWith('.docx') || file.endsWith('.md')) {
    // Ignorar README y archivos ocultos si se desea, pero los copiamos por si acaso
    if (!file.startsWith('.')) {
      filesToCopy.push(file);
    }
  }
});

filesToCopy.forEach(file => {
  const src = path.join(rootDir, file);
  const dest = path.join(rootDir, 'dist', file);
  if (fs.existsSync(src)) {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
});
console.log("✔️ Archivos estáticos extra copiados a dist/");
