// ============================================================
//  LexFive — Impresión con cabecera del bufete
//  Abre una ventana lista para imprimir / guardar como PDF, con el
//  membrete de LexFive. Usado por Reportes, recibos, etc.
//  Extraído de app.js (paso 13 del split).
// ============================================================
import { esc, fmtDate } from './util.js';
import { toast } from './ui.js';

export function abrirImpresion(titulo, bodyHTML) {
  const w = window.open('', '_blank');
  if (!w) { toast('Permita las ventanas emergentes para imprimir.', 'error'); return; }
  w.document.write(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>${esc(titulo)}</title>
    <style>
      *{box-sizing:border-box;} body{font-family:Arial,Helvetica,sans-serif;color:#1a2330;margin:0;padding:32px;}
      .imp-head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #0e1b2c;padding-bottom:12px;margin-bottom:18px;}
      .imp-brand{font-family:Georgia,serif;font-size:22px;font-weight:700;color:#0e1b2c;}
      .imp-brand span{color:#c2a25a;}
      .imp-sub{font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#a8853c;}
      .imp-meta{font-size:12px;color:#5c6675;text-align:right;}
      h1{font-size:18px;color:#0e1b2c;margin:0 0 12px;font-family:Georgia,serif;}
      table{width:100%;border-collapse:collapse;font-size:12px;margin-top:8px;}
      th,td{border:1px solid #d9dce1;padding:7px 9px;text-align:left;vertical-align:top;}
      thead th{background:#0e1b2c;color:#fff;text-transform:uppercase;font-size:10px;letter-spacing:.5px;}
      tr:nth-child(even) td{background:#f6f7f9;}
      .tot td,.tot th{font-weight:700;background:#eef0f3;}
      .imp-foot{margin-top:28px;font-size:11px;color:#5c6675;}
      @media print{@page{margin:14mm;}}
    </style></head><body>
    <div class="imp-head">
      <div><div class="imp-brand">Lex<span>Five</span></div><div class="imp-sub">Bufete de Abogados</div></div>
      <div class="imp-meta">La Paz / El Alto - Bolivia<br>Generado: ${esc(fmtDate(new Date()))}</div>
    </div>
    ${bodyHTML}
    <script>window.onload=function(){window.print();}<\/script>
    </body></html>`);
  w.document.close();
}
