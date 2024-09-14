import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    const response = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        Authorization: `Token ${process.env.REPLICATE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        version: "dee76b5afde21b0f01ed7925f0665b7e879c50ee718c5f78a9d38e04d523cc5e",
        input: { prompt: "Generate a TOK emoji of a " + prompt, apply_watermark: false },
      }),
    });

    if (!response.ok) {
      throw new Error(`Replicate API error: ${response.status} ${response.statusText}`);
    }

    let prediction = await response.json();
    let retries = 0;
    const maxRetries = 30; // 30 seconds timeout

    while (prediction.status !== "succeeded" && prediction.status !== "failed" && retries < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const statusResponse = await fetch(
        `https://api.replicate.com/v1/predictions/${prediction.id}`,
        {
          headers: {
            Authorization: `Token ${process.env.REPLICATE_API_TOKEN}`,
            "Content-Type": "application/json",
          },
        }
      );
      prediction = await statusResponse.json();
      retries++;
    }

    if (prediction.status === "failed" || retries >= maxRetries) {
      throw new Error("Prediction failed or timed out");
    }

    console.log("API response:", prediction);  

    return NextResponse.json({ url: prediction.output[0] });
  } catch (error) {
    console.error("API route error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to generate emoji" }, { status: 500 });
  }
}
