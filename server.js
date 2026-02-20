import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Supabase Client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Business Hours
const START_HOUR = 9;
const END_HOUR = 17;

// Helper to check if time is within business hours
const isBusinessHours = (dateStr, timeStr) => {
    // timeStr is HH:mm
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours >= START_HOUR && hours < END_HOUR;
};

// POST /vapi-webhook
app.post('/vapi-webhook', async (req, res) => {
    console.log('Received Vapi Request:', JSON.stringify(req.body, null, 2));
    try {
        const { message } = req.body;

        if (message.type === 'tool-calls') {
            const toolCall = message.toolCalls[0];
            const functionName = toolCall.function.name;
            const args = JSON.parse(toolCall.function.arguments);
            let result;

            if (functionName === 'checkAvailability') {
                result = await checkAvailability(args);
            } else if (functionName === 'bookAppointment') {
                result = await bookAppointment(args);
            } else {
                result = { error: 'Unknown function' };
            }

            // Vapi expects a specific response format
            return res.json({
                results: [
                    {
                        toolCallId: toolCall.id,
                        result: JSON.stringify(result)
                    }
                ]
            });
        }

        // Handle other message types if necessary (e.g., transcript) but mission brief focuses on tools.
        res.status(200).send('OK');

    } catch (error) {
        console.error('Error processing webhook:', error);
        res.status(500).send('Internal Server Error');
    }
});

// POST /retell-webhook
app.post('/retell-webhook', async (req, res) => {
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

        res.json(result);

    } catch (error) {
        import('fs').then(fs => fs.writeFileSync('webhook-error.log', String(error.stack || error)));
        console.error('Error processing Retell webhook:', error);
        res.status(500).send('Internal Server Error');
    }
});

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

    // Check if any appointment exists at this exact time
    const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('appointment_time', timestamp);

    if (error) {
        console.error('Database error in checkAvailability:', error);
        return { available: false, reason: "Database error" };
    }

    if (data && data.length > 0) {
        return { available: false, reason: "Slot is already taken." };
    }

    return { available: true };
}

// GET /api/create-web-call
app.get('/api/create-web-call', async (req, res) => {
    try {
        const response = await fetch('https://api.retellai.com/v2/create-web-call', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.RETELL_API_KEY}`
            },
            body: JSON.stringify({
                agent_id: process.env.RETELL_AGENT_ID
            })
        });

        if (!response.ok) {
            throw new Error(`Retell API error: ${response.statusText}`);
        }

        const data = await response.json();
        res.json(data);

    } catch (error) {
        console.error('Error creating web call:', error);
        res.status(500).json({ error: error.message });
    }
});

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

    // Broadcast to the 'demo-room' channel for real-time UI updates
    const channel = supabase.channel('demo-room');
    await channel.send({
        type: 'broadcast',
        event: 'new_booking',
        payload: {
            id: `demo-${Date.now()}`,
            patient_name: name,
            phone_number: phone,
            issue_description: issue,
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

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
