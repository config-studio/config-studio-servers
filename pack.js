const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const dist = path.join(__dirname, 'dist-pkg');
if (fs.existsSync(dist)) fs.rmSync(dist, { recursive: true });
fs.mkdirSync(dist, { recursive: true });

const requiredFiles = ['plugin.json', 'main.js', 'style.css', 'README.md'];
for (const file of requiredFiles) {
  const src = path.join(__dirname, file);
  if (!fs.existsSync(src)) {
    console.error(`Missing required file: ${file}`);
    process.exit(1);
  }
  fs.copyFileSync(src, path.join(dist, file));
}

// Copy agent binaries for Air-Gapped / 1-Click remote installation
const agentsDir = path.join(__dirname, 'agents');
if (fs.existsSync(agentsDir)) {
  const distAgentsDir = path.join(dist, 'agents');
  fs.mkdirSync(distAgentsDir, { recursive: true });
  for (const binary of fs.readdirSync(agentsDir)) {
    const srcFile = path.join(agentsDir, binary);
    if (fs.statSync(srcFile).isFile()) {
      fs.copyFileSync(srcFile, path.join(distAgentsDir, binary));
    }
  }
  console.log('[Pack] Copied agent binaries to package directory');
}

const csDir = path.join(__dirname, '..', 'config-studio');
const pluginJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'plugin.json'), 'utf8'));
const version = pluginJson.version || '1.5.2';
const pkgVersioned = path.join(__dirname, `servers-${version}.cspkg`);
const pkgLatest = path.join(__dirname, 'servers.cspkg');

console.log(`[Pack] Packaging v${version} with cspkg CLI...`);
execSync(`go run ./cmd/cspkg pack "${dist}" -o "${pkgVersioned}"`, { cwd: csDir, stdio: 'inherit' });
fs.copyFileSync(pkgVersioned, pkgLatest);

// Also copy to config-studio-plugins packages repository if present
const pluginsPackagesDir = path.join(__dirname, '..', 'config-studio-plugins', 'packages');
if (fs.existsSync(pluginsPackagesDir)) {
  fs.copyFileSync(pkgVersioned, path.join(pluginsPackagesDir, `servers-${version}.cspkg`));
  fs.copyFileSync(pkgVersioned, path.join(pluginsPackagesDir, 'servers.cspkg'));
  console.log('[Pack] Copied package to config-studio-plugins/packages/');
}

// Also update runtime test environment if exists
const testPluginsDir = path.join('C:\\', 'Users', 'iBella', 'Desktop', 'test', 'data', 'plugins');
if (fs.existsSync(testPluginsDir)) {
  fs.copyFileSync(pkgLatest, path.join(testPluginsDir, 'servers.cspkg'));
  console.log('[Pack] Updated runtime test environment plugin servers.cspkg');
}

fs.rmSync(dist, { recursive: true });
console.log('✓ Servers package created successfully!');
