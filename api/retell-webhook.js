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
    const { requested_date, requested_time } = args;

    if (!requested_date || !requested_time) {
        return { available: false, message: 'I need a specific date and time to check.' };
    }

    // 1. Check business hours
    if (!isBusinessHours(requested_date, requested_time)) {
        return { available: false, reason: "Outside of business hours (09:00 - 17:00)" };
    }

    // 2. Check DB
    const timestamp = `${requested_date}T${requested_time}:00`;

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
        return { available: false, reason: "Slot taken" };
    }

    return { available: true };
}

async function bookAppointment(args) {
    const { name, phone, date, time } = args;

    // Robustly extract the issue/reason from various potential keys
    const issueDesc = args.issue || args.reason || args.description || args.notes || args.query || "General Consultation";

    const timestamp = `${date}T${time}:00`;

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
