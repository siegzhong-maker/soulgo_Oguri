import { access } from 'node:fs/promises';
import path from 'node:path';

const projectRoot = process.cwd();

const requiredAssets = [
  '场景/兔子.svg',
  '兔子动画导出/呼吸演示.gif',
  '兔子动画导出/等待演示.gif',
  '兔子动画导出/观察演示.gif',
  '兔子动画导出/互动演示.gif',
  '兔子动画导出/休息演示.gif',
  '兔子动画导出/吃演示.gif',
  '兔子动画导出/摸演示.gif'
];

async function checkFile(relativePath) {
  try {
    await access(path.join(projectRoot, relativePath));
    return true;
  } catch {
    return false;
  }
}

const missing = [];
for (const file of requiredAssets) {
  // eslint-disable-next-line no-await-in-loop
  const exists = await checkFile(file);
  if (!exists) missing.push(file);
}

if (missing.length > 0) {
  console.error('Rabbit asset check failed. Missing files:');
  missing.forEach((m) => console.error(`- ${m}`));
  process.exit(1);
}

console.log('Rabbit asset check passed. All required files exist.');
