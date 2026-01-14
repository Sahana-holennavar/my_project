import { expect } from 'chai';
import { describe, it, before, after, beforeEach } from 'mocha';
import * as sinon from 'sinon';
import * as resumeEvaluationService from '../src/services/resumeEvaluationService';
import * as resumeUploadService from '../src/services/resumeUploadService';
import * as ocrService from '../src/services/ocrService';
import * as resumeParseService from '../src/services/resumeParseService';
import * as resumeGradingService from '../src/services/resumeGradingService';
import * as socketServiceModule from '../src/services/SocketService';
import * as databaseModule from '../src/config/database';
import fs from 'fs';
import path from 'path';

describe('Resume Evaluation Unit Tests - M09.9', function() {
    this.timeout(5000);

    let sandbox: sinon.SinonSandbox;
    const fixturesDir = path.join(__dirname, 'fixtures');
    const testUserId = '123e4567-e89b-12d3-a456-426614174000';
    const testJobDescription = 'We are looking for a Senior Software Engineer with 5+ years of experience in Node.js, TypeScript, and PostgreSQL.';
    const testJobName = 'Senior Software Engineer';

    before(function() {
        sandbox = sinon.createSandbox();
    });

    after(function() {
        sandbox.restore();
    });

    beforeEach(function() {
        sandbox.restore();
        sandbox.stub(databaseModule.database, 'query').resolves({
            rows: [{ id: '123e4567-e89b-12d3-a456-426614174001' }]
        } as any);
    });

    describe('1. Valid Resume and Job Description', function() {
        it('TEST 1.1: Should successfully evaluate a valid PDF resume', async function() {
            const pdfPath = path.join(fixturesDir, 'sample-resume.pdf');
            if (!fs.existsSync(pdfPath)) {
                this.skip();
                return;
            }

            const fileBuffer = fs.readFileSync(pdfPath);
            const fileType = '.pdf';

            sandbox.stub(resumeUploadService, 'uploadResumeFile').resolves({
                success: true,
                fileId: 'test-file-id',
                fileUrl: 'https://s3.amazonaws.com/test-bucket/test-file.pdf'
            });

            sandbox.stub(resumeUploadService, 'checkParsability').resolves({
                isParsable: true,
                fileCategory: 'pdf',
                message: 'File is directly parsable'
            });

            sandbox.stub(resumeParseService, 'parseResume').resolves({
                success: true,
                parsedData: {
                    personalInfo: {
                        name: 'John Doe',
                        email: 'john.doe@example.com',
                        phone: '+1-555-0123'
                    },
                    experience: [],
                    education: [],
                    skills: ['Node.js', 'TypeScript'],
                    rawText: 'Test resume content'
                }
            });

            sandbox.stub(resumeGradingService, 'gradeResumeWithGeminiEmbeddingGapAnalysis').resolves({
                scores: {
                    overall: 85,
                    ats: 80,
                    keyword: 90,
                    format: 85,
                    experience: 80
                },
                reviewText: 'Good resume with relevant experience.',
                suggestions: [
                    {
                        id: 's_001',
                        title: 'Add more technical skills',
                        description: 'Add more technical skills to improve keyword matching',
                        category: 'skills',
                        priority: 3
                    }
                ]
            });

            sandbox.stub(socketServiceModule.socketService, 'sendResumeStatus').returns();

            const result = await resumeEvaluationService.evaluateResume(
                fileBuffer,
                fileType,
                testUserId,
                testJobDescription,
                testJobName
            );

            expect(result.success).to.be.true;
            expect(result.fileId).to.equal('test-file-id');
            expect(result.scores).to.have.property('overall');
            expect(result.scores?.overall).to.be.a('number');
            expect(result.suggestions).to.be.an('array');
            expect(result.review).to.be.a('string');
        });

        it('TEST 1.2: Should successfully evaluate a valid TXT resume', async function() {
            const txtPath = path.join(fixturesDir, 'sample-resume.txt');
            if (!fs.existsSync(txtPath)) {
                this.skip();
                return;
            }

            const fileBuffer = fs.readFileSync(txtPath);
            const fileType = '.txt';

            sandbox.stub(resumeUploadService, 'uploadResumeFile').resolves({
                success: true,
                fileId: 'test-file-id-txt',
                fileUrl: 'https://s3.amazonaws.com/test-bucket/test-file.txt'
            });

            sandbox.stub(resumeUploadService, 'checkParsability').resolves({
                isParsable: true,
                fileCategory: 'pdf',
                message: 'File is directly parsable'
            });

            sandbox.stub(resumeParseService, 'parseResume').resolves({
                success: true,
                parsedData: {
                    personalInfo: {
                        name: 'John Doe',
                        email: 'john.doe@example.com'
                    },
                    experience: [],
                    education: [],
                    skills: [],
                    rawText: fileBuffer.toString()
                }
            });

            sandbox.stub(resumeGradingService, 'gradeResumeWithGeminiEmbeddingGapAnalysis').resolves({
                scores: {
                    overall: 75,
                    ats: 70,
                    keyword: 80,
                    format: 75
                },
                reviewText: 'Resume parsed successfully.',
                suggestions: []
            });

            sandbox.stub(socketServiceModule.socketService, 'sendResumeStatus').returns();

            const result = await resumeEvaluationService.evaluateResume(
                fileBuffer,
                fileType,
                testUserId,
                testJobDescription,
                testJobName
            );

            expect(result.success).to.be.true;
            expect(result.fileId).to.equal('test-file-id-txt');
        });
    });

    describe('2. Invalid File Type', function() {
        it('TEST 2.1: Should reject invalid file type', async function() {
            const invalidBuffer = Buffer.from('invalid file content');
            const invalidFileType = '.exe';

            sandbox.stub(resumeUploadService, 'uploadResumeFile').rejects(new Error('Invalid file type. Allowed types: .pdf, .doc, .docx, .txt, .jpg, .jpeg, .png'));

            const result = await resumeEvaluationService.evaluateResume(
                invalidBuffer,
                invalidFileType,
                testUserId,
                testJobDescription,
                testJobName
            );

            expect(result.success).to.be.false;
            expect(result.error).to.include('Invalid file type');
        });
    });

    describe('3. Oversized File', function() {
        it('TEST 3.1: Should reject file larger than 10MB', async function() {
            const oversizedBuffer = Buffer.alloc(11 * 1024 * 1024);
            const fileType = '.pdf';

            sandbox.stub(resumeUploadService, 'uploadResumeFile').rejects(new Error('File size must be less than 10MB'));

            const result = await resumeEvaluationService.evaluateResume(
                oversizedBuffer,
                fileType,
                testUserId,
                testJobDescription,
                testJobName
            );

            expect(result.success).to.be.false;
            expect(result.error).to.include('File size');
        });
    });

    describe('4. Missing Job Description', function() {
        it('TEST 4.1: Should reject request with empty job description', async function() {
            const fileBuffer = Buffer.from('test content');
            const fileType = '.pdf';

            const result = await resumeEvaluationService.evaluateResume(
                fileBuffer,
                fileType,
                testUserId,
                '',
                testJobName
            );

            expect(result.success).to.be.false;
            expect(result.error).to.include('Job description is required');
        });

        it('TEST 4.2: Should reject request with missing job description', async function() {
            const fileBuffer = Buffer.from('test content');
            const fileType = '.pdf';

            const result = await resumeEvaluationService.evaluateResume(
                fileBuffer,
                fileType,
                testUserId,
                '   ',
                testJobName
            );

            expect(result.success).to.be.false;
            expect(result.error).to.include('Job description is required');
        });
    });

    describe('5. Empty File', function() {
        it('TEST 5.1: Should reject empty file buffer', async function() {
            const emptyBuffer = Buffer.alloc(0);
            const fileType = '.pdf';

            const result = await resumeEvaluationService.evaluateResume(
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
            const fileType = '.pdf';

            const result = await resumeEvaluationService.evaluateResume(
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

    describe('7. OCR Flow', function() {
        it('TEST 7.1: Should trigger OCR for non-parsable image file', async function() {
            const imageBuffer = Buffer.from('fake image content');
            const fileType = '.jpg';

            sandbox.stub(resumeUploadService, 'uploadResumeFile').resolves({
                success: true,
                fileId: 'test-file-id',
                fileUrl: 'https://s3.amazonaws.com/test-bucket/test-file.jpg'
            });

            sandbox.stub(resumeUploadService, 'checkParsability').resolves({
                isParsable: false,
                fileCategory: 'image',
                message: 'File requires OCR'
            });

            const ocrStub = sandbox.stub(ocrService, 'extractTextWithOCR').resolves({
                success: true,
                extractedText: 'Extracted text from image via OCR',
                fileType: 'image',
                processingTimeMs: 1000,
                message: 'OCR extraction completed successfully'
            });

            sandbox.stub(resumeParseService, 'parseResume').resolves({
                success: true,
                parsedData: {
                    personalInfo: {},
                    experience: [],
                    education: [],
                    skills: [],
                    rawText: 'Extracted text from image via OCR'
                }
            });

            sandbox.stub(resumeGradingService, 'gradeResumeWithGeminiEmbeddingGapAnalysis').resolves({
                scores: {
                    overall: 70,
                    ats: 65,
                    keyword: 75,
                    format: 70
                },
                reviewText: 'Resume processed via OCR.',
                suggestions: []
            });

            sandbox.stub(socketServiceModule.socketService, 'sendResumeStatus').returns();

            const result = await resumeEvaluationService.evaluateResume(
                imageBuffer,
                fileType,
                testUserId,
                testJobDescription,
                testJobName
            );

            expect(result.success).to.be.true;
            expect(ocrStub.calledOnce).to.be.true;
        });
    });

    describe('8. Error Handling', function() {
        it('TEST 8.1: Should handle upload failure gracefully', async function() {
            const fileBuffer = Buffer.from('test content');
            const fileType = '.pdf';

            sandbox.stub(resumeUploadService, 'uploadResumeFile').rejects(new Error('S3 upload failed'));

            const result = await resumeEvaluationService.evaluateResume(
                fileBuffer,
                fileType,
                testUserId,
                testJobDescription,
                testJobName
            );

            expect(result.success).to.be.false;
            expect(result.error).to.include('S3 upload failed');
        });

        it('TEST 8.2: Should handle parsing failure gracefully', async function() {
            const fileBuffer = Buffer.from('test content');
            const fileType = '.pdf';

            sandbox.stub(resumeUploadService, 'uploadResumeFile').resolves({
                success: true,
                fileId: 'test-file-id',
                fileUrl: 'https://s3.amazonaws.com/test-bucket/test-file.pdf'
            });

            sandbox.stub(resumeUploadService, 'checkParsability').resolves({
                isParsable: true,
                fileCategory: 'pdf',
                message: 'File is directly parsable'
            });

            sandbox.stub(resumeParseService, 'parseResume').rejects(new Error('Failed to parse resume'));

            const result = await resumeEvaluationService.evaluateResume(
                fileBuffer,
                fileType,
                testUserId,
                testJobDescription,
                testJobName
            );

            expect(result.success).to.be.false;
            expect(result.error).to.include('Failed to parse resume');
        });

        it('TEST 8.3: Should handle grading failure gracefully', async function() {
            const fileBuffer = Buffer.from('test content');
            const fileType = '.pdf';

            sandbox.stub(resumeUploadService, 'uploadResumeFile').resolves({
                success: true,
                fileId: 'test-file-id',
                fileUrl: 'https://s3.amazonaws.com/test-bucket/test-file.pdf'
            });

            sandbox.stub(resumeUploadService, 'checkParsability').resolves({
                isParsable: true,
                fileCategory: 'pdf',
                message: 'File is directly parsable'
            });

            sandbox.stub(resumeParseService, 'parseResume').resolves({
                success: true,
                parsedData: {
                    personalInfo: {},
                    experience: [],
                    education: [],
                    skills: [],
                    rawText: 'Test content'
                }
            });

            sandbox.stub(resumeGradingService, 'gradeResumeWithGeminiEmbeddingGapAnalysis').rejects(new Error('Gemini API error'));

            const result = await resumeEvaluationService.evaluateResume(
                fileBuffer,
                fileType,
                testUserId,
                testJobDescription,
                testJobName
            );

            expect(result.success).to.be.false;
            expect(result.error).to.include('Gemini API error');
        });
    });
});

