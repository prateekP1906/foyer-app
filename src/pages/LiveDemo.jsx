import React, { useState, useEffect, useRef } from 'react';
import { Mic, Phone, User, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { format } from 'date-fns';
import { supabase } from '../supabaseClient';
import { RetellWebClient } from 'retell-client-js-sdk';
import logo from '../assets/logo.png';

const LiveDemo = () => {
    const [isCallActive, setIsCallActive] = useState(false);
    const [isAgentTalking, setIsAgentTalking] = useState(false);
    const [appointments, setAppointments] = useState([]);
    const retellClientRef = useRef(null);

    // Initialize Retell Client
    useEffect(() => {
        const client = new RetellWebClient();

        client.on('call_started', () => {
            console.log('Call started');
            setIsCallActive(true);
        });

        client.on('call_ended', () => {
            console.log('Call ended');
            setIsCallActive(false);
            setIsAgentTalking(false);
        });

        client.on('agent_start_talking', () => {
            setIsAgentTalking(true);
        });

        client.on('agent_stop_talking', () => {
            setIsAgentTalking(false);
        });

        client.on('error', (error) => {
            console.error('Retell error:', error);
            setIsCallActive(false);
            alert('An error occurred during the call.');
        });

        retellClientRef.current = client;

        // Cleanup
        return () => {
            if (retellClientRef.current) {
                retellClientRef.current.stopCall();
            }
        };
    }, []);

    // Subscribe to Supabase Real-time Broadcasts
    useEffect(() => {
        const channel = supabase.channel('demo-room')
            .on('broadcast', { event: 'new_booking' }, (payload) => {
                console.log('New booking received:', payload.payload);
                setAppointments(prev => [payload.payload, ...prev]);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const handleStartCall = async () => {
        if (isCallActive) {
            retellClientRef.current.stopCall();
            return;
        }

        try {
            // Fetch access token from backend
            // Relative URL for Vercel (works on localhost too if handled by Vercel/proxied)
            const response = await fetch('/api/create-web-call');
            if (!response.ok) throw new Error('Failed to get access token');

            const data = await response.json();

            await retellClientRef.current.startCall({
                accessToken: data.access_token
            });

        } catch (error) {
            console.error('Failed to start call:', error);
            alert('Could not start the call. Make sure the backend is running.');
        }
    };

    return (
        <div className="flex h-screen bg-slate-50 font-sans overflow-hidden selection:bg-dental-teal/20">
            {/* Left Side - Call Interface */}
            <div className="w-1/2 flex flex-col items-center justify-center p-10 bg-white border-r border-slate-100 relative">
                {/* Background Decor */}
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                    <div className="absolute top-[-20%] left-[-20%] w-[50%] h-[50%] bg-dental-teal/5 rounded-full blur-[100px]" />
                    <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-50 rounded-full blur-[80px]" />
                </div>

                <div className="absolute top-10 left-10 text-2xl font-bold text-slate-900 flex items-center gap-2 z-10">
                    <img src={logo} alt="Foyer Logo" className="w-8 h-8 object-contain" /> Foyer Demo
                </div>

                <div className="text-center space-y-8 z-10 relative">
                    <div className="relative">
                        <motion.button
                            onClick={handleStartCall}
                            animate={isCallActive ? {
                                boxShadow: [
                                    "0 0 0 0px rgba(20, 184, 166, 0.3)",
                                    "0 0 0 20px rgba(20, 184, 166, 0.1)",
                                    "0 0 0 40px rgba(20, 184, 166, 0)"
                                ],
                            } : {}}
                            transition={isCallActive ? {
                                duration: 2,
                                repeat: Infinity,
                                ease: "easeInOut"
                            } : {}}
                            className={clsx(
                                "w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl relative z-10 mx-auto",
                                isCallActive
                                    ? "bg-white text-red-500 border-4 border-red-50"
                                    : "bg-gradient-to-br from-dental-teal to-teal-600 text-white shadow-dental-teal/40 hover:scale-105"
                            )}
                        >
                            {isCallActive ? (
                                <Phone className="w-12 h-12" />
                            ) : (
                                <Mic className="w-12 h-12" />
                            )}
                        </motion.button>

                        {/* Status Indicator */}
                        <div className="mt-8">
                            <div className={clsx(
                                "inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold uppercase tracking-wider shadow-sm border",
                                isCallActive
                                    ? "bg-red-50 text-red-500 border-red-100"
                                    : "bg-slate-50 text-slate-400 border-slate-100"
                            )}>
                                <span className={clsx(
                                    "w-2 h-2 rounded-full",
                                    isCallActive ? "bg-red-500 animate-pulse" : "bg-slate-300"
                                )} />
                                {isCallActive ? "Live Call in Progress" : "Ready to Start"}
                            </div>
                        </div>
                    </div>

                    <div className="max-w-md mx-auto">
                        <h2 className="text-3xl font-extrabold text-slate-900 mb-3 tracking-tight">
                            {isCallActive ? "Listening..." : "Experience AI Receptionist"}
                        </h2>
                        <p className="text-slate-500 text-lg leading-relaxed">
                            {isCallActive
                                ? "Speak naturally. our AI is processing your request in real-time."
                                : "Click the microphone to simulate a patient call. The AI will handle scheduling, triage, and inquiries."}
                        </p>
                    </div>
                </div>
            </div>

            {/* Right Side - Live Log */}
            <div className="w-1/2 bg-slate-50/50 p-10 flex flex-col h-screen">
                <div className="flex items-center justify-between mb-8">
                    <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-dental-teal" /> Live Interaction Log
                    </h3>
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest bg-white px-3 py-1 rounded-md border border-slate-200">
                        Real-time
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto space-y-4 pr-2 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent pb-10">
                    <AnimatePresence initial={false}>
                        {appointments.length === 0 && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="h-full flex flex-col items-center justify-center text-slate-300 space-y-4"
                            >
                                <div className="w-16 h-16 rounded-2xl bg-white border border-slate-100 flex items-center justify-center">
                                    <Clock className="w-8 h-8" />
                                </div>
                                <p className="font-medium">Waiting for call activity...</p>
                            </motion.div>
                        )}

                        {appointments.map((apt) => (
                            <motion.div
                                key={apt.id}
                                initial={{ opacity: 0, x: 20, scale: 0.95 }}
                                animate={{ opacity: 1, x: 0, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 group hover:shadow-md transition-all relative overflow-hidden"
                            >
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-dental-teal" />
                                <div className="flex justify-between items-start mb-3">
                                    <h4 className="font-bold text-slate-900 flex items-center gap-2">
                                        <User className="w-4 h-4 text-slate-400" />
                                        {apt.patient_name || 'New Patient'}
                                    </h4>
                                    <span className="text-xs font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded border border-slate-100">
                                        {apt.appointment_time ? format(new Date(apt.appointment_time), 'h:mm a') : 'Now'}
                                    </span>
                                </div>
                                <div className="text-slate-600 mb-3 bg-slate-50 p-3 rounded-xl text-sm border border-slate-100/50">
                                    "{apt.issue_description || 'Inquiry caught via voice...'}"
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                    <div className="flex items-center gap-1.5 text-dental-teal font-bold bg-dental-mint/10 px-2.5 py-1 rounded-full">
                                        <div className="w-1.5 h-1.5 rounded-full bg-dental-teal animate-pulse" />
                                        Processed
                                    </div>
                                    <span className="text-slate-400 font-medium tracking-wide uppercase">ID: {apt.id.slice(0, 8)}</span>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div >
            </div >
        </div >
    );
};

export default LiveDemo;
