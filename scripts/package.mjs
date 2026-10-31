import { mkdir, cp, copyFile, access, readFile, writeFile, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist', 'Arasaka-Web-Wallpaper');
for (const filename of ['project.json', 'LivelyInfo.json']) {
  const manifest = JSON.parse(await readFile(path.join(root, filename), 'utf8'));
  for (const asset of [manifest.file || manifest.FileName, manifest.preview || manifest.Preview, manifest.Thumbnail].filter(Boolean)) await access(path.join(root, asset));
}
JSON.parse(await readFile(path.join(root, 'LivelyProperties.json'), 'utf8'));
await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
await mkdir(path.join(root, 'downloads'), { recursive: true });
for (const name of ['index.html', 'styles.css', 'collection.css', 'editor.css', 'editor.js', 'collection.js', 'app.js', 'README.md', 'LivelyInfo.json', 'LivelyProperties.json', 'project.json']) await copyFile(path.join(root, name), path.join(dist, name));
await writeFile(path.join(dist, 'index.html'), (await readFile(path.join(dist, 'index.html'), 'utf8')).replace('<body>', '<body data-package="web">'));
await writeFile(path.join(dist, 'README.md'), '# Ready to use\n\nThis is the extracted web wallpaper. Open this folder’s `index.html` in Lively Wallpaper or import it into Wallpaper Engine. All assets must stay beside it. The native macOS app is a separate download from the original project.\n\n---\n\n' + await readFile(path.join(root, 'README.md'), 'utf8'));
await cp(path.join(root, 'assets'), path.join(dist, 'assets'), { recursive: true });
// Host packages have their own setup instructions; no nested self-referencing archives.
const archive = path.join(root, 'downloads', 'Arasaka-Web-Wallpaper.zip');
// zip updates existing archives; remove the generated archive to prevent stale entries.
await rm(archive, { force: true });
execFileSync('/usr/bin/zip', ['-q', '-r', archive, '.'], { cwd: dist });
try { await access(path.join(root, 'downloads', 'Arasaka-macOS.zip')); console.log('macOS package is ready.'); } catch { console.log('Run npm run build:mac on macOS to create the native app.'); }
console.log(`Web wallpaper: ${archive}`);
console.log(`Unpacked wallpaper: ${dist}`);

const second = path.join(root,'dist','Arasaka-Second-Screen');
await rm(second,{recursive:true,force:true});
await cp(dist,second,{recursive:true});
await writeFile(path.join(second,'index.html'),(await readFile(path.join(second,'index.html'),'utf8')).replace('<body data-package="web">','<body data-package="web" data-default-preset="editor">'));
const project = JSON.parse(await readFile(path.join(second,'project.json'),'utf8'));
project.title = 'Arasaka / Source — Second Screen'; project.preview = 'assets/preview-editor.jpg'; project.general.properties.preset.value = 'editor';
await writeFile(path.join(second,'project.json'),JSON.stringify(project,null,2)+'\n');
const properties = JSON.parse(await readFile(path.join(second,'LivelyProperties.json'),'utf8')); properties.preset.value = 5;
await writeFile(path.join(second,'LivelyProperties.json'),JSON.stringify(properties,null,2)+'\n');
const info = JSON.parse(await readFile(path.join(second,'LivelyInfo.json'),'utf8')); info.Title = project.title; info.Preview = info.Thumbnail = 'assets/preview-editor.jpg';
await writeFile(path.join(second,'LivelyInfo.json'),JSON.stringify(info,null,2)+'\n');
await access(path.join(second,'assets','preview-editor.jpg'));
const secondArchive = path.join(root,'downloads','Arasaka-Second-Screen.zip'); await rm(secondArchive,{force:true});
execFileSync('/usr/bin/zip',['-q','-r',secondArchive,'.'],{cwd:second});
console.log(`Second-screen wallpaper: ${secondArchive}`);
