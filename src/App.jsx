import React, { useState, useRef } from "react";

// --- Gemini API Configuration for Cloud Fallback ---
// ⚠️ ACTION REQUIRED: Replace "YOUR_GEMINI_API_KEY_HERE" with the actual key you generated.
const API_KEY = "YOUR_GEMINI_API_KEY_HERE"; 
// The API URL now correctly includes the key as a query parameter.
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${API_KEY}`;
const MAX_RETRIES = 3; 

export default function App() {
  // States
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState(""); // Original voice transcription
  const [correctedEnglish, setCorrectedEnglish] = useState(""); // Grammar/phrasing corrected English
  const [translation, setTranslation] = useState(""); // Final translated text
  const [alternatives, setAlternatives] = useState([]); // Array of alternative phrasings
  const [culturalNotes, setCulturalNotes] = useState(""); // Tone and cultural insights
  const [language, setLanguage] = useState("es");
  const [message, setMessage] = useState("");

  // Refs
  const recognitionRef = useRef(null);
  const finalTranscriptRef = useRef("");

  // 🔹 Start or Stop Recording
  const toggleRecording = () => {
    if (recording) {
      // Stop recording: This triggers the 'onend' event.
      recognitionRef.current?.stop();
      setRecording(false);
    } else {
      // Start recording
      startRecording();
    }
  };

  // 🔹 Initialize Web Speech API (Used for Transcription)
  const startRecording = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.error("Speech Recognition not supported on this browser.");
      setMessage("Error: Speech Recognition not supported.");
      return;
    }

    // Reset states for a new recording
    setTranscript("");
    setCorrectedEnglish("");
    setTranslation("");
    setAlternatives([]);
    setCulturalNotes("");
    setMessage("Listening...");
    finalTranscriptRef.current = ""; // Clear the ref
    
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = false; 
    recognition.interimResults = false;
    recognitionRef.current = recognition;

    setRecording(true);

    // --- Event Handlers ---

    // 1. Result received: Fires when a final piece of text is recognized.
    recognition.onresult = (event) => {
      // Get the final transcript.
      const text = event.results[event.results.length - 1][0].transcript;
      finalTranscriptRef.current = text;
      setTranscript(text);
      console.log("Recognized (onresult):", text);
    };

    // 2. Error occurred: e.g., no speech detected, permission denied.
    recognition.onerror = (event) => {
      console.warn("Speech recognition error:", event.error);
      setMessage(`Error: ${event.error}. Try again.`);
      setRecording(false);
    };

    // 3. Recording ended: Fires after a timeout, or after 'stop()' is called.
    recognition.onend = async () => {
      console.log("Speech recognition ended. Final transcript check.");
      setRecording(false);
      setMessage("Processing...");
      
      const text = finalTranscriptRef.current;
      
      if (text) {
        // Only process if we have a valid transcript captured
        await processText(text);
      } else {
        setMessage("No speech detected or valid result captured.");
        setTranscript("[No transcription available]");
      }
    };

    recognition.start();
  };

  // 🔹 Process Text with Gemini API (Structured Correction, Tone, and Translation)
  const processText = async (text) => {
    // Basic check to remind the user to set the key
    if (API_KEY === "YOUR_GEMINI_API_KEY_HERE" || !API_KEY) {
        setMessage("Error: Please set your Gemini API Key in App.jsx.");
        setTranslation("[API Key Missing]");
        console.error("API Key Missing: Please update the API_KEY constant in App.jsx.");
        return;
    }
    
    setMessage("AI Processing (Structured Gemini API call)...");

    const prompt = `
      The user spoke the following English text: "${text}".
      Perform the following tasks and return the result as a single JSON object:
      1. Correct the grammar and natural flow of the English text (Proofreader/Rewriter).
      2. Provide two short, alternative English phrasings for the corrected text.
      3. Provide a short, actionable note on the tone or cultural context of the corrected phrase (max 3 sentences).
      4. Translate the corrected English text into the target language: ${language}.
    `;

    const payload = {
        contents: [{ parts: [{ text: prompt }] }],
        systemInstruction: {
            parts: [{ text: "You are an expert polyglot assistant. You must respond ONLY with a valid JSON object matching the provided schema." }]
        },
        generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
                type: "OBJECT",
                properties: {
                    corrected_english: { 
                        type: "STRING", 
                        description: "Grammatically corrected and naturally flowing version of the original English text." 
                    },
                    alternative_phrasings: {
                        type: "ARRAY",
                        description: "Two alternative ways to phrase the corrected English text.",
                        items: { type: "STRING" }
                    },
                    tone_and_cultural_notes: {
                        type: "STRING",
                        description: "Short (max 3 sentences) actionable tip about the tone or cultural context of the corrected English phrase."
                    },
                    translated_text: {
                        type: "STRING",
                        description: `The final translation of the corrected English text into the target language: ${languageNames[language]}.`
                    }
                },
                required: ["corrected_english", "alternative_phrasings", "tone_and_cultural_notes", "translated_text"],
                propertyOrdering: ["corrected_english", "alternative_phrasings", "tone_and_cultural_notes", "translated_text"]
            }
        }
    };

    let attempt = 0;
    while (attempt < MAX_RETRIES) {
        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            const jsonText = result.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

            if (jsonText) {
                // Parse the structured JSON response
                const parsedData = JSON.parse(jsonText);
                
                setCorrectedEnglish(parsedData.corrected_english || "Error: Missing corrected text.");
                setAlternatives(parsedData.alternative_phrasings || []);
                setCulturalNotes(parsedData.tone_and_cultural_notes || "Error: Missing notes.");
                setTranslation(parsedData.translated_text || "Error: Missing translation.");
                setMessage("Analysis and Translation complete.");
                return; // Success
            } else {
                throw new Error("API response was empty or malformed.");
            }

        } catch (error) {
            attempt++;
            console.error(`Attempt ${attempt} failed:`, error);
            if (attempt >= MAX_RETRIES) {
                setTranslation("[AI Error]");
                setMessage("AI Processing failed after multiple retries. Check console.");
                return; // Exit after max retries
            }
            // Exponential backoff
            const delay = Math.pow(2, attempt) * 1000 + Math.random() * 500;
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
  };

  // 🔹 Speak the final translated output
  const playAudio = () => {
    if (translation) {
      const utterance = new SpeechSynthesisUtterance(translation);
      utterance.lang = language;
      window.speechSynthesis.speak(utterance);
    }
  };

  // Utility to map language codes to display names for accessibility/readability
  const languageNames = {
    es: 'Spanish', fr: 'French', de: 'German', hi: 'Hindi', ja: 'Japanese', ko: 'Korean'
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4 font-sans">
      <div className="bg-white shadow-2xl border border-gray-100 rounded-3xl p-8 w-full max-w-lg text-center transform transition-shadow duration-300 ease-out">
        <h1 className="text-2xl font-extrabold text-gray-800 mb-6 border-b pb-2">
          Polyglot AI Translator
        </h1>
        
        {/* 🎙️ Record / Stop Button */}
        <button
          onClick={toggleRecording}
          disabled={message.includes("Error") && !recording}
          className={`w-32 h-32 rounded-full text-white text-xl font-extrabold shadow-lg mb-6 transition-all duration-300 ease-in-out flex items-center justify-center mx-auto focus:outline-none focus:ring-4 ${
            recording
              ? "bg-red-500 hover:bg-red-600 ring-red-300 animate-pulse"
              : "bg-indigo-600 hover:bg-indigo-700 ring-indigo-300"
          }`}
        >
          <svg className="w-6 h-6 mr-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4z" clipRule="evenodd"></path>
            <path fillRule="evenodd" d="M3 8a7 7 0 0114 0c0 3.86-1.55 7.025-4.708 9.387A6.997 6.997 0 0110 19c-3.86 0-7-3.14-7-7v1h2v-1a5 5 0 0010 0V8a5 5 0 00-10 0v2H3V8zm9 10a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"></path>
          </svg>
          {recording ? "Stop" : "Record"}
        </button>
        
        {/* Status Message */}
        <p className={`mb-4 text-sm font-medium h-5 ${message.includes("Error") ? 'text-red-500' : message.includes("Processing") ? 'text-amber-600' : 'text-indigo-600'}`}>
          {message || (recording ? "Recording..." : "Ready to record.")}
        </p>

        {/* 🌍 Language Dropdown */}
        <div className="mb-6 flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-200">
          <label className="font-semibold text-gray-700">Translate to:</label>
          <select
            value={language}
            onChange={(e) => {
                setLanguage(e.target.value);
                setTranslation(""); // Clear old results
                setCorrectedEnglish("");
                setAlternatives([]);
                setCulturalNotes("");
                setMessage(`Language set to ${languageNames[e.target.value]}. Please record again.`);
            }}
            className="border border-indigo-300 rounded-md px-3 py-1 text-gray-800 focus:ring-indigo-500 focus:border-indigo-500 transition shadow-sm bg-white"
            disabled={recording}
          >
            {Object.entries(languageNames).map(([code, name]) => (
                <option key={code} value={code}>{name}</option>
            ))}
          </select>
        </div>

        {/* ✍️ Transcription Box (Original) */}
        <div className="text-left bg-white border border-gray-300 rounded-xl p-4 mb-4 shadow-sm">
          <p className="font-bold text-gray-800 mb-1">1. Source Transcription (English):</p>
          <p className="text-gray-600 text-sm italic min-h-[50px] overflow-auto">
            {transcript || "[waiting for transcription...]"}
          </p>
        </div>
        
        {/* ✏️ Grammar & Correction Box */}
        <div className="text-left bg-green-50 border border-green-300 rounded-xl p-4 mb-4 shadow-lg">
            <p className="font-bold text-green-800 mb-1">2. Corrected English (Proofreading):</p>
            <p className="text-gray-700 text-sm mb-3 min-h-[50px] overflow-auto">
              {correctedEnglish || "[AI corrected text will appear here]"}
            </p>

            {/* Alternative Phrasing */}
            {alternatives.length > 0 && (
                <div className="mt-3 pt-3 border-t border-green-200">
                    <p className="font-bold text-green-800 mb-1 text-xs uppercase">Alternative Phrasing (Rewrite):</p>
                    <ul className="list-disc list-inside text-gray-700 text-xs space-y-1">
                        {alternatives.map((alt, index) => (
                            <li key={index}>{alt}</li>
                        ))}
                    </ul>
                </div>
            )}
        </div>

        {/* 🎭 Tone & Cultural Insights */}
        <div className="text-left bg-yellow-50 border border-yellow-300 rounded-xl p-4 mb-4 shadow-lg">
            <p className="font-bold text-yellow-800 mb-1">3. Tone & Cultural Insight:</p>
            <p className="text-gray-700 text-sm min-h-[50px] overflow-auto">
              {culturalNotes || "[Tone and cultural notes will appear here]"}
            </p>
        </div>


        {/* 💬 Final Translation Box */}
        <div className="text-left bg-indigo-50 border border-indigo-300 rounded-xl p-4 shadow-lg">
          <p className="font-bold text-indigo-800 mb-1">4. Final AI Translation ({languageNames[language]}):</p>
          <p className="text-gray-700 text-sm mb-3 min-h-[50px] overflow-auto">
            {translation || "[Translation will appear here]"}
          </p>
          <button
            onClick={playAudio}
            disabled={!translation}
            className="w-full bg-indigo-600 text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md flex items-center justify-center"
          >
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path d="M18 5v8a2 2 0 01-2 2h-2.586l-2.707 2.707A1 1 0 019 17v-2H5a2 2 0 01-2-2V5a2 2 0 012-2h10a2 2 0 012 2zM9 10H5v2h4v-2zm4-4h-4v2h4V6z"></path>
            </svg>
            <span>Play Translation</span>
          </button>
        </div>
      </div>
    </div>
  );
}
