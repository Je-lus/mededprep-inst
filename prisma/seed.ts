/**
 * Seed script — creates demo organization, users, students, question banks,
 * assessments with responses, sessions with attendees, and bug reports.
 *
 * Usage: tsx prisma/seed.ts
 * Credentials: admin@demo.org / password123
 *              instructor@demo.org / password123
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.info('Seeding database...');

  // ─── Organization ───────────────────────────────────────────────────────────
  const org = await prisma.organization.upsert({
    where: { slug: 'demo' },
    update: {},
    create: {
      name: 'Demo Organization',
      slug: 'demo',
      subdomain: 'demo.mededprep.app',
    },
  });
  console.info(`  Organization: ${org.name} (${org.slug})`);

  // ─── Cleanup existing seed data ────────────────────────────────────────────
  await prisma.assessmentResponse.deleteMany({ where: { assessment: { orgId: org.id } } });
  await prisma.assessment.deleteMany({ where: { orgId: org.id } });
  await prisma.questionBankItem.deleteMany({ where: { bank: { orgId: org.id } } });
  await prisma.questionBank.deleteMany({ where: { orgId: org.id } });
  await prisma.sessionAttendee.deleteMany({ where: { session: { orgId: org.id } } });
  await prisma.session.deleteMany({ where: { orgId: org.id } });
  await prisma.bugReport.deleteMany({ where: { orgId: org.id } });
  await prisma.student.deleteMany({ where: { orgId: org.id } });
  await prisma.orgUser.deleteMany({ where: { orgId: org.id } });
  console.info('  Cleaned up existing seed data');

  // ─── Admin Users ────────────────────────────────────────────────────────────
  const password = await bcrypt.hash('password123', 12);

  const admin = await prisma.orgUser.create({
    data: {
      orgId: org.id,
      email: 'admin@demo.org',
      password,
      name: 'Admin User',
      role: 'owner',
    },
  });
  console.info(`  Admin: ${admin.email} / password123`);

  const instructor = await prisma.orgUser.create({
    data: {
      orgId: org.id,
      email: 'instructor@demo.org',
      password,
      name: 'Sarah Martinez',
      role: 'admin',
    },
  });
  console.info(`  Instructor: ${instructor.email} / password123`);

  // ─── Students ───────────────────────────────────────────────────────────────
  const studentPassword = await bcrypt.hash('password123', 12);
  const studentData = [
    {
      firstName: 'James',
      lastName: 'Wilson',
      email: 'jwilson@student.demo.org',
      hasPassword: true,
    },
    {
      firstName: 'Maria',
      lastName: 'Garcia',
      email: 'mgarcia@student.demo.org',
      hasPassword: true,
    },
    { firstName: 'David', lastName: 'Chen', email: 'dchen@student.demo.org', hasPassword: true },
    {
      firstName: 'Ashley',
      lastName: 'Johnson',
      email: 'ajohnson@student.demo.org',
      hasPassword: true,
    },
    { firstName: 'Tyler', lastName: 'Brown', email: 'tbrown@student.demo.org', hasPassword: false },
    { firstName: 'Rachel', lastName: 'Kim', email: 'rkim@student.demo.org', hasPassword: false },
    {
      firstName: 'Marcus',
      lastName: 'Thompson',
      email: 'mthompson@student.demo.org',
      hasPassword: false,
    },
    { firstName: 'Emily', lastName: 'Davis', email: 'edavis@student.demo.org', hasPassword: true },
  ];

  const students = await Promise.all(
    studentData.map((s) =>
      prisma.student.create({
        data: {
          orgId: org.id,
          firstName: s.firstName,
          lastName: s.lastName,
          email: s.email,
          password: s.hasPassword ? studentPassword : null,
        },
      }),
    ),
  );
  console.info(`  Students: ${students.length} created`);

  // ─── Question Banks ─────────────────────────────────────────────────────────
  const emtBank = await prisma.questionBank.create({
    data: {
      orgId: org.id,
      createdById: admin.id,
      title: 'EMT Chapter 1-5 Review',
      description: 'Review questions covering EMT-Basic chapters 1 through 5.',
      subject: 'EMT-Basic',
    },
  });

  const emtBankItems = [
    {
      type: 'radiogroup',
      name: 'emtb_ch1_q1',
      title: 'Which of the following best describes the role of an EMT?',
      choices: [
        { value: 'A', text: 'Performing advanced surgical procedures in the field' },
        { value: 'B', text: 'Providing basic emergency medical care and transportation' },
        { value: 'C', text: 'Prescribing medications for chronic conditions' },
        { value: 'D', text: 'Conducting diagnostic imaging studies' },
      ],
      correctAnswer: 'B',
      metadata: {
        chapter: '1',
        difficulty: 1,
        explanation:
          'EMTs provide basic emergency medical care and transportation of the sick and injured.',
      },
    },
    {
      type: 'radiogroup',
      name: 'emtb_ch1_q2',
      title: 'The "D" in the ABCDs of emergency care stands for:',
      choices: [
        { value: 'A', text: 'Defibrillation' },
        { value: 'B', text: 'Disability' },
        { value: 'C', text: 'Diagnosis' },
        { value: 'D', text: 'Documentation' },
      ],
      correctAnswer: 'A',
      metadata: {
        chapter: '1',
        difficulty: 2,
        explanation: 'The ABCDs stand for Airway, Breathing, Circulation, and Defibrillation.',
      },
    },
    {
      type: 'radiogroup',
      name: 'emtb_ch2_q1',
      title: 'Informed consent must include all of the following EXCEPT:',
      choices: [
        { value: 'A', text: 'The nature of the illness or injury' },
        { value: 'B', text: 'The treatment to be provided' },
        { value: 'C', text: 'The cost of the ambulance transport' },
        { value: 'D', text: 'Risks associated with the treatment' },
      ],
      correctAnswer: 'C',
      metadata: {
        chapter: '2',
        difficulty: 2,
        explanation:
          'Informed consent requires explaining the condition, treatment, and risks. Cost is not a component.',
      },
    },
    {
      type: 'radiogroup',
      name: 'emtb_ch2_q2',
      title: 'A DNR order means the EMT should:',
      choices: [
        { value: 'A', text: 'Not respond to the call' },
        { value: 'B', text: 'Not attempt resuscitation if the patient is in cardiac arrest' },
        { value: 'C', text: 'Not transport the patient to the hospital' },
        { value: 'D', text: 'Not provide any care to the patient' },
      ],
      correctAnswer: 'B',
      metadata: {
        chapter: '2',
        difficulty: 3,
        explanation:
          'A DNR (Do Not Resuscitate) order means the EMT should not attempt resuscitation in cardiac arrest.',
      },
    },
    {
      type: 'radiogroup',
      name: 'emtb_ch3_q1',
      title: 'The most serious form of external bleeding is:',
      choices: [
        { value: 'A', text: 'Capillary bleeding' },
        { value: 'B', text: 'Venous bleeding' },
        { value: 'C', text: 'Arterial bleeding' },
        { value: 'D', text: 'Subcutaneous bleeding' },
      ],
      correctAnswer: 'C',
      metadata: {
        chapter: '3',
        difficulty: 1,
        explanation:
          'Arterial bleeding is the most serious because blood is under high pressure and can be lost rapidly.',
      },
    },
    {
      type: 'radiogroup',
      name: 'emtb_ch3_q2',
      title: 'Which method is the first step in controlling external bleeding?',
      choices: [
        { value: 'A', text: 'Apply a tourniquet' },
        { value: 'B', text: 'Direct pressure' },
        { value: 'C', text: 'Elevation' },
        { value: 'D', text: 'Pressure points' },
      ],
      correctAnswer: 'B',
      metadata: {
        chapter: '3',
        difficulty: 1,
        explanation: 'Direct pressure is always the first step in controlling external bleeding.',
      },
    },
    {
      type: 'radiogroup',
      name: 'emtb_ch4_q1',
      title: 'An adult patient is breathing at a rate of 8 breaths per minute. This is considered:',
      choices: [
        { value: 'A', text: 'Normal' },
        { value: 'B', text: 'Tachypnea' },
        { value: 'C', text: 'Bradypnea' },
        { value: 'D', text: 'Apnea' },
      ],
      correctAnswer: 'C',
      metadata: {
        chapter: '4',
        difficulty: 2,
        explanation:
          'Bradypnea is an abnormally slow breathing rate. Normal adult rate is 12-20 breaths/min.',
      },
    },
    {
      type: 'radiogroup',
      name: 'emtb_ch4_q2',
      title: 'The trachea divides into the right and left mainstem bronchi at the:',
      choices: [
        { value: 'A', text: 'Larynx' },
        { value: 'B', text: 'Carina' },
        { value: 'C', text: 'Cricoid' },
        { value: 'D', text: 'Epiglottis' },
      ],
      correctAnswer: 'B',
      metadata: {
        chapter: '4',
        difficulty: 3,
        explanation:
          'The carina is the point where the trachea divides into the right and left mainstem bronchi.',
      },
    },
    {
      type: 'radiogroup',
      name: 'emtb_ch5_q1',
      title: 'Pulse oximetry measures:',
      choices: [
        { value: 'A', text: 'Blood pressure' },
        { value: 'B', text: 'Carbon dioxide levels' },
        { value: 'C', text: 'Oxygen saturation of hemoglobin' },
        { value: 'D', text: 'Heart rate only' },
      ],
      correctAnswer: 'C',
      metadata: {
        chapter: '5',
        difficulty: 1,
        explanation:
          'Pulse oximetry measures the percentage of hemoglobin saturated with oxygen (SpO2).',
      },
    },
    {
      type: 'radiogroup',
      name: 'emtb_ch5_q2',
      title: 'Normal blood oxygen saturation (SpO2) for a healthy adult is:',
      choices: [
        { value: 'A', text: '85-90%' },
        { value: 'B', text: '90-94%' },
        { value: 'C', text: '95-100%' },
        { value: 'D', text: '80-85%' },
      ],
      correctAnswer: 'C',
      metadata: {
        chapter: '5',
        difficulty: 1,
        explanation: 'Normal SpO2 for a healthy adult is 95-100%. Below 94% may indicate hypoxia.',
      },
    },
  ];

  await prisma.questionBankItem.createMany({
    data: emtBankItems.map((q) => ({
      bankId: emtBank.id,
      questionData: {
        type: q.type,
        name: q.name,
        title: q.title,
        isRequired: true,
        choices: q.choices,
        correctAnswer: q.correctAnswer,
        metadata: q.metadata,
      },
      tags: [q.metadata.chapter ? `chapter-${q.metadata.chapter}` : ''],
    })),
  });

  const aemtBank = await prisma.questionBank.create({
    data: {
      orgId: org.id,
      createdById: instructor.id,
      title: 'AEMT Pharmacology',
      description: 'Advanced EMT pharmacology review questions.',
      subject: 'AEMT',
    },
  });

  const aemtBankItems = [
    {
      type: 'radiogroup',
      name: 'aemt_pharm_q1',
      title: 'The generic name for Benadryl is:',
      choices: [
        { value: 'A', text: 'Epinephrine' },
        { value: 'B', text: 'Diphenhydramine' },
        { value: 'C', text: 'Albuterol' },
        { value: 'D', text: 'Naloxone' },
      ],
      correctAnswer: 'B',
      metadata: {
        chapter: 'Pharmacology',
        difficulty: 1,
        explanation: 'Diphenhydramine is the generic name for Benadryl, an antihistamine.',
      },
    },
    {
      type: 'radiogroup',
      name: 'aemt_pharm_q2',
      title: 'The correct dose of epinephrine via auto-injector for an adult is:',
      choices: [
        { value: 'A', text: '0.15 mg' },
        { value: 'B', text: '0.3 mg' },
        { value: 'C', text: '0.5 mg' },
        { value: 'D', text: '1.0 mg' },
      ],
      correctAnswer: 'B',
      metadata: {
        chapter: 'Pharmacology',
        difficulty: 2,
        explanation:
          'The standard adult epinephrine auto-injector dose is 0.3 mg. The pediatric dose is 0.15 mg.',
      },
    },
    {
      type: 'radiogroup',
      name: 'aemt_pharm_q3',
      title: 'Nitroglycerin works by:',
      choices: [
        { value: 'A', text: 'Increasing heart rate' },
        { value: 'B', text: 'Dilating blood vessels' },
        { value: 'C', text: 'Constricting bronchioles' },
        { value: 'D', text: 'Blocking pain receptors' },
      ],
      correctAnswer: 'B',
      metadata: {
        chapter: 'Pharmacology',
        difficulty: 2,
        explanation:
          'Nitroglycerin is a vasodilator that relaxes smooth muscle in blood vessel walls.',
      },
    },
    {
      type: 'radiogroup',
      name: 'aemt_pharm_q4',
      title: 'Naloxone (Narcan) is used to reverse the effects of:',
      choices: [
        { value: 'A', text: 'Benzodiazepines' },
        { value: 'B', text: 'Opioids' },
        { value: 'C', text: 'Stimulants' },
        { value: 'D', text: 'Alcohol' },
      ],
      correctAnswer: 'B',
      metadata: {
        chapter: 'Pharmacology',
        difficulty: 1,
        explanation:
          'Naloxone is an opioid antagonist that reverses the effects of opioid overdose.',
      },
    },
    {
      type: 'radiogroup',
      name: 'aemt_pharm_q5',
      title: 'Which route of medication administration has the fastest onset?',
      choices: [
        { value: 'A', text: 'Oral' },
        { value: 'B', text: 'Sublingual' },
        { value: 'C', text: 'Intravenous' },
        { value: 'D', text: 'Intramuscular' },
      ],
      correctAnswer: 'C',
      metadata: {
        chapter: 'Pharmacology',
        difficulty: 2,
        explanation:
          'Intravenous (IV) administration provides the fastest onset as medication enters the bloodstream directly.',
      },
    },
    {
      type: 'radiogroup',
      name: 'aemt_pharm_q6',
      title: 'Aspirin is administered in chest pain because it:',
      choices: [
        { value: 'A', text: 'Relieves pain immediately' },
        { value: 'B', text: 'Inhibits platelet aggregation' },
        { value: 'C', text: 'Lowers blood pressure' },
        { value: 'D', text: 'Increases heart rate' },
      ],
      correctAnswer: 'B',
      metadata: {
        chapter: 'Pharmacology',
        difficulty: 2,
        explanation:
          'Aspirin inhibits platelet aggregation, helping to prevent blood clot formation during a cardiac event.',
      },
    },
    {
      type: 'radiogroup',
      name: 'aemt_pharm_q7',
      title: 'The "five rights" of medication administration include all EXCEPT:',
      choices: [
        { value: 'A', text: 'Right patient' },
        { value: 'B', text: 'Right dose' },
        { value: 'C', text: 'Right diagnosis' },
        { value: 'D', text: 'Right route' },
      ],
      correctAnswer: 'C',
      metadata: {
        chapter: 'Pharmacology',
        difficulty: 1,
        explanation:
          'The five rights are: right patient, right drug, right dose, right route, and right time.',
      },
    },
    {
      type: 'radiogroup',
      name: 'aemt_pharm_q8',
      title: 'Albuterol is a bronchodilator primarily used for:',
      choices: [
        { value: 'A', text: 'Cardiac arrest' },
        { value: 'B', text: 'Asthma and bronchospasm' },
        { value: 'C', text: 'Hypertension' },
        { value: 'D', text: 'Seizures' },
      ],
      correctAnswer: 'B',
      metadata: {
        chapter: 'Pharmacology',
        difficulty: 1,
        explanation:
          'Albuterol relaxes bronchial smooth muscle and is used to treat asthma and bronchospasm.',
      },
    },
  ];

  await prisma.questionBankItem.createMany({
    data: aemtBankItems.map((q) => ({
      bankId: aemtBank.id,
      questionData: {
        type: q.type,
        name: q.name,
        title: q.title,
        isRequired: true,
        choices: q.choices,
        correctAnswer: q.correctAnswer,
        metadata: q.metadata,
      },
      tags: ['pharmacology'],
    })),
  });
  console.info(
    `  Question Banks: 2 created (${emtBankItems.length + aemtBankItems.length} items total)`,
  );

  // ─── Assessments ────────────────────────────────────────────────────────────

  // Helper to build SurveyJS JSON from question bank items
  function buildSurveyJson(items: typeof emtBankItems) {
    return {
      pages: [
        {
          name: 'page1',
          elements: items.map((q) => ({
            type: q.type,
            name: q.name,
            title: q.title,
            isRequired: true,
            choices: q.choices,
            correctAnswer: q.correctAnswer,
            metadata: q.metadata,
          })),
        },
      ],
    };
  }

  // Assessment 1: EMT Airway Management Quiz — active, has responses, results released
  const airwayQuestions = emtBankItems.slice(6, 10).concat([emtBankItems[4]]);
  const assessment1 = await prisma.assessment.create({
    data: {
      orgId: org.id,
      createdById: admin.id,
      title: 'EMT Airway Management Quiz',
      description: 'Quiz covering airway management, breathing assessment, and oxygenation.',
      surveyJson: buildSurveyJson(airwayQuestions),
      status: 'active',
      resultsReleased: true,
      passingScore: 70,
      timeLimitMinutes: 30,
    },
  });

  // Assessment 2: AEMT Pharmacology Midterm — active, has responses, results not released
  const pharmQuestions = aemtBankItems.slice(0, 5);
  const assessment2 = await prisma.assessment.create({
    data: {
      orgId: org.id,
      createdById: instructor.id,
      title: 'AEMT Pharmacology Midterm',
      description: 'Midterm examination covering AEMT-level pharmacology.',
      surveyJson: buildSurveyJson(pharmQuestions),
      status: 'active',
      resultsReleased: false,
      passingScore: 70,
      timeLimitMinutes: 45,
    },
  });

  // Assessment 3: EMT Patient Assessment Final — closed, many responses
  const patientAssessQuestions = emtBankItems.slice(0, 5);
  const assessment3 = await prisma.assessment.create({
    data: {
      orgId: org.id,
      createdById: admin.id,
      title: 'EMT Patient Assessment Final',
      description: 'Final exam covering patient assessment fundamentals.',
      surveyJson: buildSurveyJson(patientAssessQuestions),
      status: 'closed',
      resultsReleased: true,
      passingScore: 70,
    },
  });

  // Assessment 4: Paramedic Cardiology Draft — draft, no responses
  const cardiologyQuestions = [
    {
      type: 'radiogroup',
      name: 'para_cardio_q1',
      title: 'The SA node is located in the:',
      choices: [
        { value: 'A', text: 'Right atrium' },
        { value: 'B', text: 'Left atrium' },
        { value: 'C', text: 'Right ventricle' },
        { value: 'D', text: 'Left ventricle' },
      ],
      correctAnswer: 'A',
      metadata: {
        chapter: 'Cardiology',
        difficulty: 2,
        explanation: 'The sinoatrial (SA) node is located in the upper wall of the right atrium.',
      },
    },
    {
      type: 'radiogroup',
      name: 'para_cardio_q2',
      title: 'A normal PR interval is:',
      choices: [
        { value: 'A', text: '0.04-0.10 seconds' },
        { value: 'B', text: '0.12-0.20 seconds' },
        { value: 'C', text: '0.22-0.30 seconds' },
        { value: 'D', text: '0.30-0.40 seconds' },
      ],
      correctAnswer: 'B',
      metadata: {
        chapter: 'Cardiology',
        difficulty: 3,
        explanation: 'The normal PR interval is 0.12-0.20 seconds (3-5 small boxes on ECG paper).',
      },
    },
    {
      type: 'radiogroup',
      name: 'para_cardio_q3',
      title: 'Ventricular fibrillation is characterized by:',
      choices: [
        { value: 'A', text: 'Regular, organized QRS complexes' },
        { value: 'B', text: 'Chaotic, disorganized electrical activity' },
        { value: 'C', text: 'A flat line on the ECG monitor' },
        { value: 'D', text: 'Wide QRS complexes at a regular rate' },
      ],
      correctAnswer: 'B',
      metadata: {
        chapter: 'Cardiology',
        difficulty: 2,
        explanation:
          'V-fib shows chaotic, disorganized electrical activity with no identifiable P waves, QRS complexes, or T waves.',
      },
    },
  ];

  await prisma.assessment.create({
    data: {
      orgId: org.id,
      createdById: instructor.id,
      title: 'Paramedic Cardiology Draft',
      description: 'Draft exam for paramedic-level cardiology. Still under development.',
      surveyJson: buildSurveyJson(cardiologyQuestions),
      status: 'draft',
      passingScore: 75,
    },
  });
  console.info('  Assessments: 4 created');

  // ─── Assessment Responses ───────────────────────────────────────────────────

  function generateResponse(
    assessmentId: string,
    student: (typeof students)[0],
    questions: typeof emtBankItems,
    answers: Record<string, string>,
    timeTaken: number,
    completedMinutesAgo: number,
  ) {
    const totalQuestions = questions.length;
    const totalCorrect = questions.filter((q) => answers[q.name] === q.correctAnswer).length;
    const scorePercentage = Math.round((totalCorrect / totalQuestions) * 100);

    const completedAt = new Date(Date.now() - completedMinutesAgo * 60 * 1000);
    const startedAt = new Date(completedAt.getTime() - timeTaken * 1000);

    return {
      assessmentId,
      studentId: student.id,
      studentEmail: student.email,
      studentName: `${student.firstName} ${student.lastName}`,
      responseData: answers,
      totalQuestions,
      totalCorrect,
      scorePercentage,
      passed: scorePercentage >= 70,
      timeTaken,
      startedAt,
      completedAt,
    };
  }

  // Assessment 1 responses (5 students, airway quiz)
  const a1q = airwayQuestions;
  await prisma.assessmentResponse.create({
    data: generateResponse(
      assessment1.id,
      students[0],
      a1q,
      {
        [a1q[0].name]: 'C',
        [a1q[1].name]: 'B',
        [a1q[2].name]: 'C',
        [a1q[3].name]: 'C',
        [a1q[4].name]: 'C',
      },
      1200,
      60,
    ),
  });
  await prisma.assessmentResponse.create({
    data: generateResponse(
      assessment1.id,
      students[1],
      a1q,
      {
        [a1q[0].name]: 'C',
        [a1q[1].name]: 'B',
        [a1q[2].name]: 'C',
        [a1q[3].name]: 'C',
        [a1q[4].name]: 'B',
      },
      980,
      120,
    ),
  });
  await prisma.assessmentResponse.create({
    data: generateResponse(
      assessment1.id,
      students[2],
      a1q,
      {
        [a1q[0].name]: 'A',
        [a1q[1].name]: 'A',
        [a1q[2].name]: 'C',
        [a1q[3].name]: 'A',
        [a1q[4].name]: 'C',
      },
      1450,
      180,
    ),
  });
  await prisma.assessmentResponse.create({
    data: generateResponse(
      assessment1.id,
      students[3],
      a1q,
      {
        [a1q[0].name]: 'C',
        [a1q[1].name]: 'B',
        [a1q[2].name]: 'C',
        [a1q[3].name]: 'B',
        [a1q[4].name]: 'C',
      },
      870,
      240,
    ),
  });

  // Assessment 2 responses (4 students, pharm midterm)
  const a2q = pharmQuestions;
  await prisma.assessmentResponse.create({
    data: generateResponse(
      assessment2.id,
      students[0],
      a2q,
      {
        [a2q[0].name]: 'B',
        [a2q[1].name]: 'B',
        [a2q[2].name]: 'B',
        [a2q[3].name]: 'B',
        [a2q[4].name]: 'C',
      },
      2100,
      300,
    ),
  });
  await prisma.assessmentResponse.create({
    data: generateResponse(
      assessment2.id,
      students[1],
      a2q,
      {
        [a2q[0].name]: 'B',
        [a2q[1].name]: 'A',
        [a2q[2].name]: 'B',
        [a2q[3].name]: 'B',
        [a2q[4].name]: 'C',
      },
      1800,
      360,
    ),
  });
  await prisma.assessmentResponse.create({
    data: generateResponse(
      assessment2.id,
      students[4],
      a2q,
      {
        [a2q[0].name]: 'A',
        [a2q[1].name]: 'B',
        [a2q[2].name]: 'A',
        [a2q[3].name]: 'B',
        [a2q[4].name]: 'A',
      },
      2400,
      420,
    ),
  });
  await prisma.assessmentResponse.create({
    data: generateResponse(
      assessment2.id,
      students[5],
      a2q,
      {
        [a2q[0].name]: 'B',
        [a2q[1].name]: 'B',
        [a2q[2].name]: 'B',
        [a2q[3].name]: 'B',
        [a2q[4].name]: 'C',
      },
      1650,
      480,
    ),
  });

  // Assessment 3 responses (7 students, patient assessment final)
  const a3q = patientAssessQuestions;
  await prisma.assessmentResponse.create({
    data: generateResponse(
      assessment3.id,
      students[0],
      a3q,
      {
        [a3q[0].name]: 'B',
        [a3q[1].name]: 'A',
        [a3q[2].name]: 'C',
        [a3q[3].name]: 'B',
        [a3q[4].name]: 'C',
      },
      1500,
      10080,
    ),
  });
  await prisma.assessmentResponse.create({
    data: generateResponse(
      assessment3.id,
      students[1],
      a3q,
      {
        [a3q[0].name]: 'B',
        [a3q[1].name]: 'A',
        [a3q[2].name]: 'C',
        [a3q[3].name]: 'B',
        [a3q[4].name]: 'C',
      },
      1200,
      10080,
    ),
  });
  await prisma.assessmentResponse.create({
    data: generateResponse(
      assessment3.id,
      students[2],
      a3q,
      {
        [a3q[0].name]: 'B',
        [a3q[1].name]: 'B',
        [a3q[2].name]: 'C',
        [a3q[3].name]: 'A',
        [a3q[4].name]: 'C',
      },
      1800,
      10080,
    ),
  });
  await prisma.assessmentResponse.create({
    data: generateResponse(
      assessment3.id,
      students[3],
      a3q,
      {
        [a3q[0].name]: 'A',
        [a3q[1].name]: 'A',
        [a3q[2].name]: 'D',
        [a3q[3].name]: 'B',
        [a3q[4].name]: 'A',
      },
      2100,
      10080,
    ),
  });
  await prisma.assessmentResponse.create({
    data: generateResponse(
      assessment3.id,
      students[4],
      a3q,
      {
        [a3q[0].name]: 'B',
        [a3q[1].name]: 'A',
        [a3q[2].name]: 'C',
        [a3q[3].name]: 'B',
        [a3q[4].name]: 'B',
      },
      1350,
      10080,
    ),
  });
  await prisma.assessmentResponse.create({
    data: generateResponse(
      assessment3.id,
      students[5],
      a3q,
      {
        [a3q[0].name]: 'B',
        [a3q[1].name]: 'A',
        [a3q[2].name]: 'C',
        [a3q[3].name]: 'B',
        [a3q[4].name]: 'C',
      },
      1100,
      10080,
    ),
  });
  await prisma.assessmentResponse.create({
    data: generateResponse(
      assessment3.id,
      students[6],
      a3q,
      {
        [a3q[0].name]: 'C',
        [a3q[1].name]: 'C',
        [a3q[2].name]: 'A',
        [a3q[3].name]: 'A',
        [a3q[4].name]: 'A',
      },
      2700,
      10080,
    ),
  });
  console.info('  Assessment Responses: 15 created');

  // ─── Sessions ───────────────────────────────────────────────────────────────
  const now = new Date();

  // Session 1: Past, published, has attendees with mixed statuses
  const session1 = await prisma.session.create({
    data: {
      orgId: org.id,
      createdById: admin.id,
      name: 'EMT Refresher — Spring 2026',
      description: 'Annual EMT refresher course covering updated protocols and skills review.',
      isPublished: true,
      startDateTime: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), // 1 week ago
      endDateTime: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000), // 4 hours duration
    },
  });

  // Session 2: Future, published, has some registered attendees
  const session2 = await prisma.session.create({
    data: {
      orgId: org.id,
      createdById: instructor.id,
      name: 'AEMT Skills Lab',
      description:
        'Hands-on skills laboratory for IV access, medication administration, and advanced airway management.',
      isPublished: true,
      startDateTime: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000), // 2 weeks from now
      endDateTime: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000), // 3 hours duration
    },
  });

  // Session 3: Unpublished draft
  await prisma.session.create({
    data: {
      orgId: org.id,
      createdById: instructor.id,
      name: 'Paramedic Clinical Orientation',
      description: 'Orientation session for paramedic students beginning clinical rotations.',
      isPublished: false,
    },
  });
  console.info('  Sessions: 3 created');

  // ─── Session Attendees ──────────────────────────────────────────────────────
  const s1Start = session1.startDateTime!;

  // Session 1 attendees (past session — mixed statuses)
  await prisma.sessionAttendee.createMany({
    data: [
      {
        sessionId: session1.id,
        studentId: students[0].id,
        status: 'attended',
        checkedInAt: new Date(s1Start.getTime() + 5 * 60 * 1000),
        checkedOutAt: new Date(s1Start.getTime() + 4 * 60 * 60 * 1000),
      },
      {
        sessionId: session1.id,
        studentId: students[1].id,
        status: 'attended',
        checkedInAt: new Date(s1Start.getTime() + 2 * 60 * 1000),
        checkedOutAt: new Date(s1Start.getTime() + 3.5 * 60 * 60 * 1000),
      },
      {
        sessionId: session1.id,
        studentId: students[2].id,
        status: 'checked_in',
        checkedInAt: new Date(s1Start.getTime() + 10 * 60 * 1000),
      },
      {
        sessionId: session1.id,
        studentId: students[3].id,
        status: 'no_show',
      },
      {
        sessionId: session1.id,
        studentId: students[4].id,
        status: 'attended',
        checkedInAt: new Date(s1Start.getTime() + 1 * 60 * 1000),
        checkedOutAt: new Date(s1Start.getTime() + 4 * 60 * 60 * 1000),
      },
      {
        sessionId: session1.id,
        studentId: students[7].id,
        status: 'attended',
        checkedInAt: new Date(s1Start.getTime() + 8 * 60 * 1000),
        checkedOutAt: new Date(s1Start.getTime() + 3.75 * 60 * 60 * 1000),
      },
    ],
  });

  // Session 2 attendees (future session — all registered)
  await prisma.sessionAttendee.createMany({
    data: [
      { sessionId: session2.id, studentId: students[0].id, status: 'registered' },
      { sessionId: session2.id, studentId: students[1].id, status: 'registered' },
      { sessionId: session2.id, studentId: students[5].id, status: 'registered' },
      { sessionId: session2.id, studentId: students[6].id, status: 'registered' },
    ],
  });
  console.info('  Session Attendees: 10 created');

  // ─── Bug Reports ────────────────────────────────────────────────────────────
  await prisma.bugReport.createMany({
    data: [
      {
        orgId: org.id,
        reporterType: 'admin',
        reporterId: admin.id,
        reporterEmail: admin.email,
        reporterName: admin.name,
        category: 'bug',
        severity: 'critical',
        description:
          'Assessment responses are not saving when the timer expires. Students report losing their answers when the time limit runs out during a quiz.',
        stepsToReproduce:
          '1. Start a timed assessment\n2. Let the timer run to zero\n3. Observe that responses are not submitted',
        status: 'pending',
      },
      {
        orgId: org.id,
        reporterType: 'student',
        reporterId: students[0].id,
        reporterEmail: students[0].email,
        reporterName: `${students[0].firstName} ${students[0].lastName}`,
        category: 'bug',
        severity: 'high',
        description:
          'QR code scanner does not open on iPhone Safari. The check-in QR code link opens but the camera does not activate for scanning.',
        url: '/take/abc123',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
        status: 'acknowledged',
      },
      {
        orgId: org.id,
        reporterType: 'admin',
        reporterId: instructor.id,
        reporterEmail: instructor.email,
        reporterName: instructor.name,
        category: 'feedback',
        severity: 'medium',
        description:
          'It would be helpful to see a summary dashboard showing pass/fail rates across all assessments, not just individual assessment analytics.',
        status: 'pending',
      },
      {
        orgId: org.id,
        reporterType: 'anonymous',
        category: 'feedback',
        severity: 'low',
        description:
          'The font size on the assessment-taking page is a bit small on mobile devices. It would be easier to read if it were slightly larger.',
        userAgent: 'Mozilla/5.0 (Linux; Android 14)',
        viewport: '360x800',
        status: 'resolved',
      },
      {
        orgId: org.id,
        reporterType: 'admin',
        reporterId: admin.id,
        reporterEmail: admin.email,
        reporterName: admin.name,
        category: 'feature_request',
        severity: 'medium',
        description:
          'Please add the ability to export assessment results to CSV or Excel format for record-keeping and grade upload to our LMS.',
        status: 'pending',
      },
      {
        orgId: org.id,
        reporterType: 'student',
        reporterId: students[3].id,
        reporterEmail: students[3].email,
        reporterName: `${students[3].firstName} ${students[3].lastName}`,
        category: 'feature_request',
        severity: 'low',
        description:
          'It would be great to have a study mode where I can practice questions from previous assessments without it counting as an official attempt.',
        status: 'acknowledged',
      },
    ],
  });
  console.info('  Bug Reports: 6 created');

  console.info('Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
