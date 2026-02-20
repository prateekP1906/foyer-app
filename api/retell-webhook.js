import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

// Business Hours Helpers
const START_HOUR = 9;
const END_HOUR = 17;

const isBusinessHours = (dateStr, timeStr) => {
    // timeStr is HH:mm
    if (!timeStr) return false;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours >= START_HOUR && hours < END_HOUR;
};

async function checkAvailability(args) {
    const requested_date = args.requested_date || args.date;
    let requested_time = args.requested_time || args.time;

    if (!requested_date || !requested_time) {
        return { available: false, message: 'I need a specific date and time to check.' };
    }

    // Clean up time (e.g. from "10:30 AM" to "10:30")
    let timeMatch = requested_time.match(/(\d+):?(\d*)\s*(am|pm|a|p)?/i);
    let hours = 9, minutes = 0;
    if (timeMatch) {
        hours = parseInt(timeMatch[1], 10);
        minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
        let ampm = timeMatch[3] ? timeMatch[3].toLowerCase() : null;
        if (ampm && ampm.startsWith('p') && hours < 12) hours += 12;
        if (ampm && ampm.startsWith('a') && hours === 12) hours = 0;
    }
    const hh = String(hours).padStart(2, '0');
    const mm = String(minutes).padStart(2, '0');
    requested_time = `${hh}:${mm}`;

    // 1. Check business hours
    if (!isBusinessHours(requested_date, requested_time)) {
        return { available: false, reason: "Outside of business hours (09:00 - 17:00)" };
    }

    // 2. Check DB
    const timestamp = `${requested_date}T${hh}:${mm}:00`;

    if (!supabase) return { available: false, reason: "Database connection failed" };

    const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('appointment_time', timestamp);

    if (error) {
        console.error('Database error:', error);
        return { available: false, reason: "Database error" };
    }

    if (data && data.length > 0) {
        return { available: false, reason: "Slot is already taken." };
    }

    return { available: true };
}

async function bookAppointment(args) {
    const name = args.name || args.patient_name || args.userName || "Unknown";
    const phone = args.phone || args.phone_number || args.phoneNumber || "Unknown";
    const date = args.date || args.requested_date;
    let time = args.time || args.requested_time;

    // Robustly extract the issue/reason from various potential keys
    const issueDesc = args.issue || args.reason || args.description || args.notes || args.query || "General Consultation";

    // Clean up time format
    let timeMatch = time ? time.match(/(\d+):?(\d*)\s*(am|pm|a|p)?/i) : null;
    let hours = 9, minutes = 0;
    if (timeMatch) {
        hours = parseInt(timeMatch[1], 10);
        minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
        let ampm = timeMatch[3] ? timeMatch[3].toLowerCase() : null;
        if (ampm && ampm.startsWith('p') && hours < 12) hours += 12;
        if (ampm && ampm.startsWith('a') && hours === 12) hours = 0;
    }
    const hh = String(hours).padStart(2, '0');
    const mm = String(minutes).padStart(2, '0');

    const timestamp = `${date}T${hh}:${mm}:00`;

    console.log('Booking requested:', args);
    console.log('Extracted issue description:', issueDesc);

    if (!supabase) return { success: false, message: "Database connection failed" };

    // Broadcast to the 'demo-room' channel for real-time UI updates
    const channel = supabase.channel('demo-room');
    await channel.send({
        type: 'broadcast',
        event: 'new_booking',
        payload: {
            id: `demo-${Date.now()}`,
            patient_name: name,
            phone_number: phone,
            issue_description: issueDesc,
            appointment_time: timestamp,
            status: 'confirmed'
        }
    });

    // Insert into database
    const { error } = await supabase
        .from('appointments')
        .insert([{
            patient_name: name,
            phone_number: phone,
            issue_description: issueDesc,
            appointment_time: timestamp,
            status: 'confirmed'
        }]);

    if (error) {
        console.error('Error inserting appointment:', error);
        return { success: false, message: "Failed to save appointment" };
    }

    return { success: true, message: `Booked for ${time}` };
}

export default async function handler(req, res) {
    // Enable CORS just in case, though usually webhooks are S2S
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    console.log('Received Retell Request:', JSON.stringify(req.body, null, 2));

    try {
        const { args, name } = req.body;
        let result;

        if (name === 'checkAvailability') {
            result = await checkAvailability(args);
        } else if (name === 'bookAppointment') {
            result = await bookAppointment(args);
        } else {
            result = { error: 'Unknown function' };
        }

        res.status(200).json(result);

    } catch (error) {
        console.error('Error processing Retell webhook:', error);
        res.status(500).send('Internal Server Error');
    }
}
