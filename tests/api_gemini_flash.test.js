const request = require('supertest');

// Load environment variables for the port
require('dotenv').config({ path: './.env' }); // Ensure dotenv loads from the correct path for tests

const BASE_URL = `http://localhost:${process.env.PORT || 3001}`;

describe('Gemini 1.5 Flash API Endpoint (/interview)', () => {

    // Helper to generate unique session IDs for each test to prevent history bleeding
    const generateUniqueSessionId = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    it('should confirm the server is reachable', async () => {
        try {
            // A simple request to any endpoint to check if the server is up
            // Using /interview endpoint with minimal valid data
            const res = await request(BASE_URL).post('/interview').send({
                sessionId: generateUniqueSessionId('health-check'),
                jobTitle: 'Test Job',
                userResponse: 'ping'
            });
            expect(res.statusCode).toBeGreaterThanOrEqual(200); // Expecting 200 or 500 if AI fails, but server is up
        } catch (error) {
            console.error("Server might not be running or is unreachable for /interview endpoint:", error.message);
            fail(error); // Fail the test explicitly if server is unreachable
        }
    }, 10000); // Increased timeout for server reachability check

    // --- /interview (Gemini 1.5 Flash) Specific Tests ---
    describe('Functionality of /interview (Gemini 1.5 Flash)', () => {
        it('should respond with a 200 status and valid AI response for initial request', async () => {
            const sessionId = generateUniqueSessionId('flash-initial');
            const res = await request(BASE_URL)
                .post('/interview')
                .send({
                    sessionId: sessionId,
                    jobTitle: 'Software Engineer',
                    userResponse: "start interview" // Initial prompt
                });

            console.log('Gemini 1.5 Flash Initial Response:', res.body);

            expect(res.statusCode).toEqual(200);
            expect(res.body).toHaveProperty('response');
            expect(typeof res.body.response).toBe('string');
            expect(res.body.response.length).toBeGreaterThan(0);
            expect(res.body).toHaveProperty('history');
            expect(Array.isArray(res.body.history)).toBe(true);
            expect(res.body.history.length).toBeGreaterThanOrEqual(1); // Expect at least one turn
        }, 20000); // Increased timeout for AI response

        it('should respond with a 200 status and valid AI response for follow-up request', async () => {
            const sessionId = generateUniqueSessionId('flash-followup');
            const jobTitle = 'Software Engineer';
            const initialUserResponse = "start interview";
            const followUpUserResponse = 'Hello, I am interested in this position.';

            // First, send the initial "start interview" to establish history
            await request(BASE_URL)
                .post('/interview')
                .send({
                    sessionId: sessionId,
                    jobTitle: jobTitle,
                    userResponse: initialUserResponse
                });

            // Now send the actual follow-up user response using the same session ID
            const res = await request(BASE_URL)
                .post('/interview')
                .send({
                    sessionId: sessionId,
                    jobTitle: jobTitle,
                    userResponse: followUpUserResponse
                });

            console.log('Gemini 1.5 Flash Follow-up Response:', res.body);

            expect(res.statusCode).toEqual(200);
            expect(res.body).toHaveProperty('response');
            expect(typeof res.body.response).toBe('string');
            expect(res.body.response.length).toBeGreaterThan(0);
            expect(res.body).toHaveProperty('history');
            expect(Array.isArray(res.body.history)).toBe(true);
            expect(res.body.history.length).toBeGreaterThanOrEqual(3); // Initial user + model, then follow-up user + model
        }, 20000); // Increased timeout

        it('should return 400 if required fields are missing in /interview', async () => {
            const res = await request(BASE_URL)
                .post('/interview')
                .send({ sessionId: generateUniqueSessionId('flash-missing-test') }); // Missing jobTitle and userResponse

            expect(res.statusCode).toEqual(400);
            expect(res.body).toHaveProperty('error');
            expect(res.body.error).toContain('Missing sessionId, jobTitle, or userResponse');
        }, 10000);
    });
});
