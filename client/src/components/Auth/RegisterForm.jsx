import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  BookOpen,
  Church,
  Mail,
  Lock,
  User,
  Phone,
  Globe,
  MapPin,
  Upload,
  ArrowRight,
  ArrowLeft,
  Check,
  AlertCircle,
  Loader2,
  Image as ImageIcon,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const RegisterForm = () => {
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    // Step 1
    churchName: '',
    email: '',
    password: '',
    confirmPassword: '',
    // Step 2
    pastorName: '',
    phone: '',
    country: 'United States',
    state: '',
    address: '',
    // Step 3
    logo: null,
  });

  const [logoPreview, setLogoPreview] = useState(null);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Logo file size must be under 5MB');
        return;
      }
      setFormData((prev) => ({ ...prev, logo: file }));
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result);
      };
      reader.readAsDataURL(file);
      setError('');
    }
  };

  // Step 1 Validation
  const validateStep1 = () => {
    if (!formData.churchName.trim()) {
      setError('Church name is required.');
      return false;
    }
    if (!formData.email.trim() || !/\S+@\S+\.\S+/.test(formData.email)) {
      setError('A valid email is required.');
      return false;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return false;
    }
    setError('');
    return true;
  };

  // Step 2 Validation
  const validateStep2 = () => {
    if (!formData.pastorName.trim()) {
      setError('Pastor / Leader name is required.');
      return false;
    }
    setError('');
    return true;
  };

  const nextStep = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    } else if (step === 2 && validateStep2()) {
      setStep(3);
    }
  };

  const prevStep = () => {
    setError('');
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      // Use FormData to allow file upload
      const submission = new FormData();
      submission.append('churchName', formData.churchName);
      submission.append('name', formData.churchName);
      submission.append('email', formData.email);
      submission.append('password', formData.password);
      submission.append('pastorName', formData.pastorName);
      submission.append('phone', formData.phone);
      submission.append('country', formData.country);
      submission.append('state', formData.state);
      submission.append('address', formData.address);

      if (formData.logo) {
        submission.append('logo', formData.logo);
      }

      const res = await register(submission);
      setSubmitting(false);

      if (res.success) {
        navigate('/dashboard');
      } else {
        setError(res.error || 'Registration failed.');
      }
    } catch (err) {
      setSubmitting(false);
      setError(err.message || 'Something went wrong during registration.');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-xl bg-navy-900/90 border border-navy-700/60 rounded-2xl p-8 shadow-2xl backdrop-blur-xl"
    >
      {/* Brand Header */}
      <div className="text-center mb-6">
        <Link to="/" className="inline-flex items-center justify-center gap-3 group mb-2">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center shadow-lg shadow-gold-500/20 group-hover:scale-105 transition-transform">
            <BookOpen className="w-6 h-6 text-navy-950 font-bold" />
          </div>
          <div className="text-left">
            <h1 className="text-xl font-bold font-display text-white tracking-tight leading-none">
              Scripture<span className="text-gold-500">Live</span>
            </h1>
            <span className="text-xs font-semibold tracking-wider uppercase text-gold-400/80">
              Sanctuary Projection
            </span>
          </div>
        </Link>
        <h2 className="text-2xl font-bold text-white font-display">Register Your Church</h2>
        <p className="text-xs text-slate-400 mt-1">Set up your church account for live scripture projection</p>
      </div>

      {/* Stepper Progress */}
      <div className="mb-8">
        <div className="flex items-center justify-between relative">
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-navy-800 -translate-y-1/2 z-0" />
          <div
            className="absolute top-1/2 left-0 h-0.5 bg-gold-500 -translate-y-1/2 z-0 transition-all duration-300"
            style={{ width: step === 1 ? '0%' : step === 2 ? '50%' : '100%' }}
          />

          {[
            { num: 1, label: 'Account' },
            { num: 2, label: 'Church Details' },
            { num: 3, label: 'Branding' },
          ].map((item) => (
            <div key={item.num} className="relative z-10 flex flex-col items-center">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  step > item.num
                    ? 'bg-gold-500 text-navy-950 shadow-md shadow-gold-500/30'
                    : step === item.num
                    ? 'bg-navy-800 border-2 border-gold-500 text-gold-400 ring-4 ring-gold-500/10'
                    : 'bg-navy-800 text-slate-500 border border-navy-700'
                }`}
              >
                {step > item.num ? <Check className="w-4 h-4 stroke-[3]" /> : item.num}
              </div>
              <span
                className={`text-[11px] font-semibold mt-1.5 transition-colors ${
                  step >= item.num ? 'text-slate-200' : 'text-slate-500'
                }`}
              >
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mb-6 p-3.5 rounded-xl bg-red-500/15 border border-red-500/30 flex items-start gap-3 text-red-300 text-sm"
        >
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-400 mt-0.5" />
          <span>{error}</span>
        </motion.div>
      )}

      {/* Multi-Step Content */}
      <form onSubmit={handleSubmit}>
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Church Name *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Church className="w-5 h-5" />
                  </div>
                  <input
                    type="text"
                    name="churchName"
                    value={formData.churchName}
                    onChange={handleChange}
                    placeholder="Grace Community Church"
                    required
                    className="w-full pl-11 pr-4 py-2.5 bg-navy-950/70 border border-navy-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-gold-500 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Church / Admin Email *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-5 h-5" />
                  </div>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="info@gracecommunity.org"
                    required
                    className="w-full pl-11 pr-4 py-2.5 bg-navy-950/70 border border-navy-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-gold-500 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Password *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="••••••••••••"
                      required
                      className="w-full pl-10 pr-4 py-2.5 bg-navy-950/70 border border-navy-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-gold-500 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Confirm Password *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type="password"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      placeholder="••••••••••••"
                      required
                      className="w-full pl-10 pr-4 py-2.5 bg-navy-950/70 border border-navy-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-gold-500 text-sm"
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Senior Pastor / Leader Name *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="w-5 h-5" />
                  </div>
                  <input
                    type="text"
                    name="pastorName"
                    value={formData.pastorName}
                    onChange={handleChange}
                    placeholder="Pastor John Doe"
                    required
                    className="w-full pl-11 pr-4 py-2.5 bg-navy-950/70 border border-navy-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-gold-500 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Phone Number
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Phone className="w-4 h-4" />
                    </div>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="+1 (555) 000-0000"
                      className="w-full pl-10 pr-4 py-2.5 bg-navy-950/70 border border-navy-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-gold-500 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Country
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Globe className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      name="country"
                      value={formData.country}
                      onChange={handleChange}
                      placeholder="United States"
                      className="w-full pl-10 pr-4 py-2.5 bg-navy-950/70 border border-navy-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-gold-500 text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    State / Province
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      name="state"
                      value={formData.state}
                      onChange={handleChange}
                      placeholder="Texas"
                      className="w-full pl-10 pr-4 py-2.5 bg-navy-950/70 border border-navy-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-gold-500 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Street Address
                  </label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="123 Faith Way"
                    className="w-full px-4 py-2.5 bg-navy-950/70 border border-navy-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-gold-500 text-sm"
                  />
                </div>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
              className="space-y-4"
            >
              <div className="text-center">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                  Upload Church Logo (Optional)
                </label>
                <p className="text-xs text-slate-400 mb-4">
                  This logo will appear in the corner of your live projection screen and header.
                </p>

                <div className="flex flex-col items-center justify-center">
                  {logoPreview ? (
                    <div className="relative group w-32 h-32 rounded-2xl overflow-hidden border-2 border-gold-500 bg-navy-950 flex items-center justify-center p-2 mb-4 shadow-xl">
                      <img
                        src={logoPreview}
                        alt="Logo Preview"
                        className="max-h-full max-w-full object-contain"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setLogoPreview(null);
                          setFormData((p) => ({ ...p, logo: null }));
                        }}
                        className="absolute inset-0 bg-black/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs font-bold"
                      >
                        Remove Logo
                      </button>
                    </div>
                  ) : (
                    <label className="w-full border-2 border-dashed border-navy-700 hover:border-gold-500/70 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors bg-navy-950/40">
                      <div className="w-14 h-14 rounded-full bg-navy-800 flex items-center justify-center text-gold-400 mb-3">
                        <Upload className="w-6 h-6" />
                      </div>
                      <span className="text-sm font-semibold text-white">
                        Click or drag church logo to upload
                      </span>
                      <span className="text-xs text-slate-400 mt-1">PNG, JPG or SVG (Max 5MB)</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoChange}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-navy-800/40 border border-navy-700/50 text-xs text-slate-400">
                💡 <span className="font-semibold text-slate-300">Quick tip:</span> You can also customize
                presentation themes, font sizes, and duration inside Settings at any time.
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Buttons */}
        <div className="mt-8 flex items-center justify-between gap-4">
          {step > 1 ? (
            <button
              type="button"
              onClick={prevStep}
              className="px-5 py-2.5 rounded-xl border border-navy-700 hover:bg-navy-800 text-slate-300 text-sm font-semibold flex items-center gap-2 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          ) : (
            <div />
          )}

          {step < 3 ? (
            <button
              type="button"
              onClick={nextStep}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-400 hover:to-gold-500 text-navy-950 text-sm font-bold flex items-center gap-2 shadow-lg shadow-gold-500/20 transition-all cursor-pointer"
            >
              <span>Continue</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={submitting}
              className="px-8 py-3 rounded-xl bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-400 hover:to-gold-500 text-navy-950 text-sm font-bold flex items-center gap-2 shadow-lg shadow-gold-500/20 transition-all cursor-pointer disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <span>Complete & Launch</span>
                  <Check className="w-4 h-4" />
                </>
              )}
            </button>
          )}
        </div>
      </form>

      {/* Footer link to login */}
      <div className="mt-8 pt-5 border-t border-navy-800 text-center">
        <p className="text-xs text-slate-400">
          Already have an account?{' '}
          <Link
            to="/login"
            className="text-gold-400 hover:text-gold-300 font-semibold transition-colors"
          >
            Sign in
          </Link>
        </p>
      </div>
    </motion.div>
  );
};

export default RegisterForm;
