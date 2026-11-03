// builds dev.html (one <script> per source file, for editing) and film.html (single self-contained file,
// soundtrack embedded as a data URI when audio/soundtrack.m4a exists)
import fs from 'fs';
const order = JSON.parse(fs.readFileSync('src/order.json', 'utf8'));
const shell = fs.readFileSync('src/shell.html', 'utf8');
fs.writeFileSync('dev.html', shell.replace('<!--SCRIPTS-->', order.map(f => `<script src="src/${f}"></script>`).join('\n')));
const snd = fs.existsSync('audio/soundtrack.m4a')
  ? `window.__SOUNDTRACK = "data:audio/mp4;base64,${fs.readFileSync('audio/soundtrack.m4a').toString('base64')}";\n` : '';
const inl = shell.replace('<!--SCRIPTS-->', () => '<script>\n' + snd + order.map(f => `// ===== ${f} =====\n` + fs.readFileSync('src/' + f, 'utf8')).join('\n') + '\n</script>');
fs.writeFileSync('film.html', inl);
console.log('built film.html', (fs.statSync('film.html').size / 1024).toFixed(0) + 'KB', snd ? '(with soundtrack)' : '(no soundtrack)');
