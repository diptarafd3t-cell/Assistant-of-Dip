import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Loader2, Upload, Image as ImageIcon, Wand2, Settings2, SlidersHorizontal, AlertCircle, Layers } from 'lucide-react';

declare global {
  interface Window {
    aistudio?: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

const MOCKUPS = [
  {
    id: 'tshirt',
    name: 'T-Shirt',
    image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=1000&auto=format&fit=crop',
    logoStyle: { top: '35%', left: '50%', transform: 'translate(-50%, -50%)', baseWidth: 20 }
  },
  {
    id: 'mug',
    name: 'Coffee Mug',
    image: 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?q=80&w=1000&auto=format&fit=crop',
    logoStyle: { top: '55%', left: '55%', transform: 'translate(-50%, -50%) rotate(-5deg)', baseWidth: 25 }
  },
  {
    id: 'tote',
    name: 'Tote Bag',
    image: 'https://images.unsplash.com/photo-1597348989645-46b190ce4918?q=80&w=1000&auto=format&fit=crop',
    logoStyle: { top: '60%', left: '50%', transform: 'translate(-50%, -50%)', baseWidth: 30 }
  },
  {
    id: 'hoodie',
    name: 'Hoodie',
    image: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?q=80&w=1000&auto=format&fit=crop',
    logoStyle: { top: '40%', left: '50%', transform: 'translate(-50%, -50%)', baseWidth: 18 }
  }
];

export default function App() {
  const [hasKey, setHasKey] = useState<boolean | null>(null);

  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio?.hasSelectedApiKey) {
        const result = await window.aistudio.hasSelectedApiKey();
        setHasKey(result);
      } else {
        setHasKey(true);
      }
    };
    checkKey();
  }, []);

  const handleSelectKey = async () => {
    if (window.aistudio?.openSelectKey) {
      await window.aistudio.openSelectKey();
      setHasKey(true);
    } else {
      setHasKey(true);
    }
  };

  if (hasKey === null) {
    return <div className="min-h-screen flex items-center justify-center bg-zinc-50"><Loader2 className="animate-spin w-8 h-8 text-zinc-500" /></div>;
  }

  if (!hasKey) {
    return (
      <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center border border-zinc-100">
          <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Settings2 className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-zinc-900 mb-4">API Key Required</h1>
          <p className="text-zinc-600 mb-8 leading-relaxed">
            To generate high-quality logos using Nano Banana Pro (gemini-3-pro-image-preview), you need to select a Google Cloud project with billing enabled.
            <br/><br/>
            <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="text-indigo-600 hover:text-indigo-700 font-medium underline underline-offset-4">Learn more about billing</a>
          </p>
          <button
            onClick={handleSelectKey}
            className="w-full bg-zinc-900 hover:bg-zinc-800 text-white font-medium py-3 px-4 rounded-xl transition-colors shadow-sm"
          >
            Select API Key
          </button>
        </div>
      </div>
    );
  }

  return <MainApp />;
}

function MainApp() {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'generate' | 'upload'>('generate');
  
  const [prompt, setPrompt] = useState('A minimalist geometric logo of a fox, flat vector style, white background, simple clean lines');
  const [imageSize, setImageSize] = useState<'1K' | '2K' | '4K'>('1K');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [blendMode, setBlendMode] = useState<'normal' | 'multiply' | 'screen'>('multiply');
  const [logoScale, setLogoScale] = useState(100);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setLogoUrl(url);
    }
  };

  const generateLogo = async () => {
    if (!prompt.trim()) return;
    
    setIsGenerating(true);
    setError(null);
    try {
      // @ts-ignore
      const apiKey = typeof process !== 'undefined' && process.env ? process.env.API_KEY || process.env.GEMINI_API_KEY : '';
      const ai = new GoogleGenAI({ apiKey });

      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: {
          parts: [{ text: prompt }]
        },
        config: {
          imageConfig: {
            aspectRatio: "1:1",
            imageSize: imageSize
          }
        }
      });

      let foundImage = false;
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          const base64 = part.inlineData.data;
          const url = `data:${part.inlineData.mimeType || 'image/png'};base64,${base64}`;
          setLogoUrl(url);
          foundImage = true;
          break;
        }
      }
      
      if (!foundImage) {
        throw new Error("No image was returned by the model.");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to generate image");
      if (err.message?.includes("Requested entity was not found")) {
        if (window.aistudio?.openSelectKey) {
          await window.aistudio.openSelectKey();
        }
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* Header */}
      <header className="bg-white border-b border-zinc-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">Mockup Studio</h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Controls */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden">
              <div className="flex border-b border-zinc-200">
                <button
                  onClick={() => setActiveTab('generate')}
                  className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${activeTab === 'generate' ? 'bg-zinc-50 text-zinc-900 border-b-2 border-zinc-900' : 'text-zinc-500 hover:text-zinc-700 hover:bg-zinc-50'}`}
                >
                  <Wand2 className="w-4 h-4" />
                  AI Generate
                </button>
                <button
                  onClick={() => setActiveTab('upload')}
                  className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${activeTab === 'upload' ? 'bg-zinc-50 text-zinc-900 border-b-2 border-zinc-900' : 'text-zinc-500 hover:text-zinc-700 hover:bg-zinc-50'}`}
                >
                  <Upload className="w-4 h-4" />
                  Upload Logo
                </button>
              </div>

              <div className="p-6">
                {activeTab === 'generate' ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-1">Prompt</label>
                      <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        rows={4}
                        className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent resize-none"
                        placeholder="Describe your logo..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-1">Image Size</label>
                      <select
                        value={imageSize}
                        onChange={(e) => setImageSize(e.target.value as any)}
                        className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent bg-white"
                      >
                        <option value="1K">1K (Standard)</option>
                        <option value="2K">2K (High Res)</option>
                        <option value="4K">4K (Ultra High Res)</option>
                      </select>
                    </div>
                    {error && (
                      <div className="p-3 bg-red-50 text-red-700 rounded-xl text-sm flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                        <p>{error}</p>
                      </div>
                    )}
                    <button
                      onClick={generateLogo}
                      disabled={isGenerating || !prompt.trim()}
                      className="w-full bg-zinc-900 hover:bg-zinc-800 disabled:bg-zinc-300 disabled:cursor-not-allowed text-white font-medium py-2.5 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Wand2 className="w-4 h-4" />
                          Generate Logo
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-zinc-300 rounded-2xl p-8 text-center hover:bg-zinc-50 hover:border-zinc-400 transition-colors cursor-pointer group"
                    >
                      <div className="w-12 h-12 bg-zinc-100 text-zinc-500 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-zinc-200 transition-colors">
                        <Upload className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-medium text-zinc-900 mb-1">Click to upload</p>
                      <p className="text-xs text-zinc-500">PNG, JPG up to 10MB</p>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        accept="image/*"
                        className="hidden"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Logo Preview & Settings */}
            {logoUrl && (
              <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-6 space-y-6">
                <div>
                  <h3 className="text-sm font-medium text-zinc-900 mb-3 flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-zinc-500" />
                    Current Logo
                  </h3>
                  <div className="aspect-square rounded-xl border border-zinc-200 bg-zinc-50 overflow-hidden flex items-center justify-center p-4">
                    <img src={logoUrl} alt="Logo" className="max-w-full max-h-full object-contain mix-blend-multiply" />
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-zinc-100">
                  <h3 className="text-sm font-medium text-zinc-900 flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4 text-zinc-500" />
                    Mockup Settings
                  </h3>
                  
                  <div>
                    <div className="flex justify-between mb-1">
                      <label className="text-xs font-medium text-zinc-700">Logo Scale</label>
                      <span className="text-xs text-zinc-500">{logoScale}%</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="200"
                      value={logoScale}
                      onChange={(e) => setLogoScale(Number(e.target.value))}
                      className="w-full accent-zinc-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-700 mb-1">Blend Mode</label>
                    <select
                      value={blendMode}
                      onChange={(e) => setBlendMode(e.target.value as any)}
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent bg-white"
                    >
                      <option value="normal">Normal</option>
                      <option value="multiply">Multiply (Best for white backgrounds)</option>
                      <option value="screen">Screen (Best for black backgrounds)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Mockups */}
          <div className="lg:col-span-8">
            {logoUrl ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {MOCKUPS.map((mockup) => (
                  <div key={mockup.id} className="bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden group">
                    <div className="relative aspect-[4/3] bg-zinc-100 overflow-hidden">
                      <img 
                        src={mockup.image} 
                        alt={mockup.name}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <div 
                        className="absolute pointer-events-none"
                        style={{
                          top: mockup.logoStyle.top,
                          left: mockup.logoStyle.left,
                          transform: mockup.logoStyle.transform,
                          width: `${mockup.logoStyle.baseWidth * (logoScale / 100)}%`,
                          mixBlendMode: blendMode
                        }}
                      >
                        <img 
                          src={logoUrl} 
                          alt="Logo overlay" 
                          className="w-full h-auto object-contain drop-shadow-sm"
                        />
                      </div>
                    </div>
                    <div className="p-4 border-t border-zinc-100">
                      <h3 className="font-medium text-zinc-900">{mockup.name}</h3>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-full min-h-[400px] bg-white rounded-2xl shadow-sm border border-zinc-200 border-dashed flex flex-col items-center justify-center text-center p-8">
                <div className="w-16 h-16 bg-zinc-50 text-zinc-400 rounded-full flex items-center justify-center mb-4">
                  <ImageIcon className="w-8 h-8" />
                </div>
                <h2 className="text-lg font-medium text-zinc-900 mb-2">No Logo Selected</h2>
                <p className="text-zinc-500 max-w-sm">
                  Upload a logo or generate one using AI to see it previewed on various product mockups.
                </p>
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}
