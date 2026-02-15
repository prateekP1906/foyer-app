
import React from 'react';
import { Shield, Clock, Star, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/logo.png';

const LandingPage = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900 overflow-x-hidden selection:bg-dental-teal/20">
            {/* Background Mesh Gradients */}
            <div className="fixed top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-dental-teal/10 rounded-full blur-[120px]" />
                <div className="absolute top-[20%] right-[-10%] w-[40%] h-[40%] bg-blue-100 rounded-full blur-[100px]" />
                <div className="absolute bottom-[-10%] left-[20%] w-[60%] h-[40%] bg-dental-mint/20 rounded-full blur-[120px]" />
            </div>

            {/* Navbar */}
            <nav className="flex justify-between items-center p-6 max-w-7xl mx-auto relative z-10">
                <div className="text-2xl font-bold flex items-center gap-2 text-slate-900">
                    <img src={logo} alt="Foyer Logo" className="w-10 h-10 object-contain" /> Foyer
                </div>
                <div className="flex items-center gap-8">
                    <button
                        onClick={() => navigate('/demo')}
                        className="text-slate-500 font-medium hover:text-dental-teal transition-colors cursor-pointer text-sm tracking-wide"
                    >
                        Live Demo
                    </button>
                    <button
                        onClick={() => navigate('/login')}
                        className="text-slate-500 font-medium hover:text-dental-teal transition-colors cursor-pointer text-sm tracking-wide"
                    >
                        Login
                    </button>
                    <button
                        onClick={() => navigate('/signup')}
                        className="bg-slate-900 text-white px-6 py-2.5 rounded-full font-medium hover:bg-slate-800 transition-all cursor-pointer shadow-lg hover:shadow-slate-900/20 text-sm tracking-wide"
                    >
                        Sign Up
                    </button>
                </div>
            </nav>

            {/* Hero Section */}
            <header className="max-w-7xl mx-auto px-6 pt-20 pb-32 flex flex-col items-center text-center relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                >
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/50 border border-slate-200 backdrop-blur-sm mb-8 shadow-sm">
                        <span className="w-2 h-2 rounded-full bg-dental-teal animate-pulse" />
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">New: AI Voice Analysis</span>
                    </div>

                    <h1 className="text-6xl md:text-8xl font-extrabold mb-8 tracking-tight text-slate-900 leading-[1.1]">
                        Your Front Desk, <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-dental-teal to-blue-500">Reimagined.</span>
                    </h1>
                    <p className="text-xl md:text-2xl text-slate-500 mb-12 max-w-2xl mx-auto leading-relaxed">
                        Foyer handles calls, bookings, and inquiries with human-level AI, so you can focus on patient care.
                    </p>

                    <div className="flex flex-col md:flex-row items-center justify-center gap-4">
                        <button
                            onClick={() => navigate('/demo')}
                            className="group bg-dental-teal text-white text-lg px-8 py-4 rounded-full font-bold hover:bg-teal-600 transition-all flex items-center gap-2 cursor-pointer shadow-lg hover:shadow-dental-teal/30 hover:-translate-y-1"
                        >
                            Try Live Demo <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </button>
                        <button
                            onClick={() => navigate('/signup')}
                            className="bg-white text-slate-900 text-lg px-8 py-4 rounded-full font-bold hover:bg-slate-50 transition-all border border-slate-200 cursor-pointer shadow-sm hover:shadow-md hover:-translate-y-1"
                        >
                            Start for Free
                        </button>
                    </div>
                </motion.div>


            </header>

            {/* Features Section */}
            <section className="max-w-7xl mx-auto px-6 py-24 relative z-10">
                <div className="grid md:grid-cols-3 gap-8">
                    {[
                        {
                            icon: <Clock className="w-6 h-6 text-dental-teal" />,
                            title: "24/7 Availability",
                            desc: "Never miss a patient call properly, even after hours."
                        },
                        {
                            icon: <Shield className="w-6 h-6 text-dental-teal" />,
                            title: "HIPAA Compliant",
                            desc: "Secure and private handling of all patient data."
                        },
                        {
                            icon: <Star className="w-6 h-6 text-dental-teal" />,
                            title: "Smart Triage",
                            desc: "Intelligently categorizes emergencies vs routine checkups."
                        }
                    ].map((feature, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: idx * 0.1 }}
                            className="group bg-white/60 backdrop-blur-md p-8 rounded-3xl border border-white/50 shadow-lg shadow-slate-200/50 hover:shadow-xl hover:shadow-slate-200/80 hover:-translate-y-2 transition-all duration-300"
                        >
                            <div className="bg-white w-14 h-14 rounded-2xl flex items-center justify-center mb-6 shadow-sm border border-slate-100 group-hover:scale-110 transition-transform duration-300">
                                {feature.icon}
                            </div>
                            <h3 className="text-xl font-bold mb-3 text-slate-900">{feature.title}</h3>
                            <p className="text-slate-500 leading-relaxed font-medium">{feature.desc}</p>
                        </motion.div>
                    ))}
                </div>
            </section>
        </div>
    );
};

export default LandingPage;
