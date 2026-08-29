import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(import.meta.dirname, 'sistema/js')
    }
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        casos: resolve(import.meta.dirname, 'casos.html'),
        blog: resolve(import.meta.dirname, 'blog.html'),
        faq: resolve(import.meta.dirname, 'faq.html'),
        verificar: resolve(import.meta.dirname, 'verificar.html'),
        verificar_certificado: resolve(import.meta.dirname, 'verificar-certificado.html'),
        terminos: resolve(import.meta.dirname, 'terminos.html'),
        aviso_privacidad: resolve(import.meta.dirname, 'aviso-privacidad.html'),
        not_found: resolve(import.meta.dirname, '404.html'),
        sistema_index: resolve(import.meta.dirname, 'sistema/index.html'),
        sistema_login: resolve(import.meta.dirname, 'sistema/login.html')
      }
    }
  }
});
