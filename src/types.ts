export enum PedagogicalPractice {
  INQUIRY_DISCOVERY = 'Inkuiri-Discovery',
  PJBL = 'PjBL',
  PROBLEM_SOLVING = 'Problem Solving',
  GAME_BASED = 'Game Based Learning',
  STATION_LEARNING = 'Station Learning',
  PBL = 'Problem Based Learning (PBL)',
  COOPERATIVE = 'Cooperative Learning',
  CTL = 'Contextual Teaching and Learning (CTL)',
  FLIPPED = 'Flipped Classroom',
  DIFFERENTIATED = 'Differentiated Instruction',
}

export enum GraduateDimension {
  FAITH = 'Keimanan & Ketakwaan',
  CITIZENSHIP = 'Kewargaan',
  CRITICAL_REASONING = 'Penalaran Kritis',
  CREATIVITY = 'Kreativitas',
  COLLABORATION = 'Kolaborasi',
  INDEPENDENCE = 'Kemandirian',
  HEALTH = 'Kesehatan',
  COMMUNICATION = 'Komunikasi',
}

export enum IntegrationOption {
  NONE = 'Tidak Ada',
  SRA = 'Insersi Nilai SRA (Sekolah Ramah Anak)',
  LITERASI = 'Integrasi Kemampuan Literasi',
  NUMERASI = 'Integrasi Kemampuan Numerasi',
}

export interface RPMInput {
  teacherName: string;
  teacherNip: string;
  className: string;
  semester: 'I' | 'II' | 'III' | 'IV' | 'V' | 'VI';
  subject: string;
  learningObjectives: string;
  subjectMatter: string;
  studentTarget?: string;
  language: 'Bahasa Inggris' | 'Bahasa Arab' | 'Tidak Ada';
  meetings: number;
  pedagogicalPractices: PedagogicalPractice[];
  graduateDimensions: GraduateDimension[];
  integrationOption: IntegrationOption;
}