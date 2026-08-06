const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

const inputPath = path.join(__dirname, '..', 'docs', 'descricao_sistema_e_manual_clp.md');
const outputPath = path.join(__dirname, '..', 'docs', 'descricao_sistema_e_manual_clp.pdf');

function findFontPath() {
  const candidates = [
    'C:/Windows/Fonts/arial.ttf',
    'C:/Windows/Fonts/arialbd.ttf',
    'C:/Windows/Fonts/ARIAL.TTF',
    'C:/Windows/Fonts/calibri.ttf',
    '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
    '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf',
  ];
  return candidates.find((candidate) => fs.existsSync(candidate));
}

function normalizeText(line) {
  return line
    .replace(/^#{1,6}\s*/, '')
    .replace(/^[-*]\s+/, '• ')
    .replace(/^\d+\.\s+/, '');
}

function parseMarkdown(content) {
  const lines = content.split(/\r?\n/);
  const blocks = [];
  let current = [];

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      if (current.length) {
        blocks.push(current);
        current = [];
      }
      continue;
    }

    if (/^#{1,6}\s+/.test(line)) {
      if (current.length) {
        blocks.push(current);
        current = [];
      }
      blocks.push([{ type: 'heading', text: normalizeText(line) }]);
      continue;
    }

    if (/^[-*]\s+/.test(line) || /^\d+\.\s+/.test(line)) {
      current.push({ type: 'bullet', text: normalizeText(line) });
      continue;
    }

    current.push({ type: 'paragraph', text: line.trim() });
  }

  if (current.length) blocks.push(current);
  return blocks;
}

function renderPdf() {
  const content = fs.readFileSync(inputPath, 'utf8');
  const blocks = parseMarkdown(content);
  const doc = new PDFDocument({ margin: 40, size: 'A4' });
  const fontPath = findFontPath();
  if (fontPath) doc.font(fontPath);
  else doc.font('Helvetica');

  const stream = fs.createWriteStream(outputPath);
  doc.pipe(stream);

  let y = 50;
  const pageWidth = 595.28;
  const maxY = 760;

  const addText = (text, options = {}) => {
    const safeText = String(text ?? '');
    const lines = [];
    const words = safeText.split(/(\s+)/);
    let current = '';
    const maxWidth = pageWidth - 80;
    words.forEach((word) => {
      const candidate = current + word;
      if (word.trim() && doc.widthOfString(candidate, options) > maxWidth) {
        if (current.trim()) lines.push(current.trim());
        current = word;
      } else {
        current = candidate;
      }
    });
    if (current.trim()) lines.push(current.trim());
    const actualLines = lines.length ? lines : [safeText];
    actualLines.forEach((line) => {
      if (y > maxY) {
        doc.addPage();
        y = 50;
      }
      doc.text(line, 40, y, { ...options, align: options.align || 'left' });
      y += (options.fontSize || 11) * 1.35;
    });
  };

  doc.fontSize(20).text('Sistema ICS Industrial', { align: 'center' });
  y += 20;
  doc.fontSize(10).fillColor('gray').text('Documento gerado automaticamente a partir da documentação do projeto', { align: 'center' });
  y += 20;
  doc.fillColor('black');

  blocks.forEach((block) => {
    const first = block[0];
    if (!first) return;
    if (first.type === 'heading') {
      if (y > maxY - 60) {
        doc.addPage();
        y = 50;
      }
      doc.fontSize(14).font('Helvetica-Bold');
      addText(first.text, { fontSize: 14 });
      doc.font('Helvetica');
      y += 4;
      return;
    }

    block.forEach((item) => {
      if (item.type === 'bullet') {
        if (y > maxY - 30) {
          doc.addPage();
          y = 50;
        }
        addText(item.text, { fontSize: 10, indent: 12 });
      } else if (item.type === 'paragraph') {
        if (y > maxY - 30) {
          doc.addPage();
          y = 50;
        }
        addText(item.text, { fontSize: 10 });
      }
    });
    y += 6;
  });

  doc.end();
  stream.on('finish', () => {
    console.log(`PDF criado em ${outputPath}`);
  });
}

try {
  renderPdf();
} catch (error) {
  console.error(error);
  process.exit(1);
}
