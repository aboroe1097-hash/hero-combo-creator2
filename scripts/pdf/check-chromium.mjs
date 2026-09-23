import { chromium } from '@playwright/test';

try {
  const browser = await chromium.launch();
  console.log('LAUNCH_OK', browser.version());
  await browser.close();
} catch (error) {
  const message = String(error.message);
  console.log('LAUNCH_FAIL');
  const execLine = message.split('\n').find((line) => line.includes('Executable'));
  console.log(execLine || message.slice(0, 300));
}
