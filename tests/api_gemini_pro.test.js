const request = require('supertest');

// Load environment variables for the port
require('dotenv').config({ path: './.env' }); // Ensure dotenv loads from the correct path for tests

const BASE_URL = `http://localhost:${process.env.PORT || 3001}`;

describe('Gemini Pro API Endpoint (/interview-gemini-pro)', () => {
    // Helper to generate unique session IDs for each test to prevent history bleeding
    const generateUniqueSessionId = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    it('should confirm the server is reachable', async () => {
        try {
            const res = await request(BASE_URL).post('/interview-gemini-pro').send({
                sessionId: generateUniqueSessionId('health-check-pro'),
                jobTitle: 'Test Job Pro',
                userResponse: 'ping'
            });
            expect(res.statusCode).toBeGreaterThanOrEqual(200); // Expecting 200 or 500 if AI fails, but server is up
        } catch (error) {
            console.error("Server might not be running or is unreachable for /interview-gemini-pro endpoint:", error.message);
            fail(error); // Fail the test explicitly if server is unreachable
        }
    }, 10000); // Increased timeout for server reachability check

    // --- /interview-gemini-pro (Gemini Pro) Specific Tests ---
    describe('Functionality of /interview-gemini-pro (Gemini Pro)', () => {
        it('should respond with a 200 status and valid AI response for initial request', async () => {
            const sessionId = generateUniqueSessionId('pro-initial');
            const res = await request(BASE_URL)
                .post('/interview-gemini-pro')
                .send({
                    sessionId: sessionId,
                    jobTitle: 'Software Engineer',
                    userResponse: "start interview" // Initial prompt
                });

            console.log('Gemini Pro Initial Response:', res.body);

            expect(res.statusCode).toEqual(200);
            expect(res.body).toHaveProperty('response');
            expect(typeof res.body.response).toBe('string');
            expect(res.body.response.length).toBeGreaterThan(0);
            expect(res.body).toHaveProperty('history');
            expect(Array.isArray(res.body.history)).toBe(true);
            expect(res.body.history.length).toBeGreaterThanOrEqual(1); // Expect at least one turn
        }, 20000); // Increased timeout

        it('should respond with a 200 status and valid AI response for follow-up request', async () => {
            const sessionId = generateUniqueSessionId('pro-followup');
            const jobTitle = 'Software Engineer';
            const initialUserResponse = "start interview";
            const followUpUserResponse = 'I have 5 years of experience in JavaScript.';

            // First, send the initial "start interview" to establish history
            await request(BASE_URL)
                .post('/interview-gemini-pro')
                .send({
                    sessionId: sessionId,
                    jobTitle: jobTitle,
                    userResponse: initialUserResponse
                });

            // Now send the actual follow-up user response using the same session ID
            const res = await request(BASE_URL)
                .post('/interview-gemini-pro')
                .send({
                    sessionId: sessionId,
                    jobTitle: jobTitle,
                    userResponse: followUpUserResponse
                });

            console.log('Gemini Pro Follow-up Response:', res.body);

            expect(res.statusCode).toEqual(200);
            expect(res.body).toHaveProperty('response');
            expect(typeof res.body.response).toBe('string');
            expect(res.body.response.length).toBeGreaterThan(0);
            expect(res.body).toHaveProperty('history');
            expect(Array.isArray(res.body.history)).toBe(true);
            expect(res.body.history.length).toBeGreaterThanOrEqual(3); // Initial user + model, then follow-up user + model
        }, 20000); // Increased timeout

        it('should return 400 if required fields are missing in /interview-gemini-pro', async () => {
            const res = await request(BASE_URL)
                .post('/interview-gemini-pro')
                .send({ jobTitle: 'Software Engineer' }); // Missing sessionId and userResponse

            expect(res.statusCode).toEqual(400);
            expect(res.body).toHaveProperty('error');
            expect(res.body.error).toContain('Missing sessionId, jobTitle, or userResponse');
        }, 10000);
    });
});
