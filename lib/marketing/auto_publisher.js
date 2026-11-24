const crypto = require("crypto");

function makeAppSecretProof(token, appSecret) {
  if (!appSecret) return undefined;
  return crypto
    .createHmac("sha256", appSecret)
    .update(token)
    .digest("hex");
}

function getConfiguredPages() {
  const pages = [];

  if (process.env.FB_PAGE_1_ID && process.env.FB_PAGE_1_TOKEN) {
    pages.push({
      name: process.env.FB_PAGE_1_NAME || "Page 1",
      pageId: process.env.FB_PAGE_1_ID,
      token: process.env.FB_PAGE_1_TOKEN,
    });
  }

  if (process.env.FB_PAGE_2_ID && process.env.FB_PAGE_2_TOKEN) {
    pages.push({
      name: process.env.FB_PAGE_2_NAME || "Page 2",
      pageId: process.env.FB_PAGE_2_ID,
      token: process.env.FB_PAGE_2_TOKEN,
    });
  }

  return pages;
}

/**
 * ينشر منشوراً نصياً أو رابطاً على صفحة واحدة أو أكثر
 * @param {Object} options
 * @param {string} options.message - نص المنشور
 * @param {string} [options.link] - رابط اختياري
 * @param {string[]} [options.targetPageIds] - مصفوفة بـ Page IDs محددة (لو تُركت فارغة ينشر لكل الصفحات المهيأة)
 */
async function publishToPages({ message, link, targetPageIds } = {}) {
  if (!message || !message.trim()) {
    throw new Error("نص المنشور (message) مطلوب.");
  }

  const version = process.env.FB_GRAPH_VERSION || "v27.0";
  const appSecret = (process.env.FB_APP_SECRET || "").trim();
  let pages = getConfiguredPages();

  if (Array.isArray(targetPageIds) && targetPageIds.length > 0) {
    pages = pages.filter((p) => targetPageIds.includes(p.pageId));
  }

  if (pages.length === 0) {
    throw new Error("لا توجد صفحات مهيأة في متغيرات البيئة.");
  }

  const results = [];

  for (const page of pages) {
    const endpoint = `https://graph.facebook.com/${version}/${page.pageId}/feed`;
    const body = new URLSearchParams({
      message: message.trim(),
      access_token: page.token,
    });

    if (link && link.trim()) {
      body.append("link", link.trim());
    }

    const proof = makeAppSecretProof(page.token, appSecret);
    if (proof) {
      body.append("appsecret_proof", proof);
    }

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });
      const data = await response.json();

      if (!response.ok || data.error) {
        results.push({
          pageName: page.name,
          pageId: page.pageId,
          ok: false,
          error: data.error || data,
        });
      } else {
        results.push({
          pageName: page.name,
          pageId: page.pageId,
          ok: true,
          postId: data.id,
        });
      }
    } catch (err) {
      results.push({
        pageName: page.name,
        pageId: page.pageId,
        ok: false,
        error: err.message,
      });
    }
  }

  return results;
}

// اختبار سريع عند تشغيل الملف مباشرة: node lib/marketing/auto_publisher.js
if (require.main === module) {
  try {
    if (typeof process.loadEnvFile === "function") {
      process.loadEnvFile();
    }
  } catch (e) {
    // env file optional
  }
  publishToPages({
    message: "منشور تجريبي تلقائي من نظام Zomoroda_AI1_System ✨",
    // link: "https://example.com"
  })
    .then((res) => console.log(JSON.stringify(res, null, 2)))
    .catch((err) => console.error("❌ خطأ:", err.message));
}

module.exports = { publishToPages, getConfiguredPages };
