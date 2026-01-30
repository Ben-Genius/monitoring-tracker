import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Lock, Mail, CheckCircle2, TrendingUp, Users } from 'lucide-react';

const testimonials = [
    {
        name: 'Kwame Mensah',
        role: 'Project Manager, MacWest Construction',
        image: '/images/testimonial-1.png',
        quote: 'Monitoring Tracker transformed how we manage construction projects across Accra. Task visibility increased by 300% and we eliminated idle time completely.',
        verified: true,
    },
    {
        name: 'Ama Osei',
        role: 'Lead Engineer, CypressEnergy',
        image: '/images/testimonial-2.png',
        quote: 'The profitability tracking is a game changer for our energy infrastructure projects. We can now see project margins in real-time and make data-driven decisions.',
        verified: true,
    },
    {
        name: 'Kofi Asante',
        role: 'Site Supervisor, Northbrook LRD',
        image: '/images/testimonial-3.png',
        quote: 'Best project management tool for Ghanaian construction teams. The idle task alerts alone saved us thousands of cedis in lost productivity.',
        verified: true,
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
        <div className="min-h-screen flex">
            {/* Left Side - Login Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white">
                <div className="w-full max-w-md space-y-8">
                    {/* Logo & Title */}
                    <div className="text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-macwest mb-4">
                            <CheckCircle2 className="w-8 h-8 text-white" />
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900">
                            Monitoring Tracker
                        </h1>
                        <p className="text-gray-500 mt-2">
                            Project & Productivity Management
                        </p>
                    </div>

                    {/* Setup Notice */}
                    <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                        <p className="text-sm text-primary font-medium">
                            🚀 First time? See <strong>LOGIN_CREDENTIALS.md</strong> for setup
                        </p>
                    </div>

                    {/* Login Form */}
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Email Address
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <Input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="you@company.com"
                                    className="pl-10 h-12"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <Input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="pl-10 h-12"
                                    required
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="bg-error/10 border border-error text-error text-sm p-4 rounded-lg">
                                {error}
                            </div>
                        )}

                        <Button
                            type="submit"
                            className="w-full h-12 text-base font-semibold"
                            disabled={loading}
                        >
                            {loading ? 'Signing in...' : 'Sign In'}
                        </Button>
                    </form>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-4 pt-8 border-t">
                        {stats.map((stat) => (
                            <div key={stat.label} className="text-center">
                                <stat.icon className="h-5 w-5 text-primary mx-auto mb-1" />
                                <div className="text-lg font-bold text-gray-900">
                                    {stat.value}
                                </div>
                                <div className="text-xs text-gray-500">{stat.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Right Side - Testimonials & Illustration */}
            <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#FFF5F0] to-[#FFE8DC] p-12 items-center justify-center relative overflow-hidden">
                <div className="w-full max-w-lg space-y-6 relative z-10">
                    {/* Testimonials */}
                    <div className="space-y-4">
                        {testimonials.map((testimonial, index) => (
                            <div
                                key={index}
                                className="bg-white rounded-2xl p-5 shadow-lg hover:shadow-xl transition-shadow"
                            >
                                <div className="flex items-start space-x-4">
                                    <img
                                        src={testimonial.image}
                                        alt={testimonial.name}
                                        className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                                    />
                                    <div className="flex-1">
                                        <div className="flex items-center space-x-2 mb-1">
                                            <h4 className="font-semibold text-gray-900 text-sm">
                                                {testimonial.name}
                                            </h4>
                                            {testimonial.verified && (
                                                <CheckCircle2 className="w-4 h-4 text-primary" />
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-500 mb-2">
                                            {testimonial.role}
                                        </p>
                                        <p className="text-sm text-gray-700 leading-relaxed">
                                            "{testimonial.quote}"
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Illustration */}
                <div className="absolute bottom-0 right-0 w-[500px] h-[500px] opacity-90">
                    <img
                        src="/images/project-illustration.png"
                        alt="Project Management"
                        className="w-full h-full object-contain"
                    />
                </div>
            </div>
        </div>
    );
}
