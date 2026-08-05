import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Lock, Mail, CheckCircle2, TrendingUp, Users, ArrowRight } from 'lucide-react';

const testimonials = [
    {
        name: 'Kwame Mensah',
        role: 'Project Manager, MacWest Construction',
        image: '/images/testimonial-1.png',
        quote: 'Monitoring Tracker transformed how we manage construction projects across Accra. Task visibility increased by 300% and we eliminated idle time completely.',
    },
    {
        name: 'Ama Osei',
        role: 'Lead Engineer, CypressEnergy',
        image: '/images/testimonial-2.png',
        quote: 'The profitability tracking is a game changer for our energy infrastructure projects. We can now see project margins in real-time and make data-driven decisions.',
    },
    {
        name: 'Kofi Asante',
        role: 'Site Supervisor, Northbrook LRD',
        image: '/images/testimonial-3.png',
        quote: 'Best project management tool for Ghanaian construction teams. The idle task alerts alone saved us thousands of cedis in lost productivity.',
    },
];

const stats = [
    { icon: CheckCircle2, value: '10,000+', label: 'Tasks Completed' },
    { icon: TrendingUp, value: '98%', label: 'On-Time Delivery' },
    { icon: Users, value: '500+', label: 'Happy Teams' },
];

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { signIn } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await signIn(email, password);
            navigate('/dashboard');
        } catch (err: any) {
            setError(err.message || 'Invalid email or password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex bg-white dark:bg-slate-950">
            {/* Left - Login Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-12">
                <div className="w-full max-w-md space-y-10 animate-fade-in">
                    {/* Logo */}
                    <div className="flex flex-col items-start">
                        <div className="inline-flex items-center gap-3 mb-6">
                            <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
                                <CheckCircle2 className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-gray-900 dark:text-slate-50 tracking-tight">Monitoring Tracker</h1>
                                <p className="text-sm text-gray-500 dark:text-slate-400">Project & Productivity Management</p>
                            </div>
                        </div>
                    </div>

                    {/* Setup Notice */}
                    <div className="bg-primary/5 border border-primary/10 rounded-2xl p-5">
                        <p className="text-sm text-primary font-medium leading-relaxed">
                            First time? See <strong>LOGIN_CREDENTIALS.md</strong> for setup instructions.
                        </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">
                                Email Address
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <Input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="you@company.com"
                                    className="pl-11 h-12 text-base"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">
                                Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <Input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="pl-11 h-12 text-base"
                                    required
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="bg-error/10 border border-error/20 text-error text-sm p-4 rounded-2xl flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-error flex-shrink-0" />
                                {error}
                            </div>
                        )}

                        <Button
                            type="submit"
                            className="w-full h-12 text-base font-semibold rounded-pill"
                            disabled={loading}
                        >
                            {loading ? (
                                <span className="flex items-center gap-2">
                                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-md animate-spin" />
                                    Signing in...
                                </span>
                            ) : (
                                <span className="flex items-center gap-2">
                                    Sign In
                                    <ArrowRight className="w-4 h-4" />
                                </span>
                            )}
                        </Button>
                    </form>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-6 pt-8 border-t border-gray-100 dark:border-slate-800">
                        {stats.map((stat, i) => (
                            <div key={stat.label} className="text-center animate-slide-up" style={{ animationDelay: `${i * 0.1}s` }}>
                                <stat.icon className="h-5 w-5 text-primary mx-auto mb-2" />
                                <div className="text-xl font-bold text-gray-900 dark:text-slate-50 tracking-tight">
                                    {stat.value}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{stat.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Right - Testimonials */}
            <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-12 items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(59,130,246,0.03),transparent_50%)]" />
                <div className="w-full max-w-lg space-y-6 relative z-10">
                    {testimonials.map((testimonial, index) => (
                        <div
                            key={index}
                            className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-3xl p-6 border border-white/20 dark:border-slate-700/20 shadow-sm hover:shadow-md transition-all duration-500 card-lift"
                            style={{
                                animation: `spring-up 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) ${index * 0.12}s both`,
                            }}
                        >
                            <div className="flex items-start gap-4">
                                <img
                                    src={testimonial.image}
                                    alt={testimonial.name}
                                    className="w-12 h-12 rounded-full object-cover flex-shrink-0 ring-2 ring-white/50"
                                />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h4 className="font-semibold text-gray-900 dark:text-slate-50 text-sm">
                                            {testimonial.name}
                                        </h4>
                                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-primary bg-primary/5 px-2 py-0.5 rounded-full">
                                            <CheckCircle2 className="w-3 h-3" />
                                            Verified
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-slate-400 mb-2">
                                        {testimonial.role}
                                    </p>
                                    <p className="text-sm text-gray-600 dark:text-slate-300 leading-relaxed">
                                        "{testimonial.quote}"
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Illustration */}
                <div className="absolute bottom-0 right-0 w-[500px] h-[500px] opacity-60 pointer-events-none">
                    <img
                        src="/images/project-illustration.png"
                        alt=""
                        className="w-full h-full object-contain"
                    />
                </div>
            </div>
        </div>
    );
}
