import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, useAuthStore } from '../hooks/useAuth';
import { homePath } from '@/lib/permissions';
import {
    Eye,
    EyeOff,
    Clock,
    Heart,
    Zap,
    Building2,
    ShieldCheck,
    BookmarkCheck,
} from 'lucide-react';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showDemoCredentials, setShowDemoCredentials] = useState(false);
    const { signIn } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await signIn(email, password);
            navigate(homePath(useAuthStore.getState().user));
        } catch (err: any) {
            setError(err.message || 'Invalid email or password');
        } finally {
            setLoading(false);
        }
    };

    const applyDemo = (demoEmail: string, demoPass: string) => {
        setEmail(demoEmail);
        setPassword(demoPass);
        setShowDemoCredentials(false);
    };

    return (
        <div className="min-h-screen flex flex-col justify-between bg-white dark:bg-slate-950 font-sans selection:bg-[#F58220]/20 selection:text-[#F58220]">

            {/* Main Content Area */}
            <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 border-b border-slate-200 dark:border-slate-800">

                {/* LEFT COLUMN: Expansive Brand Area with Large Floating Collage & Hero Typography */}
                <div className="lg:col-span-7 xl:col-span-7 lg:border-r border-slate-200 dark:border-slate-800 relative flex flex-col justify-between p-6 sm:p-10 lg:px-12 xl:px-16 lg:py-10 overflow-hidden min-h-[640px] lg:min-h-[760px] bg-[#FAFBFD] dark:bg-slate-950">

                    {/* Top-Left Brand Logo - Clean, Authentic & Orange Accent */}
                    <div className="relative z-30 flex items-center gap-3.5">
                        <img
                            src="/logo-clean.png"
                            alt="Pulse360"
                            className="h-12 w-12 sm:h-14 sm:w-14 object-contain filter drop-shadow-sm"
                            onError={(e) => {
                                e.currentTarget.src = '/logo.avif';
                            }}
                        />
                        <div className="flex flex-col">
                            <span className="text-2xl sm:text-3xl font-black tracking-tight text-[#1c1e21] dark:text-white leading-none">
                                Pulse<span className="text-[#F58220]">360</span>
                            </span>
                            <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 dark:text-slate-500 tracking-wider uppercase mt-1">
                                Operations & Milestone Platform
                            </span>
                        </div>
                    </div>

                    {/* Center Floating Visual Collage (Orange & White Theme) */}
                    <div className="relative my-8 lg:my-6 w-full max-w-[560px] sm:max-w-[620px] lg:max-w-[680px] h-[460px] sm:h-[520px] lg:h-[560px] mx-auto lg:mx-0 flex items-center justify-center">

                        {/* 1. Top-Left Reaction Emoji Pill */}
                        <div className="absolute top-[32px] left-[18px] sm:left-[36px] z-30 w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-b from-[#FFE066] via-[#FFC300] to-[#F58220] shadow-[0_12px_24px_rgba(245,130,32,0.35)] flex items-center justify-center -rotate-12 border-2 border-white dark:border-slate-900 select-none transform hover:scale-110 transition-transform">
                            <span className="text-2xl sm:text-3xl leading-none drop-shadow-xs">😄</span>
                        </div>

                        {/* 2. Left Backdrop Card: Energy Solar Farm (Orange Badge & Accents) */}
                        <div className="absolute top-[75px] left-[16px] sm:left-[36px] z-10 w-[190px] sm:w-[240px] lg:w-[265px] h-[200px] sm:h-[245px] lg:h-[270px] rounded-[28px] overflow-hidden shadow-[0_18px_40px_rgba(0,0,0,0.12)] border-[3px] border-white dark:border-slate-800 bg-slate-200 dark:bg-slate-800 transform -rotate-3 hover:rotate-0 transition-transform duration-300">
                            <img
                                src="/images/hero-solar.webp"
                                alt="Solar Farm Infrastructure"
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                    e.currentTarget.src = 'https://images.unsplash.com/photo-1545209575-704d1434f9cd?auto=format&fit=crop&w=800&q=80';
                                }}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                            {/* Orange Zap Badge */}
                            <div className="absolute top-3 left-3 w-8 h-8 rounded-xl bg-[#F58220] text-white shadow-xs flex items-center justify-center">
                                <Zap className="w-4 h-4 fill-current text-white" />
                            </div>
                            {/* Card Footer Tag */}
                            <div className="absolute bottom-3 left-3.5 right-3 text-white">
                                <span className="inline-block px-2 py-0.5 rounded-md bg-[#F58220] text-[10px] uppercase font-bold tracking-wider text-white mb-1 shadow-xs">
                                    Solar Array Alpha
                                </span>
                                <p className="text-xs sm:text-sm font-semibold truncate leading-tight">50MW Renewable Grid</p>
                            </div>
                        </div>

                        {/* 3. Main Tall Story Card (Center-Right: High-Definition Civil Engineering Team) */}
                        <div className="absolute top-[12px] right-[16px] sm:right-[32px] lg:right-[48px] z-20 w-[240px] sm:w-[295px] lg:w-[330px] h-[390px] sm:h-[450px] lg:h-[490px] rounded-[12px] overflow-hidden shadow-[0_25px_60px_rgba(0,0,0,0.22)] border-[2px] border-white dark:border-slate-800 bg-slate-900 group">
                            <img
                                src="/images/hero-main.webp"
                                alt="Pulse360 Engineering Team"
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                onError={(e) => {
                                    e.currentTarget.src = 'https://plus.unsplash.com/premium_photo-1681691912442-68c4179c530c?auto=format&fit=crop&w=800&q=80';
                                }}
                            />
                            <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/65 pointer-events-none" />

                            {/* Top Story Progress Bar */}
                            <div className="absolute top-4 inset-x-4">
                                <div className="w-full h-1.5 rounded-full bg-white/40 overflow-hidden">
                                    <div className="w-3/4 h-full bg-[#F58220] rounded-full" />
                                </div>
                            </div>

                            {/* Bottom Story Controls */}
                            <div className="absolute bottom-4 inset-x-4 flex items-center gap-2.5">
                                <div className="flex-1 h-9 rounded-full border border-white/80 bg-white/15 backdrop-blur-sm px-3 flex items-center">
                                    <span className="text-[11px] text-white/90 font-medium truncate">Accra Infrastructure Loop</span>
                                </div>
                                <div className="w-7 h-7 rounded-full border border-white/80 flex items-center justify-center shrink-0">
                                    <BookmarkCheck className="w-3.5 h-3.5 text-white" />
                                </div>
                                <div className="w-7 h-7 rounded-full border border-white/80 flex items-center justify-center shrink-0">
                                    <Heart className="w-3.5 h-3.5 text-white fill-white" />
                                </div>
                            </div>
                        </div>

                        {/* 4. Orange Time Pill Overlapping Top-Right ("16:45") */}
                        <div className="absolute top-[48px] right-[4px] sm:right-[14px] lg:right-[26px] z-30 bg-[#F58220] text-white px-3.5 py-1.5 rounded-2xl shadow-[0_10px_24px_rgba(245,130,32,0.4)] flex items-center gap-1.5 font-bold text-xs sm:text-sm">
                            <Clock className="w-4 h-4 fill-white text-[#F58220]" />
                            <span>16:45</span>
                        </div>

                        {/* 5. White Bottom-Left Framed Task Card */}
                        <div className="absolute bottom-[35px] left-[28px] sm:left-[55px] lg:left-[65px] z-30 w-[175px] sm:w-[210px] lg:w-[230px] bg-white dark:bg-slate-900 rounded-[26px] p-3 sm:p-3.5  border border-slate-100 dark:border-slate-800">
                            {/* Orange Badge at Top-Left */}
                            <div className="mb-2.5 flex items-center justify-between">
                                <div className="w-6 h-6 rounded-lg bg-[#F58220] flex items-center justify-center text-white shadow-xs">
                                    <Building2 className="w-3.5 h-3.5" />
                                </div>
                                <span className="text-[10px] font-bold text-[#F58220]">Active Task</span>
                            </div>
                            {/* Square Construction Image */}
                            <div className="w-full aspect-square rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 mb-2.5">
                                <img
                                    src="/images/hero-site.webp"
                                    alt="Site Execution"
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                        e.currentTarget.src = 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=600&q=80';
                                    }}
                                />
                            </div>
                            {/* Task Metadata & Skeleton Lines in Orange Accent */}
                            <div className="space-y-1.5 px-0.5 pb-0.5">
                                <p className="text-[11px] font-bold text-slate-800 dark:text-slate-100 truncate">Foundation & Structural Pour</p>
                                <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700" />
                                <div className="w-3/4 h-2 rounded-full bg-[#F58220]/40" />
                            </div>
                        </div>

                        {/* 6. Bottom-Center Circular Avatar: Lead Engineer with Orange Ring */}
                        <div className="absolute bottom-[2px] left-[155px] sm:left-[215px] lg:left-[245px] z-40 w-[105px] h-[105px] sm:w-[130px] sm:h-[130px] lg:w-[145px] lg:h-[145px] rounded-full p-[3.5px] bg-[#F58220] ">
                            <div className="w-full h-full rounded-full overflow-hidden border-2 border-white dark:border-slate-900 bg-slate-200">
                                <img
                                    src="/images/hero-avatar.webp"
                                    alt="Sarah Mensah, Lead Engineer"
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                        e.currentTarget.src = 'https://plus.unsplash.com/premium_photo-1682146752444-cd1309e874d3?auto=format&fit=crop&w=400&q=80';
                                    }}
                                />
                            </div>
                        </div>

                        {/* 7. Bottom-Right Orange Heart Reaction Bubble */}
                        <div className="absolute bottom-[105px] right-[2px] sm:right-[12px] lg:right-[20px] z-30 w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#F58220] flex items-center justify-center rotate-12 border-2 border-white dark:border-slate-900 transform hover:scale-110 transition-transform">
                            <Heart className="w-6 h-6 sm:w-7 sm:h-7 text-white fill-white" />
                        </div>

                    </div>

                    {/* Bottom-Left Headline: "Deliver the projects you lead." */}
                    <div className="relative z-30 mt-auto pt-6 max-w-[420px] sm:max-w-[480px]">
                        <h1 className="text-[44px] sm:text-[56px] lg:text-[64px] font-black tracking-[-0.035em] text-[#1c1e21] dark:text-white leading-[1.02]">
                            Deliver<br />
                            the projects<br />
                            <span className="text-[#F58220]">
                                you lead
                            </span>
                            <span className="text-[#1c1e21] dark:text-white">.</span>
                        </h1>
                    </div>

                </div>

                {/* RIGHT COLUMN: Clean White Form Container with Orange Accents */}
                <div className="lg:col-span-5 xl:col-span-5 flex flex-col justify-center items-center px-6 py-12 sm:px-12 lg:px-14 xl:px-16 bg-white dark:bg-slate-950">
                    <div className="w-full max-w-[396px]">

                        {/* Form Title */}
                        <h2 className="text-[19px] sm:text-[21px] font-bold text-[#1c1e21] dark:text-white mb-6">
                            Log into Pulse360
                        </h2>

                        {/* Login Form */}
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Email Input */}
                            <div>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="Email or username"
                                    autoComplete="email"
                                    required
                                    className="w-full h-[54px] px-4 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-[15px] text-[#1c1e21] dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-[#F58220] focus:ring-4 focus:ring-[#F58220]/15 transition-all"
                                />
                            </div>

                            {/* Password Input */}
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Password"
                                    autoComplete="current-password"
                                    required
                                    className="w-full h-[54px] pl-4 pr-11 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-[15px] text-[#1c1e21] dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-[#F58220] focus:ring-4 focus:ring-[#F58220]/15 transition-all"
                                />
                                {password.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
                                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                )}
                            </div>

                            {/* Error Banner */}
                            {error && (
                                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                                    <span className="h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0" />
                                    <span>{error}</span>
                                </div>
                            )}

                            {/* Primary Button ("Log in") in Solid Bold Orange */}
                            <div className="pt-1.5">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full h-[50px] rounded-xl bg-[#F58220] hover:bg-[#E07216] active:scale-[0.99] text-white font-bold text-[15px]  transition-all flex items-center justify-center disabled:opacity-60 cursor-pointer"
                                >
                                    {loading ? (
                                        <span className="flex items-center gap-2">
                                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Logging in...
                                        </span>
                                    ) : (
                                        'Log in'
                                    )}
                                </button>
                            </div>

                            {/* Centered "Forgot password?" link */}
                            <div className="text-center pt-2 pb-5">
                                <button
                                    type="button"
                                    onClick={() => setShowDemoCredentials(!showDemoCredentials)}
                                    className="text-[13px] sm:text-[14px] font-medium text-slate-600 dark:text-slate-400 hover:text-[#F58220] hover:underline cursor-pointer transition-colors"
                                >
                                    Forgot password or need demo account?
                                </button>
                            </div>


                        </form>

                        {/* Quick Demo Credentials Drawer */}
                        {showDemoCredentials && (
                            <div className="mt-5 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs space-y-6">
                                <div className="flex items-center justify-between text-slate-700 dark:text-slate-300 font-medium">
                                    <span className="flex items-center gap-1.5">
                                        <ShieldCheck className="w-3.5 h-3.5 text-[#F58220]" />
                                        Quick Demo Access
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setShowDemoCredentials(false)}
                                        className="text-[11px] text-[#F58220] hover:text-slate-600 cursor-pointer"
                                    >
                                        Close
                                    </button>
                                </div>
                                <div className="grid grid-cols-2 gap-1.5 pt-1">
                                    <button
                                        type="button"
                                        onClick={() => applyDemo('admin@example.com', 'password123')}
                                        className="text-left px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-[#F58220] transition-colors cursor-pointer"
                                    >
                                        <p className="font-medium text-[11px] text-slate-800 dark:text-slate-200">Admin</p>
                                        <p className="text-[10px] text-slate-400 truncate">admin@example.com</p>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => applyDemo('lead.cypress@example.com', 'password123')}
                                        className="text-left px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-[#F58220] transition-colors cursor-pointer"
                                    >
                                        <p className="font-medium text-[11px] text-[#F58220]">Cypress Lead</p>
                                        <p className="text-[10px] text-slate-400 truncate">lead.cypress@...</p>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => applyDemo('lead.northbrook@example.com', 'password123')}
                                        className="text-left px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-[#F58220] transition-colors cursor-pointer"
                                    >
                                        <p className="font-medium text-[11px] text-slate-800 dark:text-slate-200">Northbrook Lead</p>
                                        <p className="text-[10px] text-slate-400 truncate">lead.northbrook@...</p>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => applyDemo('executive@example.com', 'password123')}
                                        className="text-left px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-[#F58220] transition-colors cursor-pointer"
                                    >
                                        <p className="font-medium text-[11px] text-slate-800 dark:text-slate-200">Executive</p>
                                        <p className="text-[10px] text-slate-400 truncate">executive@...</p>
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Bottom Centered Meta-Style Mark */}
                        <div className="pt-10 flex flex-col items-center justify-center gap-1.5 text-[11px] text-slate-400 select-none">
                            <span className="font-bold tracking-tight text-slate-600 dark:text-slate-300">
                                Pulse360 Platform
                            </span>
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                                <span>Cypress Energy</span>
                                <span>•</span>
                                <span>Northbrook LRD</span>
                                <span>•</span>
                                <span>MacWest</span>
                            </div>
                        </div>

                    </div>
                </div>

            </main>

            {/* Global Bottom Multi-Row Footer (Matches Inspo) */}
            <footer className="w-full bg-white dark:bg-slate-950 text-[11px] sm:text-[12px] text-slate-500 dark:text-slate-400 py-6 sm:py-8">
                <div className="max-w-[980px] mx-auto px-6 space-y-2.5 leading-relaxed">

                    {/* Language Links Row */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pb-2 border-b border-slate-200/80 dark:border-slate-800 text-[11px]">
                        <span className="text-slate-800 dark:text-slate-200 font-semibold">English (UK)</span>
                        <a href="#lang" className="hover:underline">Twi (Ghana)</a>
                        <a href="#lang" className="hover:underline">Français (France)</a>
                        <a href="#lang" className="hover:underline">Português (Brasil)</a>
                        <a href="#lang" className="hover:underline">Español</a>
                        <a href="#lang" className="hover:underline">العربية</a>
                        <a href="#lang" className="hover:underline">Deutsch</a>
                        <a href="#lang" className="hover:underline">日本語</a>
                        <a href="#lang" className="hover:underline text-[#F58220] font-medium">More languages...</a>
                    </div>

                    {/* Navigation Links Row */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500">
                        <Link to="/signup" className="hover:underline">Sign Up</Link>
                        <Link to="/" className="hover:underline font-semibold text-slate-800 dark:text-slate-200">Log In</Link>
                        <a href="#brief" className="hover:underline">Morning Brief</a>
                        <a href="#loop" className="hover:underline">Accountability Loop</a>
                        <a href="#cypress" className="hover:underline">Cypress Energy</a>
                        <a href="#northbrook" className="hover:underline">Northbrook LRD</a>
                        <a href="#macwest" className="hover:underline">MacWest</a>
                        <a href="#privacy" className="hover:underline">Privacy Policy</a>
                        <a href="#terms" className="hover:underline">Terms</a>
                        <a href="#status" className="hover:underline">System Status</a>
                        <a href="#help" className="hover:underline">Help Center</a>
                    </div>

                    {/* Copyright Note */}
                    <div className="pt-2 text-[11px] text-slate-400">
                        Pulse360 © 2026. Multi-company project & operations governance engine.
                    </div>

                </div>
            </footer>

        </div>
    );
}
