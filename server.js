require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

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
        console.error('Error processing Retell webhook:', error);
        res.status(500).send('Internal Server Error');
    }
});

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
    // Construct timestamp: "YYYY-MM-DDTHH:mm:00" (Assuming local or UTC, keeping simple as per brief)
    // Ideally we handle timezones, but for this brief we'll treat strings as strict matches or ISO
    const timestamp = `${requested_date}T${requested_time}:00`;
    // Note: This matches the exact timestamp. In a real app we might check ranges.

    // Check if any appointment exists at this exact time
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
    const { name, phone, issue, date, time } = args;
    const timestamp = `${date}T${time}:00`;

    console.log('Booking requested:', args);

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
            issue_description: issue,
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
