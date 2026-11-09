import React, { useState, useEffect } from 'react';
import DashboardLayout from '../components/Layout/DashboardLayout';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import ProjectionPreview from '../components/Projection/ProjectionPreview';
import TranslationSelector from '../components/Bible/TranslationSelector';
import api from '../utils/api';
import {
  Settings,
  Church,
  Palette,
  Upload,
  Save,
  Clock,
  Type,
  Layout,
  Check,
  Loader2,
  Sparkles,
  BookOpen,
} from 'lucide-react';
import toast from 'react-hot-toast';

const SettingsPage = () => {
  const { user, updateProfile, uploadLogo, updateBranding, updateTranslation } = useAuth();
  const { emitUpdateChurchSettings, emitUpdateBranding } = useSocket();

  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('branding'); // 'branding' | 'profile'

  // Church Profile State
  const [profile, setProfile] = useState({
    name: user?.churchName || user?.name || '',
    churchName: user?.churchName || user?.name || '',
    pastorName: user?.pastorName || '',
    phone: user?.phone || '',
    country: user?.country || 'United States',
    state: user?.state || '',
    address: user?.address || '',
  });

  // Preferred Bible Translation
  const [preferredTranslation, setPreferredTranslation] = useState(
    user?.preferredTranslation || 'KJV'
  );

  // Branding & Projection Theme State
  const [branding, setBranding] = useState({
    template: user?.branding?.template || 'classic', // classic | light | modern | elegant
    primaryColor: user?.branding?.primaryColor || '#f99307',
    secondaryColor: user?.branding?.secondaryColor || '#1a3dff',
    backgroundColor: user?.branding?.backgroundColor || '#0b1137',
    textColor: user?.branding?.textColor || '#ffffff',
    fontSize: user?.branding?.fontSize || 48,
    displayDuration: user?.branding?.displayDuration ?? 300,
  });

  const [logoPreview, setLogoPreview] = useState(user?.logoUrl || null);
  const [logoFile, setLogoFile] = useState(null);

  // Sync when user context updates
  useEffect(() => {
    if (user) {
      const activeName = user.churchName || user.name || '';
      setProfile((prev) => ({
        ...prev,
        churchName: activeName,
        name: activeName,
        pastorName: user.pastorName || '',
        phone: user.phone || '',
        country: user.country || 'United States',
        state: user.state || '',
        address: user.address || '',
      }));
      if (user.branding) {
        setBranding((prev) => ({ ...prev, ...user.branding }));
      }
      if (user.logoUrl) {
        setLogoPreview(user.logoUrl);
      }
      if (user.preferredTranslation) {
        setPreferredTranslation(user.preferredTranslation);
      }
    }
  }, [user]);

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    if (name === 'churchName') {
      setProfile((prev) => ({ ...prev, churchName: value, name: value }));
    } else {
      setProfile((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleBrandingChange = (key, value) => {
    setBranding((prev) => ({ ...prev, [key]: value }));
  };

  const handleLogoFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setSaving(true);

    try {
      let currentLogoUrl = logoPreview || user?.logoUrl;
      // 1. Upload logo if changed
      if (logoFile) {
        const uploadRes = await uploadLogo(logoFile);
        if (uploadRes?.logoUrl) {
          currentLogoUrl = uploadRes.logoUrl;
        }
      }

      // 2. Update church profile with latest logo and synchronized church name
      const resolvedName = (profile.churchName || profile.name || '').trim();
      const updatedProfile = {
        ...profile,
        name: resolvedName,
        churchName: resolvedName,
        logoUrl: currentLogoUrl,
      };
      await updateProfile(updatedProfile);

      // 3. Update branding
      await updateBranding(branding);

      // 4. Update default Bible translation
      if (preferredTranslation) {
        await updateTranslation(preferredTranslation);
      }

      // 5. Broadcast to all open tabs, windows, and socket room immediately
      const fullSettings = {
        ...updatedProfile,
        name: resolvedName,
        churchName: resolvedName,
        branding,
        preferredTranslation,
        logoUrl: currentLogoUrl,
      };

      if (emitUpdateChurchSettings) {
        emitUpdateChurchSettings(fullSettings);
      } else if (emitUpdateBranding) {
        emitUpdateBranding(branding);
      }

      toast.success('Church profile & projection settings saved successfully!');
    } catch (err) {
      console.error('Failed to save settings:', err);
      toast.error('Failed to save some settings');
    } finally {
      setSaving(false);
    }
  };

  // Sample scripture for live previewing customization
  const sampleScripture = {
    reference: 'John 3:16',
    text: 'For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.',
    translation: preferredTranslation || 'KJV',
    churchName: profile.churchName || profile.name || user?.churchName || 'Faith Church',
    logoUrl: logoPreview,
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-navy-800">
          <div>
            <h1 className="text-2xl font-bold text-white font-display flex items-center gap-2">
              <Settings className="w-6 h-6 text-gold-400" />
              <span>Church & Projection Settings</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Customize projection design themes, church identity, colors, and live durations.
            </p>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-400 hover:to-gold-500 text-navy-950 text-sm font-bold shadow-lg shadow-gold-500/20 transition-all cursor-pointer disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving Changes...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save All Settings</span>
              </>
            )}
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-3 border-b border-navy-800">
          <button
            onClick={() => setActiveTab('branding')}
            className={`pb-3 text-sm font-bold transition-all flex items-center gap-2 border-b-2 cursor-pointer ${
              activeTab === 'branding'
                ? 'border-gold-500 text-gold-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Palette className="w-4 h-4" />
            <span>Projection Branding & Themes</span>
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`pb-3 text-sm font-bold transition-all flex items-center gap-2 border-b-2 cursor-pointer ${
              activeTab === 'profile'
                ? 'border-gold-500 text-gold-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Church className="w-4 h-4" />
            <span>Church Profile & Identity</span>
          </button>
        </div>

        {/* Settings Body */}
        {activeTab === 'branding' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Col: Customization Form (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              {/* Church Quick Identity Card */}
              <div className="bg-navy-900 border border-navy-800 rounded-2xl p-6 shadow-xl">
                <div className="flex items-center justify-between mb-1.5">
                  <h3 className="text-sm font-bold text-white font-display flex items-center gap-2">
                    <Church className="w-4 h-4 text-gold-400" />
                    <span>Church Name & Sanctuary Title</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => setActiveTab('profile')}
                    className="text-xs text-gold-400 hover:text-gold-300 font-semibold cursor-pointer underline"
                  >
                    Edit Full Profile
                  </button>
                </div>
                <p className="text-xs text-slate-400 mb-3">
                  This church name is displayed prominently on live projector screens, headers, and idle displays.
                </p>
                <input
                  type="text"
                  name="churchName"
                  value={profile.churchName}
                  onChange={handleProfileChange}
                  placeholder="e.g. Grace Fellowship Church"
                  className="w-full px-4 py-2.5 bg-navy-950/90 border border-navy-700 rounded-xl text-white text-xs font-semibold focus:outline-none focus:border-gold-500"
                />
              </div>

              {/* Template Style Selector */}
              <div className="bg-navy-900 border border-navy-800 rounded-2xl p-6 shadow-xl">
                <h3 className="text-sm font-bold text-white font-display mb-1 flex items-center gap-2">
                  <Layout className="w-4 h-4 text-gold-400" />
                  <span>Projection Template Style</span>
                </h3>
                <p className="text-xs text-slate-400 mb-4">
                  Select the visual theme applied to scripture projections on church screens.
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    {
                      id: 'classic',
                      name: 'Classic',
                      desc: 'Navy gradient & gold accents',
                      previewBg: 'bg-navy-950',
                      previewText: 'text-gold-400',
                    },
                    {
                      id: 'light',
                      name: 'Light',
                      desc: 'Cream paper & dark serif',
                      previewBg: 'bg-amber-50',
                      previewText: 'text-amber-900',
                    },
                    {
                      id: 'modern',
                      name: 'Modern',
                      desc: 'Deep blue & clean sans',
                      previewBg: 'bg-blue-950',
                      previewText: 'text-sky-400',
                    },
                    {
                      id: 'elegant',
                      name: 'Elegant',
                      desc: 'Pure black & gold vignette',
                      previewBg: 'bg-black',
                      previewText: 'text-gold-400',
                    },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => handleBrandingChange('template', t.id)}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between h-24 ${
                        branding.template === t.id
                          ? 'border-gold-500 bg-gold-500/10 ring-2 ring-gold-500/30'
                          : 'border-navy-800 bg-navy-950 hover:border-navy-700'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-xs font-bold text-white">{t.name}</span>
                        {branding.template === t.id && (
                          <Check className="w-4 h-4 text-gold-400 stroke-[3]" />
                        )}
                      </div>
                      <div
                        className={`w-full h-7 rounded-lg ${t.previewBg} flex items-center justify-center border border-white/10`}
                      >
                        <span className={`text-[10px] font-bold ${t.previewText}`}>Aa</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Colors Customization */}
              <div className="bg-navy-900 border border-navy-800 rounded-2xl p-6 shadow-xl space-y-4">
                <h3 className="text-sm font-bold text-white font-display flex items-center gap-2">
                  <Palette className="w-4 h-4 text-gold-400" />
                  <span>Color Customization</span>
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                      Accent (Gold)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={branding.primaryColor}
                        onChange={(e) => handleBrandingChange('primaryColor', e.target.value)}
                        className="w-9 h-9 rounded-lg bg-transparent cursor-pointer border border-navy-700 p-0.5"
                      />
                      <span className="text-xs font-mono text-slate-300">
                        {branding.primaryColor}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                      Secondary (Blue)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={branding.secondaryColor}
                        onChange={(e) => handleBrandingChange('secondaryColor', e.target.value)}
                        className="w-9 h-9 rounded-lg bg-transparent cursor-pointer border border-navy-700 p-0.5"
                      />
                      <span className="text-xs font-mono text-slate-300">
                        {branding.secondaryColor}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                      Background
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={branding.backgroundColor}
                        onChange={(e) => handleBrandingChange('backgroundColor', e.target.value)}
                        className="w-9 h-9 rounded-lg bg-transparent cursor-pointer border border-navy-700 p-0.5"
                      />
                      <span className="text-xs font-mono text-slate-300">
                        {branding.backgroundColor}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                      Text Color
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={branding.textColor}
                        onChange={(e) => handleBrandingChange('textColor', e.target.value)}
                        className="w-9 h-9 rounded-lg bg-transparent cursor-pointer border border-navy-700 p-0.5"
                      />
                      <span className="text-xs font-mono text-slate-300">
                        {branding.textColor}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Timing & Font Size */}
              <div className="bg-navy-900 border border-navy-800 rounded-2xl p-6 shadow-xl grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-white mb-2 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gold-400" />
                    <span>Display Duration (Seconds)</span>
                  </label>
                  <select
                    value={branding.displayDuration}
                    onChange={(e) => handleBrandingChange('displayDuration', Number(e.target.value))}
                    className="w-full bg-navy-950 border border-navy-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-gold-500 cursor-pointer"
                  >
                    <option value={300}>5 Minutes (Default)</option>
                    <option value={180}>3 Minutes</option>
                    <option value={60}>1 Minute</option>
                    <option value={30}>30 Seconds</option>
                    <option value={15}>15 Seconds</option>
                    <option value={0}>Permanent (Hold until cleared)</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-white flex items-center gap-2">
                      <Type className="w-4 h-4 text-gold-400" />
                      <span>Scripture Base Font Size</span>
                    </label>
                    <span className="text-xs text-gold-400 font-bold">{branding.fontSize}px</span>
                  </div>
                  <input
                    type="range"
                    min="32"
                    max="64"
                    step="2"
                    value={branding.fontSize}
                    onChange={(e) => handleBrandingChange('fontSize', Number(e.target.value))}
                    className="w-full accent-gold-500 cursor-pointer mt-2"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                    <span>32px</span>
                    <span>Standard (48px)</span>
                    <span>64px</span>
                  </div>
                </div>
              </div>

              {/* Default Bible Translation Card */}
              <div className="bg-navy-900 border border-navy-800 rounded-2xl p-6 shadow-xl">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-bold text-white font-display flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-gold-400" />
                    <span>Default Bible Translation</span>
                  </h3>
                  <span className="text-xs px-2.5 py-0.5 rounded-lg bg-gold-500/20 text-gold-400 font-bold border border-gold-500/30">
                    {preferredTranslation}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mb-4">
                  Select the primary scripture translation to project during services and sermons.
                </p>
                <div className="flex flex-wrap items-center gap-4">
                  <TranslationSelector
                    value={preferredTranslation}
                    onChange={(newVal) => setPreferredTranslation(newVal)}
                  />
                  <span className="text-xs text-slate-400">
                    Projector badges and scripture text will display in this version.
                  </span>
                </div>
              </div>
            </div>

            {/* Right Col: Live Preview of Chosen Theme (5 cols) */}
            <div className="lg:col-span-5 flex flex-col space-y-4">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Live Branding Theme Preview
              </div>
              <ProjectionPreview
                overrideScripture={sampleScripture}
                overrideBranding={branding}
              />
              <div className="p-4 rounded-xl bg-navy-900 border border-navy-800 text-xs text-slate-300 flex items-start gap-3">
                <Sparkles className="w-4 h-4 text-gold-400 flex-shrink-0 mt-0.5" />
                <span>
                  Adjusting the theme above immediately updates this preview. When saved, all connected
                  projectors will reflect this style automatically.
                </span>
              </div>
            </div>
          </div>
        ) : (
          /* Profile Tab */
          <div className="max-w-3xl bg-navy-900 border border-navy-800 rounded-2xl p-8 shadow-xl space-y-6">
            <div>
              <h3 className="text-base font-bold text-white font-display mb-1">
                Church Details & Organization Information
              </h3>
              <p className="text-xs text-slate-400">
                Information used on header bars and live projection outputs.
              </p>
            </div>

            {/* Church Logo Upload */}
            <div className="flex items-center gap-6 pb-6 border-b border-navy-800">
              <div className="w-20 h-20 rounded-2xl overflow-hidden bg-navy-950 border-2 border-gold-500 flex items-center justify-center p-2 shadow-lg">
                {logoPreview ? (
                  <img
                    src={logoPreview}
                    alt="Logo"
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <Church className="w-10 h-10 text-gold-400" />
                )}
              </div>

              <div>
                <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-navy-800 hover:bg-navy-700 text-xs font-bold text-white border border-navy-700 transition-colors cursor-pointer">
                  <Upload className="w-4 h-4 text-gold-400" />
                  <span>Upload New Church Logo</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoFileChange}
                    className="hidden"
                  />
                </label>
                <p className="text-[11px] text-slate-400 mt-1.5">
                  PNG, JPG or SVG formats under 5MB.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Church Name
                </label>
                <input
                  type="text"
                  name="churchName"
                  value={profile.churchName}
                  onChange={handleProfileChange}
                  className="w-full px-4 py-2.5 bg-navy-950/80 border border-navy-700 rounded-xl text-white text-xs focus:outline-none focus:border-gold-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Senior Pastor / Leader Name
                </label>
                <input
                  type="text"
                  name="pastorName"
                  value={profile.pastorName}
                  onChange={handleProfileChange}
                  className="w-full px-4 py-2.5 bg-navy-950/80 border border-navy-700 rounded-xl text-white text-xs focus:outline-none focus:border-gold-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Contact Phone
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={profile.phone}
                  onChange={handleProfileChange}
                  className="w-full px-4 py-2.5 bg-navy-950/80 border border-navy-700 rounded-xl text-white text-xs focus:outline-none focus:border-gold-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Country
                </label>
                <input
                  type="text"
                  name="country"
                  value={profile.country}
                  onChange={handleProfileChange}
                  className="w-full px-4 py-2.5 bg-navy-950/80 border border-navy-700 rounded-xl text-white text-xs focus:outline-none focus:border-gold-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  State / Province
                </label>
                <input
                  type="text"
                  name="state"
                  value={profile.state}
                  onChange={handleProfileChange}
                  className="w-full px-4 py-2.5 bg-navy-950/80 border border-navy-700 rounded-xl text-white text-xs focus:outline-none focus:border-gold-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Street Address
                </label>
                <input
                  type="text"
                  name="address"
                  value={profile.address}
                  onChange={handleProfileChange}
                  className="w-full px-4 py-2.5 bg-navy-950/80 border border-navy-700 rounded-xl text-white text-xs focus:outline-none focus:border-gold-500"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-navy-800 flex justify-end">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-400 hover:to-gold-500 text-navy-950 text-sm font-bold shadow-lg shadow-gold-500/20 transition-all cursor-pointer disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving Profile...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save Church Profile</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default SettingsPage;
