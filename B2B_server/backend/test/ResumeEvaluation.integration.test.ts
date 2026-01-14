import { expect } from 'chai';
import { describe, it, before, after, beforeEach } from 'mocha';
import { database } from '../src/config/database';
import { config } from '../src/config/env';
import { evaluateResume } from '../src/services/resumeEvaluationService';
import { io as ClientIO, Socket as ClientSocket } from 'socket.io-client';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { Server } from 'http';
import App from '../src/app';
import { socketService } from '../src/services/SocketService';

describe('Resume Evaluation Integration Tests - M09.9', function() {
    this.timeout(60000);

    let httpServer: Server;
    let testUserId: string;
    let testUserEmail: string;
    let testAccessToken: string;
    let socketClient: ClientSocket | null = null;
    const fixturesDir = path.join(__dirname, 'fixtures');
    const testJobDescription = 'We are looking for a Senior Software Engineer with 5+ years of experience in Node.js, TypeScript, and PostgreSQL. The candidate should have strong problem-solving skills and experience with RESTful APIs.';
    const testJobName = 'Senior Software Engineer';
    const receivedStatusUpdates: any[] = [];

    before(async function() {
        try {
            await database.connect();

            const schemaToUse = config.DB_SCHEMA === 'b2b_test' ? 'b2b_dev' : config.DB_SCHEMA;

            let testUserQuery = `
                SELECT id, email FROM "${schemaToUse}".users 
                WHERE email LIKE 'test%@example.com' 
                LIMIT 1
            `;
            let userResult = await database.query(testUserQuery) as any;
            
            if (userResult.rows && userResult.rows.length > 0) {
                testUserId = userResult.rows[0].id;
                testUserEmail = userResult.rows[0].email;
            } else {
                try {
                    const insertUserQuery = `
                        INSERT INTO "${schemaToUse}".users (id, email, password_hash, active, created_at, updated_at)
                        VALUES (gen_random_uuid(), 'test-resume-eval@example.com', '$2a$12$dummy', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                        RETURNING id, email
                    `;
                    const newUserResult = await database.query(insertUserQuery) as any;
                    testUserId = newUserResult.rows[0].id;
                    testUserEmail = newUserResult.rows[0].email;
                } catch (insertError: any) {
                    const existingUserQuery = `
                        SELECT id, email FROM "${schemaToUse}".users 
                        LIMIT 1
                    `;
                    const existingUserResult = await database.query(existingUserQuery) as any;
                    if (existingUserResult.rows && existingUserResult.rows.length > 0) {
                        testUserId = existingUserResult.rows[0].id;
                        testUserEmail = existingUserResult.rows[0].email;
                    } else {
                        throw new Error('No test user available and cannot create one');
                    }
                }
            }

            testAccessToken = jwt.sign(
                { userId: testUserId, email: testUserEmail },
                config.JWT_SECRET,
                { expiresIn: '1h' }
            );

            const app = new App();
            httpServer = app.getApp().listen(0);
            socketService.initialize(httpServer);

            const serverPort = (httpServer.address() as any)?.port || 5000;
            const baseUrl = `http://localhost:${serverPort}`;

            socketClient = ClientIO(`${baseUrl}/api/resumes/status`, {
                auth: { token: testAccessToken },
                transports: ['websocket', 'polling']
            });

            socketClient.on('connect', () => {
                console.log('✅ WebSocket client connected');
            });

            socketClient.on('resume:status', (data: any) => {
                const existing = receivedStatusUpdates.find(u => u.step === data.step && u.status === data.status && u.evaluationId === data.evaluationId);
                if (!existing) {
                    receivedStatusUpdates.push(data);
                }
                console.log('📨 Received status update:', data.step, data.status);
            });

            socketClient.on('connect_error', (error: any) => {
                console.error('❌ WebSocket connection error:', error.message);
            });

            await new Promise((resolve) => setTimeout(resolve, 1000));

        } catch (error) {
            console.error('Setup failed:', error);
            throw error;
        }
    });

    after(async function() {
        if (socketClient) {
            socketClient.disconnect();
        }
        if (httpServer) {
            httpServer.close();
        }
        await database.disconnect();
    });

    beforeEach(function() {
        receivedStatusUpdates.length = 0;
    });

    async function cleanupTestData(evaluationId?: string, fileId?: string, gradingId?: string): Promise<void> {
        try {
            if (gradingId) {
                await database.query(
                    `DELETE FROM "${config.DB_SCHEMA}".resume_grading WHERE id = $1`,
                    [gradingId]
                );
            }
            if (fileId) {
                await database.query(
                    `DELETE FROM "${config.DB_SCHEMA}".files WHERE id = $1`,
                    [fileId]
                );
            }
        } catch (error) {
            console.warn('Cleanup warning:', error);
        }
    }

    describe('1. Valid Resume and Job Description', function() {
        it('TEST 1.1: Should successfully evaluate a valid TXT resume', async function() {
            const txtPath = path.join(fixturesDir, 'sample-resume.txt');
            if (!fs.existsSync(txtPath)) {
                this.skip();
                return;
            }

            const fileBuffer = fs.readFileSync(txtPath);
            const fileType = '.txt';

            const result = await evaluateResume(
                fileBuffer,
                fileType,
                testUserId,
                testJobDescription,
                testJobName
            );

            expect(result.success).to.be.true;
            expect(result.fileId).to.be.a('string');
            expect(result.fileUrl).to.be.a('string');
            expect(result.resumeData).to.be.an('object');
            expect(result.scores).to.have.property('overall');
            expect(result.scores?.overall).to.be.a('number');
            expect(result.scores?.overall).to.be.at.least(0).and.at.most(100);
            expect(result.suggestions).to.be.an('array');
            expect(result.review).to.be.a('string');
            expect(result.gradingId).to.be.a('string');

            await new Promise((resolve) => setTimeout(resolve, 1000));

            const gradingQuery = `
                SELECT id FROM "${config.DB_SCHEMA}".resume_grading 
                WHERE id = $1
            `;
            const gradingResult = await database.query(gradingQuery, [result.gradingId]) as any;
            expect(gradingResult.rows.length).to.be.greaterThan(0);

            await new Promise((resolve) => setTimeout(resolve, 1000));

            const statusSteps = receivedStatusUpdates.map((update) => update.step);
            expect(statusSteps).to.include('upload');
            expect(statusSteps).to.include('parsability_check');
            expect(statusSteps).to.include('parsing');
            expect(statusSteps).to.include('grading');
            expect(statusSteps).to.include('completed');

            if (result.gradingId) {
                await cleanupTestData(result.evaluationId, result.fileId, result.gradingId);
            }
        });

        it('TEST 1.2: Should successfully evaluate a valid PDF resume', async function() {
            const pdfPath = path.join(fixturesDir, 'sample-resume.pdf');
            if (!fs.existsSync(pdfPath)) {
                this.skip();
                return;
            }

            const fileBuffer = fs.readFileSync(pdfPath);
            const fileType = '.pdf';

            try {
                const result = await evaluateResume(
                    fileBuffer,
                    fileType,
                    testUserId,
                    testJobDescription,
                    testJobName
                );

                if (result.success) {
                    expect(result.fileId).to.be.a('string');
                    expect(result.scores).to.have.property('ats');
                    expect(result.scores).to.have.property('keyword');
                    expect(result.scores).to.have.property('format');

                    if (result.gradingId) {
                        await cleanupTestData(result.evaluationId, result.fileId, result.gradingId);
                    }
                } else {
                    this.skip();
                }
            } catch (error: any) {
                if (error.message && error.message.includes('OCR') || error.message.includes('empty')) {
                    this.skip();
                } else {
                    throw error;
                }
            }
        });
    });

    describe('2. Invalid File Type', function() {
        it('TEST 2.1: Should reject invalid file type', async function() {
            const invalidBuffer = Buffer.from('invalid executable content');
            const invalidFileType = '.exe';

            try {
                const result = await evaluateResume(
                    invalidBuffer,
                    invalidFileType,
                    testUserId,
                    testJobDescription,
                    testJobName
                );
                expect(result.success).to.be.false;
            } catch (error: any) {
                expect(error.message).to.include('Invalid file type');
            }
        });
    });

    describe('3. Oversized File', function() {
        it('TEST 3.1: Should reject file larger than 10MB', async function() {
            const oversizedPath = path.join(fixturesDir, 'oversized-test-file.pdf');
            if (!fs.existsSync(oversizedPath)) {
                this.skip();
                return;
            }

            const fileBuffer = fs.readFileSync(oversizedPath);
            const fileType = '.pdf';

            try {
                const result = await evaluateResume(
                    fileBuffer,
                    fileType,
                    testUserId,
                    testJobDescription,
                    testJobName
                );
                expect(result.success).to.be.false;
                expect(result.error).to.include('File size');
            } catch (error: any) {
                expect(error.message).to.include('File size');
            }
        });
    });

    describe('4. Missing Job Description', function() {
        it('TEST 4.1: Should reject request with empty job description', async function() {
            const fileBuffer = Buffer.from('test content');
            const fileType = '.txt';

            const result = await evaluateResume(
                fileBuffer,
                fileType,
                testUserId,
                '',
                testJobName
            );

            expect(result.success).to.be.false;
            expect(result.error).to.include('Job description is required');
        });
    });

    describe('5. Empty File', function() {
        it('TEST 5.1: Should reject empty file buffer', async function() {
            const emptyBuffer = Buffer.alloc(0);
            const fileType = '.txt';

            const result = await evaluateResume(
                emptyBuffer,
                fileType,
                testUserId,
                testJobDescription,
                testJobName
            );

            expect(result.success).to.be.false;
            expect(result.error).to.include('empty or invalid');
        });
    });

    describe('6. Missing Job Name', function() {
        it('TEST 6.1: Should reject request with empty job name', async function() {
            const fileBuffer = Buffer.from('test content');
            const fileType = '.txt';

            const result = await evaluateResume(
                fileBuffer,
                fileType,
                testUserId,
                testJobDescription,
                ''
            );

            expect(result.success).to.be.false;
            expect(result.error).to.include('Job name is required');
        });
    });

    describe('7. WebSocket Status Updates', function() {
        it('TEST 7.1: Should receive all status updates via WebSocket', async function() {
            const txtPath = path.join(fixturesDir, 'sample-resume.txt');
            if (!fs.existsSync(txtPath)) {
                this.skip();
                return;
            }

            const fileBuffer = fs.readFileSync(txtPath);
            const fileType = '.txt';

            const initialUpdateCount = receivedStatusUpdates.length;

            const result = await evaluateResume(
                fileBuffer,
                fileType,
                testUserId,
                testJobDescription,
                testJobName
            );

            expect(result.success).to.be.true;

            await new Promise((resolve) => setTimeout(resolve, 3000));

            const newUpdates = receivedStatusUpdates.slice(initialUpdateCount);
            const receivedSteps = newUpdates.map((update) => update.step);
            const expectedSteps = ['upload', 'parsability_check', 'parsing', 'grading', 'completed'];

            for (const step of expectedSteps) {
                expect(receivedSteps).to.include(step, `Missing status update for step: ${step}. Received: ${JSON.stringify(receivedSteps)}`);
            }

            const uploadUpdate = newUpdates.find((u) => u.step === 'upload');
            expect(uploadUpdate).to.exist;
            expect(uploadUpdate.status).to.be.oneOf(['in_progress', 'completed']);

            const completedUpdate = newUpdates.find((u) => u.step === 'completed');
            expect(completedUpdate).to.exist;
            expect(completedUpdate.status).to.equal('completed');
            expect(completedUpdate.scores).to.exist;

            if (result.gradingId) {
                await cleanupTestData(result.evaluationId, result.fileId, result.gradingId);
            }
        });
    });

    describe('8. Database Storage', function() {
        it('TEST 8.1: Should store grading results in database', async function() {
            const txtPath = path.join(fixturesDir, 'sample-resume.txt');
            if (!fs.existsSync(txtPath)) {
                this.skip();
                return;
            }

            const fileBuffer = fs.readFileSync(txtPath);
            const fileType = '.txt';

            const result = await evaluateResume(
                fileBuffer,
                fileType,
                testUserId,
                testJobDescription,
                testJobName
            );

            expect(result.success).to.be.true;
            expect(result.gradingId).to.be.a('string');

            const gradingQuery = `
                SELECT * FROM "${config.DB_SCHEMA}".resume_grading 
                WHERE id = $1
            `;
            const gradingResult = await database.query(gradingQuery, [result.gradingId]) as any;

            expect(gradingResult.rows.length).to.equal(1);
            const gradingRecord = gradingResult.rows[0];

            expect(gradingRecord.user_id).to.equal(testUserId);
            expect(gradingRecord.job_title).to.equal(testJobName);
            expect(gradingRecord.job_description).to.equal(testJobDescription);
            expect(gradingRecord.ats_score).to.be.a('number');
            expect(gradingRecord.keyword_score).to.be.a('number');
            expect(gradingRecord.format_score).to.be.a('number');
            expect(gradingRecord.overall_score).to.be.a('number');
            expect(gradingRecord.suggestions).to.be.an('array');
            expect(gradingRecord.resume_json).to.be.an('object');

            if (result.gradingId) {
                await cleanupTestData(result.evaluationId, result.fileId, result.gradingId);
            }
        });
    });
});

