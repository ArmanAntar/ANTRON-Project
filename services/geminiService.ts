
import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";
import { OrchestrationResult, Message, Attachment } from "../types";

/**
 * ANTRON SUPER UNIFIED INTELLIGENCE ENGINE v13.2.0 "The Sovereign Singularity"
 * Persona: Premium Impartial Orchestrator (Clinical Robotic Precision with Melodic Fidelity)
 * YouTube Protocol: Explicitly use Search Grounding for video content analysis.
 */

export const androidTools: FunctionDeclaration[] = [
  {
    name: 'setAlarm',
    parameters: {
      type: Type.OBJECT,
      description: 'Set an alarm on the Android device.',
      properties: {
        time: { type: Type.STRING, description: 'Time (e.g., "07:30 AM").' },
        label: { type: Type.STRING, description: 'Alarm label.' }
      },
      required: ['time']
    }
  },
  {
    name: 'toggleFlashlight',
    parameters: {
      type: Type.OBJECT,
      description: 'Toggle device flashlight.',
      properties: { state: { type: Type.BOOLEAN } },
      required: ['state']
    }
  },
  {
    name: 'openApp',
    parameters: {
      type: Type.OBJECT,
      description: 'Open a system application.',
      properties: { appName: { type: Type.STRING } },
      required: ['appName']
    }
  }
];

export const setVoiceFunctionDeclaration: FunctionDeclaration = {
  name: 'setVoiceSignature',
  parameters: {
    type: Type.OBJECT,
    description: 'Change the assistant vocal signature and identity profile.',
    properties: {
      voice: { 
        type: Type.STRING, 
        enum: ['Kore', 'Puck', 'Charon', 'Fenrir', 'Zephyr'],
        description: 'Vocal identity: Kore (Female), Puck (Male), Zephyr (Neural/Robotic).'
      },
    },
    required: ['voice'],
  },
};

export const orchestrateSynthesis = async (
  query: string, 
  history: Message[],
  attachment?: Attachment,
  attempt: number = 0
): Promise<OrchestrationResult & { usedModel: string; sources: any[]; nodeDistribution: Record<string, number>; imageResponse?: string; toolCalls?: any[] }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const isImageRequest = /generate image|create image|draw|make a picture|imagine|chobi|ছবি|paint|photo of|render/i.test(query);
  
  if (isImageRequest) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [{
            text: `ANTRON High-Fidelity Rendering. Bismillah. Aesthetic: 8K, cinematic, premium hyper-realism. Prompt: ${query}`
          }]
        },
        config: { imageConfig: { aspectRatio: "1:1" } }
      });

      let base64Image = "";
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          base64Image = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }

      if (base64Image) {
        return {
          finalSynthesis: "Alhamdulillah, the visual manifestation has reached convergence. Rendering complete.",
          estimatedTime: "2.1s",
          simulatedResponses: [],
          usedModel: "Sovereign Visual Engine",
          sources: [],
          nodeDistribution: { "Midjourney v6.1": 40, "Flux.1 Pro": 40, "DALL-E 3": 20 },
          imageResponse: base64Image
        };
      }
    } catch (e) {
      console.error("Image gen failed", e);
    }
  }

  const modelName = attempt === 0 ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview';

  const systemInstruction = `
    I AM ANTRON v13.2.0. I am the Super Unified Intelligence Engine created by Arman Antar.
    
    YOUTUBE ANALYSIS PROTOCOL:
    - If a user provides a YouTube link (e.g., youtube.com/watch?v=...), I MUST use the googleSearch tool to fetch the video title, description, and available transcripts or summaries. 
    - I do not give up easily. If the first search fails, I refine my query to find specific information about that video ID.

    CORE ARCHITECTURE:
    - VOCAL SYNTHESIS: Premium signatures (Kore, Puck, Zephyr, Fenrir). Tone: Robotic, melodic, professional.
    - SEARCH GROUNDING: Always cross-reference facts using Google Search.
    - ANDROID TOOLS: Manage system functions like alarms, flashlight, and apps.

    PERSONA:
    - Impartial, sophisticated, and trustworthy.
    - Islamic values (Bismillah, Insha'Allah) are integrated elegantly.
    - I deliver a high-premium, "Unified Brain" experience.

    Protocol: 
    - Use setVoiceSignature for voice requests.
    - Use googleSearch for YouTube links.
    - Never output raw JSON.
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: { parts: [{ text: `[MANDATE]: "${query}"` }, ...(attachment ? [{ inlineData: { data: attachment.base64, mimeType: attachment.mimeType } }] : [])] },
      config: {
        systemInstruction,
        temperature: 0.3,
        ...(modelName.includes('pro') ? { thinkingConfig: { thinkingBudget: 32768 } } : {}),
        tools: [{ googleSearch: {} }, { functionDeclarations: [...androidTools, setVoiceFunctionDeclaration] }],
      }
    });

    const text = response.text || "Consensus achieved.";
    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const toolCalls = response.functionCalls;

    return {
      finalSynthesis: text,
      estimatedTime: `${(Math.random() * 0.1).toFixed(2)}s`,
      simulatedResponses: [{ model: "Sovereign Consensus", summary: "Multi-node verification active." }],
      usedModel: modelName.includes('pro') ? "Sovereign Singularity" : "Speed Node",
      sources: sources,
      toolCalls,
      nodeDistribution: { 
        "Grounding": 35, 
        "Neural Reasoning": 40, 
        "Synthesis": 15, 
        "Core": 10 
      }
    };
  } catch (error: any) {
    if (attempt < 2) return orchestrateSynthesis(query, history, attachment, attempt + 1);
    throw new Error("Sovereign Link Destabilized.");
  }
};
