import { NextResponse } from "next/server";

const NB_HOST = process.env.NB_API_HOST || "https://api.nbpro.org";
const NB_KEY = process.env.NB_API_KEY;

export async function POST(req: Request) {
  if (!NB_KEY) return NextResponse.json({ error: "No API Key" }, { status: 500 });

  const body = await req.json();
  const { action, prompt, taskId } = body;

  // 模式 1: 提交新任务 (Start)
  if (action === "start") {
    const startRes = await fetch(`${NB_HOST}/v1/draw/nano-banana`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        Authorization: `Bearer ${NB_KEY}` 
      },
      body: JSON.stringify({
        model: "nano-banana-pro",
        prompt: prompt,
        webHook: "-1",
        shutProgress: true
      }),
    });
    const startData = await startRes.json();
    // 把 NB 返回的 ID 直接扔给前端
    return NextResponse.json(startData);
  }

  // 模式 2: 查询任务状态 (Check)
  if (action === "check" && taskId) {
    const checkRes = await fetch(`${NB_HOST}/v1/draw/result`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        Authorization: `Bearer ${NB_KEY}` 
      },
      body: JSON.stringify({ id: taskId }),
    });
    const checkData = await checkRes.json();
    // 把 NB 返回的状态直接扔给前端
    return NextResponse.json(checkData);
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
