
/**
 * Google AI (Gemini) Service
 * Unified interface for various Gemini models
 */

export const GOOGLE_MODELS = [
  { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro (New)', provider: 'Google', group: 'High Performance' },
  { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash (New)', provider: 'Google', group: 'Balanced' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', provider: 'Google', group: 'Standard' },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'Google', group: 'Cost-Effective' },
  { id: 'gemini-2.5-flash-image', name: 'Gemini 2.5 Flash Image (Text Eraser)', provider: 'Google', group: 'Specialized' },
];

export interface AIResponse {
  image?: string;
  text?: string;
}

export async function validateGoogleKey(apiKey: string): Promise<{ valid: boolean; message: string }> {
  if (!apiKey) return { valid: false, message: '키 입력 필요' };
  
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    );
    if (res.ok) return { valid: true, message: '사용 가능' };
    if (res.status === 400 || res.status === 403) return { valid: false, message: '유효하지 않은 키' };
    return { valid: false, message: `오류: ${res.status}` };
  } catch (e: any) {
    return { valid: false, message: e.message || '검증 실패' };
  }
}

/**
 * 이미지 내의 텍스트를 제거하거나 지시사항을 반영하여 이미지를 처리합니다.
 */
export async function executeGeminiTask(
  apiKey: string,
  modelId: string,
  base64Image: string, 
  maskBase64?: string, 
  customInstruction?: string
): Promise<string> {
  
  const coreInstructions = `
    [PRIMARY OBJECTIVE: ERASE ALL TEXT]
    - Remove EVERY single piece of text, letters, characters, and numbers from the image.
    - The output image must have ZERO text. No Korean, no English, no numbers.
    - Fill the erased text areas with the surrounding background color.

    [SECONDARY OBJECTIVE: PRESERVE GRAPHICS]
    - KEEP ALL icons, illustrations, and characters.
    - KEEP ALL photographs inside circular or rectangular frames.
    - KEEP the layout elements like bubbles, lines, and boxes.
  `;

  const contentsParts: any[] = [
    {
      inlineData: {
        data: base64Image.split(',')[1],
        mimeType: 'image/png'
      }
    }
  ];

  let finalPrompt = "";

  if (maskBase64) {
    contentsParts.push({
      inlineData: {
        data: maskBase64.split(',')[1],
        mimeType: 'image/png'
      }
    });
    finalPrompt = `
      The first image is the original. The second image is a red mask indicating areas of interest.
      
      TASK:
      1. Prioritize erasing text in the red masked areas.
      2. If the user provided specific instructions below, follow them strictly.
      3. Do not damage icons or background photos.
      ${customInstruction ? `\n[USER CUSTOM INSTRUCTION]: ${customInstruction}\n` : ""}
      ${coreInstructions}
    `;
  } else {
    finalPrompt = `
      Analyze the provided image and erase ALL text. 
      Create a clean template while preserving every non-text element.
      ${customInstruction ? `\n[USER CUSTOM INSTRUCTION]: ${customInstruction}\n` : ""}
      ${coreInstructions}
    `;
  }

  contentsParts.push({ text: finalPrompt });

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            role: 'user',
            parts: contentsParts
          }]
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Google AI API 오류가 발생했습니다.');
    }

    const data = await response.json();
    
    let imageResult: string | null = null;
    let textResult: string = "";

    if (data.candidates && data.candidates[0].content && data.candidates[0].content.parts) {
      for (const part of data.candidates[0].content.parts) {
        if (part.inlineData) {
          imageResult = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        } else if (part.text) {
          textResult += part.text;
        }
      }
    }

    if (imageResult) {
      return imageResult;
    }
    
    if (textResult) {
      // 이미지 편집 모델이 아닌 경우 텍스트 응답이 올 수 있음
      // 여기서는 텍스트 제거가 목적이므로 이미지가 없으면 오류로 처리하거나
      // 특정 모델은 텍스트 결과만 줄 수 있음을 알림
      throw new Error(`AI 응답 (이미지 생성 실패): ${textResult}`);
    }
    
    throw new Error("AI가 이미지 생성에 실패했습니다. 선택한 모델이 이미지 출력을 지원하는지 확인하세요.");
  } catch (error: any) {
    console.error("Gemini Task Error:", error);
    throw error;
  }
}
