import {serve} from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

serve(async (req) => {
	if (req.method === 'OPTIONS') {
		return new Response(null, {headers: corsHeaders});
	}

	try {
		const {messages} = await req.json();
		const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

		if (!GEMINI_API_KEY) {
			throw new Error('GEMINI_API_KEY is not configured');
		}

		const userMessage = messages[0].content;

		// Simple request without streaming
		const response = await fetch(
			`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`,
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					contents: [
						{
							parts: [{text: userMessage}]
						}
					]
				})
			}
		);

		if (!response.ok) {
			const errorText = await response.text();
			console.error('Gemini API error:', response.status, errorText);
			return new Response(JSON.stringify({error: `Gemini error: ${response.status}`, details: errorText}), {
				status: 500,
				headers: {...corsHeaders, 'Content-Type': 'application/json'}
			});
		}

		const data = await response.json();
		const aiResponse = data.candidates[0].content.parts[0].text;

		return new Response(JSON.stringify({response: aiResponse, success: true}), {headers: {...corsHeaders, 'Content-Type': 'application/json'}});
	} catch (error) {
		console.error('Error:', error);
		return new Response(JSON.stringify({error: error instanceof Error ? error.message : 'Error desconocido'}), {
			status: 500,
			headers: {...corsHeaders, 'Content-Type': 'application/json'}
		});
	}
});
