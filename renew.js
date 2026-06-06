const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  // 确保截图保存目录存在
  const screenshotDir = path.join(__dirname, 'screenshots');
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir);
  }

  // 启动无头浏览器并伪装 User-Agent
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();

  try {
    console.log('🚀 正在打开 Freemchost 登录页面...');
    // 使用新版通用域名，如果未来官方换回主域名也可在此处调整
    await page.goto('https://new.freemchost.com/', { waitUntil: 'networkidle', timeout: 60000 }); 

    // 1. 智能识别输入框并填写（支持账号密码环境变量保护）
    console.log('📝 正在输入凭证...');
    // 等待输入框出现，最多等 10 秒
    await page.waitForSelector('input[type="email"], input[placeholder*="Email"], input[placeholder*="邮箱"]', { timeout: 10000 });
    await page.locator('input[type="email"], input[placeholder*="Email"], input[placeholder*="邮箱"]').fill(process.env.FREE_EMAIL);
    await page.locator('input[type="password"], input[placeholder*="Password"], input[placeholder*="密码"]').fill(process.env.FREE_PASSWORD);
    
    // 2. 模拟点击登录按钮
    console.log('🔐 正在尝试登录...');
    await page.locator('button[type="submit"], button:has-text("Login"), button:has-text("登录")').click();
    
    // 等待登录成功并加载完毕
    await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 });
    console.log('✅ 登录成功！');

    // 3. 直接跳转到你的服务器具体管理面板页面
    console.log('📂 正在直达服务器控制台...');
    await page.goto(process.env.SERVER_PAGE_URL, { waitUntil: 'networkidle', timeout: 30000 });

    // 4. 核心：通过文字识别锁定红色的 [Renew now] 按钮
    console.log('🔍 正在寻觅 [Renew now] 按钮...');
    const renewBtn = page.locator('button:has-text("Renew now"), div:has-text("Renew now"), [class*="button"]:has-text("Renew")').last();
    
    // 设置一个小超时来检查按钮是否存在，避免死等
    await renewBtn.waitFor({ state: 'visible', timeout: 10000 });
    
    if (await renewBtn.isVisible()) {
      // 模拟真人点击
      await renewBtn.click();
      console.log('🎉 【成功】已成功触发点击续期按钮！');
      // 留出 5 秒等待后端 Server Function 异步响应完成
      await page.waitForTimeout(5000);
    } else {
      console.log('⚠️ 未找到续期按钮，可能当前无需续期，或页面结构发生了颠覆性改变。');
    }

  } catch (error) {
    console.error('❌ 自动化执行期间发生异常:', error.message);
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const screenshotPath = path.join(screenshotDir, `error-${timestamp}.png`);
    
    try {
      // 拍下案发现场
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`📸 现场截图已保存至: ${screenshotPath}`);
    } catch (screenshotError) {
      console.error('❌ 截图保存失败:', screenshotError.message);
    }
    
    process.exit(1);
  } finally {
    await browser.close();
    console.log('🏁 浏览器已关闭，任务结束。');
  }
})();
