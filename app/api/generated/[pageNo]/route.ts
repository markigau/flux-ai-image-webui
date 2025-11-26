import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { prompt } = await req.json();

  
  const apiKey = process.env.NB_API_KEY; 
  const baseUrl = process.env.NB_BASE_URL || "https://api.nbpro.org/v1"; 

  if (!apiKey) {
    return NextResponse.json({ error: "API Key missing" }, { status: 500 });
  }

  try {
    // 伪装成 OpenAI DALL-E 3 请求
    const response = await fetch(`${baseUrl}/images/generations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "dall-e-3", // 这里如果你知道 NB 的 Gemini 模型ID，可以改成 "imagen-3"
        prompt: prompt,
        n: 1,
        size: "1024x1024", 
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("API Error:", data);
      throw new Error(data.error?.message || "Failed to generate image");
    }

    // 只要 API 返回的是标准 OpenAI 格式，这里就能跑通
    return NextResponse.json(data.data[0].url); 

  } catch (error) {
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }
}
