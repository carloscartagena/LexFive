import { defineConfig } from 'vite';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'sistema/js')
    }
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        casos: resolve(__dirname, 'casos.html'),
        faq: resolve(__dirname, 'faq.html'),
        terminos: resolve(__dirname, 'terminos.html'),
        aviso_privacidad: resolve(__dirname, 'aviso-privacidad.html'),
        not_found: resolve(__dirname, '404.html'),
        sistema_index: resolve(__dirname, 'sistema/index.html'),
        sistema_login: resolve(__dirname, 'sistema/login.html')
      }
    }
  }
});
