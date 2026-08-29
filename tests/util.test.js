import { describe, it, expect } from 'vitest';
import { fmtFechaCorta, esEmailValido, esc } from '../sistema/js/utils/util.js';

describe('Utilidades puras (util.js)', () => {
    
    describe('fmtFechaCorta', () => {
        it('debe formatear una fecha YYYY-MM-DD a DD/MM/YYYY', () => {
            const result = fmtFechaCorta('2023-12-25');
            expect(result).toBe('25/12/2023');
        });

        it('debe devolver el mismo texto si no es formato ISO', () => {
            const result = fmtFechaCorta('25 de diciembre');
            expect(result).toBe('25 de diciembre');
        });
    });

    describe('esEmailValido', () => {
        it('debe devolver true para emails validos', () => {
            expect(esEmailValido('test@example.com')).toBe(true);
            expect(esEmailValido('usuario.nombre@dominio.co')).toBe(true);
        });

        it('debe devolver false para emails invalidos', () => {
            expect(esEmailValido('test@com')).toBe(false);
            expect(esEmailValido('usuario sin arroba.com')).toBe(false);
        });
    });

    describe('esc', () => {
        it('debe escapar caracteres HTML peligrosos', () => {
            const htmlString = '<script>alert("XSS")</script>&';
            expect(esc(htmlString)).toBe('&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;&amp;');
        });
    });

});
