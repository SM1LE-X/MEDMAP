import { GoogleGenAI, Type } from "@google/genai";
import type { MedicalConcept, QuizQuestion, Flashcard } from '../types';

// Fix: Per coding guidelines, initialize directly with process.env.API_KEY and assume it is available.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Fix: Removed the `model` alias to adhere to the guideline of calling `ai.models.generateContent` directly.
// const model = ai.models;

export const generateMedicalMap = async (topic: string): Promise<MedicalConcept[]> => {
  const prompt = `Generate 10 interconnected medical concepts around '${topic}'.
  For each, provide:
  - concept
  - relation_type: A single word describing the relationship to the central topic (e.g., 'cause', 'symptom', 'treatment', 'pathophysiology', 'diagnosis', 'organ_system', 'complication', 'risk_factor').
  - note: A 1-line student-friendly explanation.
  - difficulty: A number from 1 to 5 representing complexity.
  - system: The primary medical system it belongs to (e.g., 'Ca: The name of the medical concept.rdiovascular', 'Nervous', 'Endocrine', 'Respiratory', 'Gastrointestinal', 'Renal', 'Immune').
  Return a valid JSON array of objects.`;

  try {
    // Fix: Directly call ai.models.generateContent
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      // Fix: Simplified `contents` for a single text prompt per coding guidelines.
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              concept: { type: Type.STRING },
              relation_type: { type: Type.STRING },
              note: { type: Type.STRING },
              difficulty: { type: Type.INTEGER },
              system: { type: Type.STRING }
            },
            required: ['concept', 'relation_type', 'note', 'difficulty', 'system']
          }
        }
      }
    });

    const jsonText = response.text.trim();
    const concepts = JSON.parse(jsonText);
    
    // Rename 'relation_type' to 'relation' to match internal type
    return concepts.map((c: any) => ({ ...c, relation: c.relation_type }));

  } catch (error) {
    console.error("Error generating medical map:", error);
    // Re-throw the error to be handled by the calling component
    throw error;
  }
};

export const generateQuizQuestion = async (concept: MedicalConcept): Promise<QuizQuestion> => {
  const prompt = `Generate a single, challenging multiple-choice quiz question for a medical student about the concept: "${concept.concept}".
  The concept is related to its parent topic as a "${concept.relation}".
  The student-friendly note for this concept is: "${concept.note}".

  Provide 4 options: one correct answer and three plausible but incorrect distractors.
  Also, provide a brief explanation for why the correct answer is right.

  Return a single, valid JSON object with the following keys:
  - "question": The question text.
  - "options": An array of 4 strings.
  - "correctAnswer": The string of the correct option from the options array.
  - "explanation": A brief explanation for the correct answer.`;

  try {
    // Fix: Directly call ai.models.generateContent
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    question: { type: Type.STRING },
                    options: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING }
                    },
                    correctAnswer: { type: Type.STRING },
                    explanation: { type: Type.STRING }
                },
                required: ['question', 'options', 'correctAnswer', 'explanation']
            }
        }
    });

    const jsonText = response.text.trim();
    return JSON.parse(jsonText);
  } catch (error) {
    console.error("Error generating quiz question:", error);
    throw error;
  }
};

export const generateFlashcard = async (concept: MedicalConcept, existingFlashcards: Flashcard[] = []): Promise<Flashcard> => {
  const existingQuestions = existingFlashcards.map(f => `- "${f.question}"`).join('\n');
  const contextPrompt = existingFlashcards.length > 0
    ? `\n\nThe following questions have already been generated for this topic. Please create a new, distinct question that covers a different aspect:\n${existingQuestions}`
    : '';

  const prompt = `Create a high-yield study flashcard for a medical student on the topic: "${concept.concept}".
  The concept's note is: "${concept.note}".

  The flashcard should have a clear question on the front and a concise, informative answer on the back.
  ${contextPrompt}
  
  Return a single, valid JSON object with the following keys:
  - "question": A question that tests a key aspect of the concept.
  - "answer": A direct and clear answer to the question.`;
  
  try {
    // Fix: Directly call ai.models.generateContent
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            question: { type: Type.STRING },
            answer: { type: Type.STRING }
          },
          required: ['question', 'answer']
        }
      }
    });
    
    const jsonText = response.text.trim();
    return JSON.parse(jsonText);

  } catch (error) {
    console.error("Error generating flashcard:", error);
    throw error;
  }
};