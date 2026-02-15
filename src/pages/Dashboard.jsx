
import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { Phone, Calendar, CheckCircle, AlertCircle, DollarSign, Users, Briefcase, Edit, X, Trash2, Plus, User, Clock } from 'lucide-react';
import clsx from 'clsx';
import { motion } from 'framer-motion';
import logo from '../assets/logo.png';

const Dashboard = () => {
    const [appointments, setAppointments] = useState([]);
    const [stats, setStats] = useState({
        totalBookings: 0,
        upcomingToday: 0,
        revenueSaved: 0
    });
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);
    const [editingAppointment, setEditingAppointment] = useState(null);
    const [isAddingAppointment, setIsAddingAppointment] = useState(false);
    const [newAppointment, setNewAppointment] = useState({
        patient_name: '',
        phone_number: '',
        appointment_time: '',
        issue_description: '',
        status: 'pending'
    });
    const navigate = useNavigate();

    useEffect(() => {
        fetchData();
        fetchUser();
    }, []);

    const fetchUser = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (data) {
                setUser({
                    ...user,
                    user_metadata: {
                        ...user.user_metadata,
                        first_name: data.first_name,
                        last_name: data.last_name,
                        avatar_url: data.avatar_url
                    }
                });
            } else {
                setUser(user);
            }
        }
    };

    const fetchData = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('appointments')
            .select('*')
            .order('appointment_time', { ascending: true });

        if (data) {
            setAppointments(data);
            calculateStats(data);
        }
        setLoading(false);
    };

    const handleAddAppointment = async (e) => {
        e.preventDefault();
        if (!user) return;

        const { error } = await supabase
            .from('appointments')
            .insert({
                ...newAppointment,
                appointment_time: newAppointment.appointment_time || new Date().toISOString(),
                user_id: user.id
            });

        if (!error) {
            setIsAddingAppointment(false);
            setNewAppointment({
                patient_name: '',
                phone_number: '',
                appointment_time: '',
                issue_description: '',
                status: 'pending'
            });
            fetchData();
        } else {
            alert('Error adding appointment: ' + error.message);
        }
    };

    const handleDeleteAppointment = async (id) => {
        if (!window.confirm('Are you sure you want to delete this appointment?')) return;

        const { error } = await supabase
            .from('appointments')
            .delete()
            .eq('id', id);

        if (!error) {
            fetchData();
        } else {
            alert('Error deleting appointment: ' + error.message);
        }
    };

    const handleUpdateAppointment = async (e) => {
        e.preventDefault();
        if (!editingAppointment) return;

        const { error } = await supabase
            .from('appointments')
            .update({
                patient_name: editingAppointment.patient_name,
                phone_number: editingAppointment.phone_number,
                appointment_time: editingAppointment.appointment_time,
                issue_description: editingAppointment.issue_description,
                status: editingAppointment.status
            })
            .eq('id', editingAppointment.id);

        if (!error) {
            setEditingAppointment(null);
            fetchData();
        } else {
            alert('Error updating appointment: ' + error.message);
        }
    };

    const calculateStats = (data) => {
        const today = new Date().toDateString();
        const upcoming = data.filter(apt => new Date(apt.appointment_time).toDateString() === today).length;
        const revenue = data.length * 150;

        setStats({
            totalBookings: data.length,
            upcomingToday: upcoming,
            revenueSaved: revenue
        });
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/login');
    };

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good Morning';
        if (hour < 18) return 'Good Afternoon';
        return 'Good Evening';
    };

    if (loading) return (
        <div className="flex items-center justify-center h-screen bg-slate-50">
            <div className="flex flex-col items-center gap-4">
                <img src={logo} className="w-12 h-12 animate-bounce" />
                <span className="text-slate-400 font-medium">Loading Dashboard...</span>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50/50 p-8 font-sans text-slate-900 selection:bg-dental-teal/20">
            <header className="mb-12 flex justify-between items-end">
                <div>
                    <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-2">
                        {getGreeting()}, <span className="text-dental-teal">Dr. {user?.user_metadata?.last_name || 'Smith'}</span>
                    </h1>
                    <p className="text-slate-500 font-medium flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {format(new Date(), 'EEEE, MMMM do, yyyy')}
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setIsAddingAppointment(true)}
                        className="bg-dental-teal text-white px-5 py-2.5 rounded-xl hover:bg-teal-600 transition-all cursor-pointer flex items-center gap-2 font-bold shadow-lg shadow-dental-teal/20 hover:shadow-dental-teal/40 hover:-translate-y-0.5"
                    >
                        <Plus className="w-5 h-5" /> New Appointment
                    </button>
                    <button
                        onClick={handleLogout}
                        className="bg-white text-slate-500 px-5 py-2.5 rounded-xl font-bold hover:bg-slate-100 transition-colors cursor-pointer border border-slate-200"
                    >
                        Logout
                    </button>
                    <button
                        onClick={() => navigate('/profile')}
                        className="w-12 h-12 rounded-xl bg-white overflow-hidden flex items-center justify-center border border-slate-200 hover:border-dental-teal transition-all cursor-pointer shadow-sm"
                        title="Profile Settings"
                    >
                        {user?.user_metadata?.avatar_url ? (
                            <img src={user.user_metadata.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                            <User className="w-6 h-6 text-slate-400" />
                        )}
                    </button>
                </div>
            </header>

            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
                <StatCard
                    icon={<Users className="w-6 h-6" />}
                    title="Total Bookings"
                    value={stats.totalBookings}
                    color="bg-dental-teal"
                />
                <StatCard
                    icon={<Calendar className="w-6 h-6" />}
                    title="Upcoming Today"
                    value={stats.upcomingToday}
                    color="bg-blue-500"
                />
                <StatCard
                    icon={<DollarSign className="w-6 h-6" />}
                    title="Revenue Saved"
                    value={`$${stats.revenueSaved}`}
                    color="bg-emerald-500"
                />
            </div>

            {/* Appointments Table */}
            <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
                <div className="p-8 border-b border-slate-100 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-slate-900">Recent Appointments</h2>
                    <button className="text-sm font-bold text-dental-teal hover:text-teal-700 transition-colors">View All</button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/80 border-b border-slate-100">
                                <th className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-wider">Patient Name</th>
                                <th className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-wider">Phone</th>
                                <th className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-wider">Date & Time</th>
                                <th className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-wider">Issue</th>
                                <th className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                                <th className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {appointments.map((apt) => (
                                <motion.tr
                                    key={apt.id}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="hover:bg-slate-50/80 transition-colors group"
                                >
                                    <td className="px-8 py-5">
                                        <span className="font-bold text-slate-900">{apt.patient_name || 'Unknown'}</span>
                                    </td>
                                    <td className="px-8 py-5">
                                        <a href={`tel:${apt.phone_number}`} className="flex items-center gap-2 text-slate-500 hover:text-dental-teal transition-colors font-medium">
                                            <Phone className="w-4 h-4" />
                                            {apt.phone_number}
                                        </a>
                                    </td>
                                    <td className="px-8 py-5 text-slate-500">
                                        {apt.appointment_time ? format(new Date(apt.appointment_time), 'MMM d, h:mm a') : 'TBD'}
                                    </td>
                                    <td className="px-8 py-5 text-slate-500 max-w-xs truncate">
                                        {apt.issue_description}
                                    </td>
                                    <td className="px-8 py-5">
                                        <span className={clsx(
                                            "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border capitalize",
                                            apt.status === 'confirmed' ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                                apt.status === 'pending' ? "bg-amber-50 text-amber-700 border-amber-200" :
                                                    "bg-slate-50 text-slate-600 border-slate-200"
                                        )}>
                                            <span className={clsx("w-1.5 h-1.5 rounded-full",
                                                apt.status === 'confirmed' ? "bg-emerald-500" :
                                                    apt.status === 'pending' ? "bg-amber-500" :
                                                        "bg-slate-400"
                                            )} />
                                            {apt.status}
                                        </span>
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => setEditingAppointment(apt)}
                                                className="p-2 rounded-lg text-slate-400 hover:text-dental-teal hover:bg-dental-mint/20 transition-all cursor-pointer"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteAppointment(apt.id)}
                                                className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all cursor-pointer"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </motion.tr>
                            ))}
                            {appointments.length === 0 && (
                                <tr>
                                    <td colSpan="6" className="px-8 py-16 text-center text-slate-400">
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-300">
                                                <Calendar className="w-8 h-8" />
                                            </div>
                                            <p className="font-medium">No appointments found yet.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Edit Modal - Styling Update */}
            {
                editingAppointment && (
                    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="bg-white rounded-3xl w-full max-w-lg p-8 shadow-2xl"
                        >
                            <div className="flex justify-between items-center mb-8">
                                <h3 className="text-2xl font-bold text-slate-900">Edit Appointment</h3>
                                <button onClick={() => setEditingAppointment(null)} className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                            <form onSubmit={handleUpdateAppointment} className="space-y-6">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Patient Name</label>
                                        <input
                                            type="text"
                                            value={editingAppointment.patient_name}
                                            onChange={e => setEditingAppointment({ ...editingAppointment, patient_name: e.target.value })}
                                            className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-dental-teal/50 focus:border-dental-teal transition-all font-medium"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Phone</label>
                                        <input
                                            type="text"
                                            value={editingAppointment.phone_number}
                                            onChange={e => setEditingAppointment({ ...editingAppointment, phone_number: e.target.value })}
                                            className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-dental-teal/50 focus:border-dental-teal transition-all font-medium"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Date & Time</label>
                                    <input
                                        type="datetime-local"
                                        value={editingAppointment.appointment_time ? format(new Date(editingAppointment.appointment_time), "yyyy-MM-dd'T'HH:mm") : ''}
                                        onChange={e => setEditingAppointment({ ...editingAppointment, appointment_time: new Date(e.target.value).toISOString() })}
                                        className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-dental-teal/50 focus:border-dental-teal transition-all font-medium"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Issue</label>
                                    <input
                                        type="text"
                                        value={editingAppointment.issue_description}
                                        onChange={e => setEditingAppointment({ ...editingAppointment, issue_description: e.target.value })}
                                        className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-dental-teal/50 focus:border-dental-teal transition-all font-medium"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Status</label>
                                    <select
                                        value={editingAppointment.status}
                                        onChange={e => setEditingAppointment({ ...editingAppointment, status: e.target.value })}
                                        className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-dental-teal/50 focus:border-dental-teal transition-all font-medium bg-white"
                                    >
                                        <option value="pending">Pending</option>
                                        <option value="confirmed">Confirmed</option>
                                        <option value="cancelled">Cancelled</option>
                                    </select>
                                </div>
                                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                    <button
                                        type="button"
                                        onClick={() => setEditingAppointment(null)}
                                        className="px-6 py-3 text-slate-500 font-bold hover:bg-slate-100 rounded-xl transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-6 py-3 bg-dental-teal text-white font-bold rounded-xl hover:bg-teal-700 transition-colors shadow-lg shadow-dental-teal/20"
                                    >
                                        Save Changes
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )
            }

            {/* Add Modal - Reuse Styling */}
            {
                isAddingAppointment && (
                    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="bg-white rounded-3xl w-full max-w-lg p-8 shadow-2xl"
                        >
                            <div className="flex justify-between items-center mb-8">
                                <h3 className="text-2xl font-bold text-slate-900">Add Appointment</h3>
                                <button onClick={() => setIsAddingAppointment(false)} className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                            <form onSubmit={handleAddAppointment} className="space-y-6">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Patient Name</label>
                                        <input
                                            type="text"
                                            value={newAppointment.patient_name}
                                            onChange={e => setNewAppointment({ ...newAppointment, patient_name: e.target.value })}
                                            className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-dental-teal/50 focus:border-dental-teal transition-all font-medium"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Phone</label>
                                        <input
                                            type="text"
                                            value={newAppointment.phone_number}
                                            onChange={e => setNewAppointment({ ...newAppointment, phone_number: e.target.value })}
                                            className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-dental-teal/50 focus:border-dental-teal transition-all font-medium"
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Date & Time</label>
                                    <input
                                        type="datetime-local"
                                        value={newAppointment.appointment_time ? newAppointment.appointment_time.slice(0, 16) : ''}
                                        onChange={e => setNewAppointment({ ...newAppointment, appointment_time: new Date(e.target.value).toISOString() })}
                                        className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-dental-teal/50 focus:border-dental-teal transition-all font-medium"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Issue</label>
                                    <input
                                        type="text"
                                        value={newAppointment.issue_description}
                                        onChange={e => setNewAppointment({ ...newAppointment, issue_description: e.target.value })}
                                        className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-dental-teal/50 focus:border-dental-teal transition-all font-medium"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Status</label>
                                    <select
                                        value={newAppointment.status}
                                        onChange={e => setNewAppointment({ ...newAppointment, status: e.target.value })}
                                        className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-dental-teal/50 focus:border-dental-teal transition-all font-medium bg-white"
                                    >
                                        <option value="pending">Pending</option>
                                        <option value="confirmed">Confirmed</option>
                                        <option value="cancelled">Cancelled</option>
                                    </select>
                                </div>
                                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                    <button
                                        type="button"
                                        onClick={() => setIsAddingAppointment(false)}
                                        className="px-6 py-3 text-slate-500 font-bold hover:bg-slate-100 rounded-xl transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-6 py-3 bg-dental-teal text-white font-bold rounded-xl hover:bg-teal-700 transition-colors shadow-lg shadow-dental-teal/20"
                                    >
                                        Add Appointment
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )
            }
        </div >
    );
};

const StatCard = ({ icon, title, value, color }) => (
    <motion.div
        whileHover={{ y: -5 }}
        className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-5 relative overflow-hidden group hover:shadow-xl transition-all duration-300"
    >
        <div className={clsx("absolute left-0 top-0 bottom-0 w-1.5", color)} />
        <div className={clsx(
            "w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm border border-slate-100 group-hover:scale-110 transition-transform duration-300",
            // Using a light background for the icon container
            "bg-slate-50"
        )}>
            {/* Clone icon to set color programmatically if needed, or rely on parent */}
            {React.cloneElement(icon, { className: clsx("w-7 h-7", color.replace('bg-', 'text-')) })}
        </div>
        <div>
            <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">{title}</div>
            <div className="text-3xl font-extrabold text-slate-900 tracking-tight">{value}</div>
        </div>
    </motion.div>
);

export default Dashboard;
