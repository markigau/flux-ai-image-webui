import { NextResponse } from "next/server";

// 1. 配置 Nano Banana 的 API 地址和 Key
const NB_HOST = process.env.NB_API_HOST || "https://api.nbpro.org"; // 你的 Host
const NB_KEY = process.env.NB_API_KEY;

export const maxDuration = 60; // 开启 Vercel Pro 的 60秒超时支持

export async function POST(req: Request) {
  if (!NB_KEY) {
    return NextResponse.json({ error: "Missing NB_API_KEY" }, { status: 500 });
  }

  const { prompt, aspect_ratio } = await req.json();

  // 2. 第一步：提交绘画任务
  const startResponse = await fetch(`${NB_HOST}/v1/draw/nano-banana`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${NB_KEY}` // 假设是 Bearer 认证
    },
    body: JSON.stringify({
      model: "nano-banana-pro", // 使用 Pro 模型以获得更好画质
      prompt: prompt,
      aspectRatio: aspect_ratio || "1:1", // 适配前端传来的比例
      imageSize: "1K", // 默认 1K，避免生成太慢超时
      webHook: "-1",   // 关键参数：-1 代表不使用回调，直接拿 ID 自己查
      shutProgress: true // 关闭进度流，减少数据量
    }),
  });

  const startData = await startResponse.json();

  // 检查是否成功拿到了任务 ID
  if (!startData.data || !startData.data.id) {
    console.error("Task Start Failed:", startData);
    return NextResponse.json({ error: "Failed to start task", details: startData }, { status: 500 });
  }

  const taskId = startData.data.id;
  console.log(`Task Started: ${taskId}`);

  // 3. 第二步：轮询查结果 (Polling)
  // 因为是异步的，我们要写一个循环，每隔 2 秒去问一次“好了没”
  let finalImageUrl = null;
  let attempts = 0;
  const maxAttempts = 25; // 最多查 25 次 (约 50秒)，防止死循环

  while (attempts < maxAttempts) {
    attempts++;
    
    // 等待 2 秒
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // 查询结果接口 /v1/draw/result
    // 注意：文档没写查询是用 GET 还是 POST，通常带 body 的是 POST，此处假设为 POST 并传 id
    const checkResponse = await fetch(`${NB_HOST}/v1/draw/result`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${NB_KEY}`
      },
      body: JSON.stringify({ id: taskId }), // 传 ID 查询
    });

    const checkData = await checkResponse.json();
    
    // 根据文档：status "succeeded" 代表成功
    if (checkData.status === "succeeded") {
      // 拿到图片链接！
      // 文档示例: results: [{"url": "...", "content": "..."}]
      if (checkData.results && checkData.results.length > 0) {
        finalImageUrl = checkData.results[0].url;
        break; // 跳出循环
      }
    } else if (checkData.status === "failed") {
      return NextResponse.json({ error: "Image generation failed", reason: checkData.failure_reason }, { status: 500 });
    }

    // 如果是 "running"，就继续循环等待...
  }

  if (finalImageUrl) {
    // 4. 成功！返回图片给前端
    // flux-ai-image-webui 期望返回直接的 url 或者数组
    return NextResponse.json([finalImageUrl]); 
  } else {
    return NextResponse.json({ error: "Timeout: Generation took too long" }, { status: 504 });
  }
}
