import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { settingsAPI } from '@/api/endpoints';
import api from '@/api/axios';
import toast from 'react-hot-toast';
import { Save, Settings2 } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

export const Settings: React.FC = () => {
  // API Keys
  const [groqKey, setGroqKey] = useState('');
  const [mistralKey, setMistralKey] = useState('');
  const [geminiKey, setGeminiKey] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');
  const [anthropicKey, setAnthropicKey] = useState('');

  // Preferences
  const [defaultProvider, setDefaultProvider] = useState('Groq');
  const [defaultModel, setDefaultModel] = useState('');
  const [gradeA, setGradeA] = useState<number | string>(85);
  const [gradeB, setGradeB] = useState<number | string>(70);
  const [gradeC, setGradeC] = useState<number | string>(55);
  const [gradeD, setGradeD] = useState<number | string>(40);

  const handleNumberInput = (setter: (val: any) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    if (rawVal === '') {
      setter('');
    } else {
      const parsed = parseInt(rawVal, 10);
      setter(isNaN(parsed) ? '' : parsed);
    }
  };

  const [isSaving, setIsSaving] = useState(false);

  const { user } = useAuthStore();

  // Institution Settings State
  const [instLogo, setInstLogo] = useState('');
  const [instColor, setInstColor] = useState('');
  const [instGroq, setInstGroq] = useState('');
  const [instMistral, setInstMistral] = useState('');
  const [instGemini, setInstGemini] = useState('');
  const [instOpenai, setInstOpenai] = useState('');
  const [instAnthropic, setInstAnthropic] = useState('');

  useEffect(() => {
    const fetchInstitution = async () => {
      try {
        const response = await api.get('/api/admin/institution');
        const data = response.data;
        setInstLogo(data.logo_url || '');
        setInstColor(data.theme_color || '');
        setInstGroq(data.groq_api_key || '');
        setInstMistral(data.mistral_api_key || '');
        setInstGemini(data.gemini_api_key || '');
        setInstOpenai(data.openai_api_key || '');
        setInstAnthropic(data.anthropic_api_key || '');
      } catch (e) {
        console.error("Failed to load institution settings:", e);
      }
    };

    const fetchSettings = async () => {
      try {
        const response = await api.get('/auth/me');
        const userData = response.data;
        if (userData) {
          setGroqKey(userData.groq_api_key || '');
          setMistralKey(userData.mistral_api_key || '');
          setGeminiKey(userData.gemini_api_key || '');
          setOpenaiKey(userData.openai_api_key || '');
          setAnthropicKey(userData.anthropic_api_key || '');

          // Populate Global Institution input fields for Admin
          setInstGroq(userData.groq_api_key || '');
          setInstMistral(userData.mistral_api_key || '');
          setInstGemini(userData.gemini_api_key || '');
          setInstOpenai(userData.openai_api_key || '');
          setInstAnthropic(userData.anthropic_api_key || '');

          setGradeA(userData.grade_a_threshold ?? 85);
          setGradeB(userData.grade_b_threshold ?? 70);
          setGradeC(userData.grade_c_threshold ?? 55);
          setGradeD(userData.grade_d_threshold ?? 40);
          setDefaultProvider(userData.default_provider || 'Groq');
          setDefaultModel(userData.default_model || 'llama-3.3-70b-versatile');

          if (userData.role === 'institution_admin' || userData.role === 'admin') {
            await fetchInstitution();
          }
        }
      } catch (e) {
        toast.error("Failed to load settings.");
      }
    };

    fetchSettings();
  }, []);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      if (user?.role === 'institution_admin' || user?.role === 'admin') {
        await api.put('/api/admin/institution', {
          logo_url: instLogo || null,
          theme_color: instColor || null,
          groq_api_key: instGroq || null,
          mistral_api_key: instMistral || null,
          gemini_api_key: instGemini || null,
          openai_api_key: instOpenai || null,
          anthropic_api_key: instAnthropic || null
        });

        if (instGroq) localStorage.setItem('groq_api_key', instGroq);
        if (instMistral) localStorage.setItem('mistral_api_key', instMistral);
        if (instGemini) localStorage.setItem('gemini_api_key', instGemini);
        if (instOpenai) localStorage.setItem('openai_api_key', instOpenai);
        if (instAnthropic) localStorage.setItem('anthropic_api_key', instAnthropic);
      } else {
        // Save Individual Keys
        await settingsAPI.updateAPIKeys({
          groq_key: groqKey || undefined,
          mistral_key: mistralKey || undefined,
          gemini_key: geminiKey || undefined,
          openai_key: openaiKey || undefined,
          anthropic_key: anthropicKey || undefined
        });

        if (groqKey) localStorage.setItem('groq_api_key', groqKey);
        if (mistralKey) localStorage.setItem('mistral_api_key', mistralKey);
        if (geminiKey) localStorage.setItem('gemini_api_key', geminiKey);
        if (openaiKey) localStorage.setItem('openai_api_key', openaiKey);
        if (anthropicKey) localStorage.setItem('anthropic_api_key', anthropicKey);
      }

      // Save Preferences
      await settingsAPI.updatePreferences({
        default_provider: defaultProvider as any,
        default_model: defaultModel,
        grade_a: Number(gradeA) || 0,
        grade_b: Number(gradeB) || 0,
        grade_c: Number(gradeC) || 0,
        grade_d: Number(gradeD) || 0
      });

      toast.success("Settings updated successfully!");
    } catch (e: any) {
      console.error("Save settings error:", e);
      toast.error(e.response?.data?.detail || "Failed to update settings.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-8 relative flex flex-col animate-in fade-in duration-500 max-w-6xl mx-auto w-full">
      <div className="mb-8 flex items-center justify-between border-b border-slate-200 pb-5">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-indigo-50 border border-indigo-100 text-primary shadow-xs">
            <Settings2 className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Settings Workspace</h1>
            <p className="text-slate-500 text-base font-medium mt-0.5">Configure your AI providers, grading thresholds, and institution branding.</p>
          </div>
        </div>

        <Button
          disabled={isSaving}
          onClick={handleSave}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-11 px-5 shadow-md shadow-primary/20 rounded-xl border border-primary transition-all flex items-center gap-2"
        >
          <Save className="w-4 h-4 text-primary-foreground" />
          <span>{isSaving ? "Saving..." : "Save Settings"}</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1">
        {/* API Configurations / Global Keys */}
        <Card className="bg-white border-slate-200/80 shadow-md p-6 rounded-2xl flex flex-col space-y-4">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary"></div>
            {user?.role === 'institution_admin' ? "Global Institution API Keys" : "API Configurations"}
          </h2>

          <div className="space-y-3.5 flex-1 pr-1">
            {user?.role === 'institution_admin' ? (
              <>
                <div>
                  <Label className="text-slate-700 mb-1.5 block text-xs font-semibold">Global Groq API Key</Label>
                  <Input
                    type="password"
                    placeholder="Enter Global Groq API key"
                    value={instGroq}
                    onChange={(e) => setInstGroq(e.target.value)}
                    className="bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 rounded-xl h-11"
                  />
                </div>
                <div>
                  <Label className="text-slate-700 mb-1.5 block text-xs font-semibold">Global Mistral API Key</Label>
                  <Input
                    type="password"
                    placeholder="Enter Global Mistral API key"
                    value={instMistral}
                    onChange={(e) => setInstMistral(e.target.value)}
                    className="bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 rounded-xl h-11"
                  />
                </div>
                <div>
                  <Label className="text-slate-700 mb-1.5 block text-xs font-semibold">Global Gemini API Key</Label>
                  <Input
                    type="password"
                    placeholder="Enter Global Gemini API key"
                    value={instGemini}
                    onChange={(e) => setInstGemini(e.target.value)}
                    className="bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 rounded-xl h-11"
                  />
                </div>
                <div>
                  <Label className="text-slate-700 mb-1.5 block text-xs font-semibold">Global OpenAI API Key</Label>
                  <Input
                    type="password"
                    placeholder="Enter Global OpenAI API key"
                    value={instOpenai}
                    onChange={(e) => setInstOpenai(e.target.value)}
                    className="bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 rounded-xl h-11"
                  />
                </div>
                <div>
                  <Label className="text-slate-700 mb-1.5 block text-xs font-semibold">Global Anthropic (Claude) API Key</Label>
                  <Input
                    type="password"
                    placeholder="Enter Global Anthropic API key"
                    value={instAnthropic}
                    onChange={(e) => setInstAnthropic(e.target.value)}
                    className="bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 rounded-xl h-11"
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <Label className="text-slate-700 mb-1.5 block text-xs font-semibold">Groq API Key</Label>
                  <Input
                    type="password"
                    placeholder="Enter Groq API key"
                    value={groqKey}
                    onChange={(e) => setGroqKey(e.target.value)}
                    className="bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 rounded-xl h-11"
                  />
                </div>
                <div>
                  <Label className="text-slate-700 mb-1.5 block text-xs font-semibold">Mistral API Key</Label>
                  <Input
                    type="password"
                    placeholder="Enter Mistral API key"
                    value={mistralKey}
                    onChange={(e) => setMistralKey(e.target.value)}
                    className="bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 rounded-xl h-11"
                  />
                </div>
                <div>
                  <Label className="text-slate-700 mb-1.5 block text-xs font-semibold">Gemini API Key</Label>
                  <Input
                    type="password"
                    placeholder="Enter Gemini API key"
                    value={geminiKey}
                    onChange={(e) => setGeminiKey(e.target.value)}
                    className="bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 rounded-xl h-11"
                  />
                </div>
                <div>
                  <Label className="text-slate-700 mb-1.5 block text-xs font-semibold">OpenAI API Key</Label>
                  <Input
                    type="password"
                    placeholder="Enter OpenAI API key"
                    value={openaiKey}
                    onChange={(e) => setOpenaiKey(e.target.value)}
                    className="bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 rounded-xl h-11"
                  />
                </div>
                <div>
                  <Label className="text-slate-700 mb-1.5 block text-xs font-semibold">Anthropic (Claude) Key</Label>
                  <Input
                    type="password"
                    placeholder="Enter Anthropic API key"
                    value={anthropicKey}
                    onChange={(e) => setAnthropicKey(e.target.value)}
                    className="bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 rounded-xl h-11"
                  />
                </div>
              </>
            )}

            <div className="pt-2">
              <Label className="text-slate-700 mb-1.5 block text-xs font-semibold">Default AI Provider</Label>
              <Select value={defaultProvider} onValueChange={setDefaultProvider}>
                <SelectTrigger className="bg-slate-50 border-slate-200 text-slate-900 rounded-xl h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200 text-slate-900 rounded-xl">
                  <SelectItem value="Groq">Groq</SelectItem>
                  <SelectItem value="Mistral">Mistral</SelectItem>
                  <SelectItem value="Gemini">Google Gemini</SelectItem>
                  <SelectItem value="OpenAI">OpenAI</SelectItem>
                  <SelectItem value="Anthropic">Anthropic Claude</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {/* Grading Thresholds */}
        <Card className="bg-white border-slate-200/80 shadow-md p-6 rounded-2xl flex flex-col">
          <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-primary"></div> Grading Thresholds (%)</h2>

          <div className="space-y-4 flex-1">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-700 mb-1.5 block text-xs font-semibold">Grade A (%)</Label>
                <Input
                  type="number"
                  value={gradeA}
                  onFocus={(e) => e.target.select()}
                  onChange={handleNumberInput(setGradeA)}
                  className="bg-slate-50 border-slate-200 text-slate-900 rounded-xl text-center font-bold h-11"
                />
              </div>
              <div>
                <Label className="text-slate-700 mb-1.5 block text-xs font-semibold">Grade B (%)</Label>
                <Input
                  type="number"
                  value={gradeB}
                  onFocus={(e) => e.target.select()}
                  onChange={handleNumberInput(setGradeB)}
                  className="bg-slate-50 border-slate-200 text-slate-900 rounded-xl text-center font-semibold h-11"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-700 mb-1.5 block text-xs font-semibold">Grade C (%)</Label>
                <Input
                  type="number"
                  value={gradeC}
                  onFocus={(e) => e.target.select()}
                  onChange={handleNumberInput(setGradeC)}
                  className="bg-slate-50 border-slate-200 text-slate-900 rounded-xl text-center h-11 font-medium"
                />
              </div>
              <div>
                <Label className="text-slate-700 mb-1.5 block text-xs font-semibold">Grade D (%)</Label>
                <Input
                  type="number"
                  value={gradeD}
                  onFocus={(e) => e.target.select()}
                  onChange={handleNumberInput(setGradeD)}
                  className="bg-slate-50 border-slate-200 text-slate-900 rounded-xl text-center h-11 font-medium"
                />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs text-slate-600 mt-2">
              <p className="font-bold text-slate-800 flex items-center gap-1.5">
                <span>📌</span> Grading Bounds Logic:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-slate-600 font-medium">
                <li>Score ≥ {gradeA}% renders <strong className="text-slate-900 font-bold">Grade A</strong></li>
                <li>Score ≥ {gradeB}% renders <strong className="text-slate-900 font-bold">Grade B</strong></li>
                <li>Score ≥ {gradeC}% renders <strong className="text-slate-900 font-bold">Grade C</strong></li>
                <li>Lower values fallback to <strong className="text-slate-900 font-bold">Grade F</strong></li>
              </ul>
            </div>
          </div>

          <Button
            disabled={isSaving}
            onClick={handleSave}
            className="w-full mt-6 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-bold h-11 flex items-center justify-center gap-2 shadow-md shadow-primary/20 border border-primary transition-all"
          >
            {isSaving ? "Saving..." : <><Save className="w-4 h-4 text-primary-foreground" /> Save Configuration Settings</>}
          </Button>
        </Card>

      </div>
    </div>
  );
};

export default Settings;