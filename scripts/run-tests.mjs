import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const testOutDir = path.join(rootDir, '.test-dist');
const tscEntry = path.join(rootDir, 'node_modules', 'typescript', 'bin', 'tsc');

const isWatch = process.argv.includes('--watch');

const compileTests = () => {
    fs.rmSync(testOutDir, { recursive: true, force: true });
    execFileSync(process.execPath, [tscEntry, '-p', path.join(rootDir, 'tsconfig.test.json')], {
        cwd: rootDir,
        stdio: 'inherit'
    });
    fs.writeFileSync(path.join(testOutDir, 'package.json'), JSON.stringify({ type: 'commonjs' }));
};

const collectTestFiles = (dir) => {
    if (!fs.existsSync(dir)) return [];
    const results = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            results.push(...collectTestFiles(fullPath));
        } else if (entry.name.endsWith('.test.js')) {
            results.push(fullPath);
        }
    }
    return results.sort();
};

try {
    compileTests();
    const testFiles = collectTestFiles(path.join(testOutDir, 'tests'));
    if (testFiles.length === 0) {
        console.error('No compiled test files found.');
        process.exitCode = 1;
    } else {
        const args = ['--test'];
        if (isWatch) {
            args.push('--watch');
        }
        args.push(...testFiles.map((file) => path.relative(rootDir, file)));
        execFileSync(process.execPath, args, {
            cwd: rootDir,
            stdio: 'inherit'
        });
    }
} catch (error) {
    process.exitCode = typeof error?.status === 'number' ? error.status : 1;
} finally {
    if (!isWatch) {
        fs.rmSync(testOutDir, { recursive: true, force: true });
    }
}
