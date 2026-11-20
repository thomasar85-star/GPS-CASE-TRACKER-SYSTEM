import { Station, Officer, CaseRecord } from '../types';
import { getPlaceholderImage, quickHash } from '../utils/security';

export const SEED_STATIONS: Station[] = [
  {
    id: 'stn_accra_central',
    name: 'Accra Central Divisional Police Headquarters',
    code: 'ACR',
    region: 'Greater Accra Region',
    division: 'Ministries / Central Business District',
    phone: '+233 302 664 611',
    commander: 'Chief Superintendent Nana Kwabena Osei'
  },
  {
    id: 'stn_cantonments',
    name: 'Cantonments District Police Station',
    code: 'CNT',
    region: 'Greater Accra Region',
    division: 'Cantonments / Labone District',
    phone: '+233 302 776 544',
    commander: 'Superintendent Comfort Mensah'
  },
  {
    id: 'stn_kaneshie',
    name: 'Kaneshie Divisional Police Command',
    code: 'KNS',
    region: 'Greater Accra Region',
    division: 'Kaneshie / Okaikwei South',
    phone: '+233 302 223 881',
    commander: 'Chief Superintendent Samuel Addo'
  },
  {
    id: 'stn_kumasi_central',
    name: 'Kumasi Central Divisional Police Headquarters',
    code: 'KMS',
    region: 'Ashanti Region',
    division: 'Kumasi Metro / Adum Command',
    phone: '+233 322 022 323',
    commander: 'Assistant Commissioner of Police Kwadwo Antwi'
  },
  {
    id: 'stn_takoradi_harbor',
    name: 'Takoradi Harbor Police Station',
    code: 'TKD',
    region: 'Western Region',
    division: 'Sekondi-Takoradi Metropolitan Division',
    phone: '+233 312 023 112',
    commander: 'Superintendent Francisca Quansah'
  },
  {
    id: 'stn_tamale_metro',
    name: 'Tamale Metropolitan Police Headquarters',
    code: 'TML',
    region: 'Northern Region',
    division: 'Tamale Central Command',
    phone: '+233 372 022 419',
    commander: 'Chief Superintendent Yakubu Alhassan'
  }
];

export const SEED_OFFICERS: Officer[] = [
  {
    id: 'off_001',
    name: 'Kwame Mensah',
    badgeId: 'GPS-SGT-4821',
    rank: 'Sergeant',
    stationId: 'stn_accra_central',
    stationName: 'Accra Central Divisional Police Headquarters',
    role: 'counter_nco',
    email: 'counter.nco@gps.gov.gh',
    passwordHash: quickHash('password123'),
    phone: '+233 244 112 233',
    avatarUrl: getPlaceholderImage('officer', 'Sgt Mensah')
  },
  {
    id: 'off_002',
    name: 'Emmanuel Ofori',
    badgeId: 'GPS-CINSP-2290',
    rank: 'Chief Inspector',
    stationId: 'stn_accra_central',
    stationName: 'Accra Central Divisional Police Headquarters',
    role: 'station_officer',
    email: 'station.officer@gps.gov.gh',
    passwordHash: quickHash('password123'),
    phone: '+233 244 330 991',
    avatarUrl: getPlaceholderImage('officer', 'C/Insp Ofori')
  },
  {
    id: 'off_003',
    name: 'Kofi Asante',
    badgeId: 'GPS-INSP-3091',
    rank: 'Inspector (CID)',
    stationId: 'stn_accra_central',
    stationName: 'Accra Central Divisional Police Headquarters',
    role: 'investigator',
    email: 'investigator@gps.gov.gh',
    passwordHash: quickHash('password123'),
    phone: '+233 244 556 677',
    avatarUrl: getPlaceholderImage('officer', 'Insp Asante')
  },
  {
    id: 'off_004',
    name: 'Nana Kwabena Osei',
    badgeId: 'GPS-CSUPT-0104',
    rank: 'Chief Superintendent',
    stationId: 'stn_accra_central',
    stationName: 'Accra Central Divisional Police Headquarters',
    role: 'senior_officer',
    email: 'senior.officer@gps.gov.gh',
    passwordHash: quickHash('password123'),
    phone: '+233 208 889 900',
    avatarUrl: getPlaceholderImage('officer', 'C/Supt Osei')
  },
  {
    id: 'off_005',
    name: 'Abena Boakye',
    badgeId: 'GPS-CPL-7120',
    rank: 'Corporal',
    stationId: 'stn_cantonments',
    stationName: 'Cantonments District Police Station',
    role: 'counter_nco',
    email: 'abena.boakye@gps.gov.gh',
    passwordHash: quickHash('password123'),
    phone: '+233 277 443 322',
    avatarUrl: getPlaceholderImage('officer', 'Cpl Boakye')
  },
  {
    id: 'off_006',
    name: 'Faustina Danquah',
    badgeId: 'GPS-INSP-4412',
    rank: 'Inspector',
    stationId: 'stn_cantonments',
    stationName: 'Cantonments District Police Station',
    role: 'station_officer',
    email: 'faustina.danquah@gps.gov.gh',
    passwordHash: quickHash('password123'),
    phone: '+233 244 881 200',
    avatarUrl: getPlaceholderImage('officer', 'Insp Danquah')
  },
  {
    id: 'off_007',
    name: 'Emmanuel Darko',
    badgeId: 'GPS-DSGT-5542',
    rank: 'Detective Sergeant',
    stationId: 'stn_kumasi_central',
    stationName: 'Kumasi Central Divisional Police Headquarters',
    role: 'investigator',
    email: 'emmanuel.darko@gps.gov.gh',
    passwordHash: quickHash('password123'),
    phone: '+233 266 778 899',
    avatarUrl: getPlaceholderImage('officer', 'Det Darko')
  },
  {
    id: 'off_008',
    name: 'Francisca Quansah',
    badgeId: 'GPS-SUPT-0088',
    rank: 'Superintendent of Police',
    stationId: 'stn_cantonments',
    stationName: 'Cantonments District Police Station',
    role: 'senior_officer',
    email: 'francisca.quansah@gps.gov.gh',
    passwordHash: quickHash('password123'),
    phone: '+233 244 990 112',
    avatarUrl: getPlaceholderImage('officer', 'Supt Quansah')
  },
  {
    id: 'off_009',
    name: 'Samuel Addo-Danquah',
    badgeId: 'GPS-ACP-0005',
    rank: 'Assistant Commissioner of Police (ACP)',
    stationId: 'stn_accra_central',
    stationName: 'Accra Central Divisional Police Headquarters',
    role: 'senior_officer',
    email: 'acp.addo@gps.gov.gh',
    passwordHash: quickHash('password123'),
    phone: '+233 202 110 099',
    avatarUrl: getPlaceholderImage('officer', 'ACP Addo')
  }
];

export const SEED_CASES: CaseRecord[] = [
  {
    id: 'case_001',
    docketNumber: 'GPS/ACR/CR-2026/0042',
    offenceCategory: 'robbery',
    offenceTitle: 'Armed Robbery & Unlawful Entry at Commercial Warehouse',
    act29OffenceCode: 'ACT29_SEC149',
    act29Section: 'Section 149',
    statuteCitation: 'Robbery: Contrary to Section 149 of the Criminal Offences Act, 1960 (Act 29/60).',
    incidentDateTime: '2026-07-28T02:30:00',
    lodgedDateTime: '2026-07-28T07:15:00',
    stationId: 'stn_accra_central',
    stationName: 'Accra Central Divisional Police Headquarters',
    locationDescription: 'Plot 14, Ring Road Industrial Area, North Ridge, Accra',
    narrative: 'Complainant reported that four unidentified masked men armed with pump-action guns entered the warehouse premises, subdued two security guards on night duty, and made away with electronic appliances and cash valued at approximately GHS 145,000.',
    status: 'under_investigation',
    statusUpdatedAt: '2026-07-30T11:00:00',
    priority: 'critical',
    officerInChargeId: 'off_003',
    officerInChargeName: 'Detective Inspector Kofi Asante',
    officerInChargeBadge: 'GPS-INSP-3091',
    isSynthetic: true,
    complainant: {
      id: 'comp_001',
      fullName: 'Gideon Kwame Anane',
      ghanaCardId: 'GHA-712891234-9',
      phone: '+233 244 901 234',
      email: 'gideon.anane.synth@example.com',
      address: 'House No. B24/11, Adabraka, Accra',
      gender: 'male',
      occupation: 'Logistics Operations Director',
      photoUrl: getPlaceholderImage('complainant', 'Gideon Anane')
    },
    suspects: [
      {
        id: 'susp_001',
        fullName: 'Ibrahim Fuseini',
        alias: 'Alhaji Red',
        ghanaCardId: 'GHA-661209381-0',
        gender: 'male',
        approximateAge: 34,
        address: 'Fadama Zongo, Accra',
        photoUrl: getPlaceholderImage('suspect', 'Ibrahim Fuseini'),
        cautionStatement: 'Suspect denies participating in the armed entry but admits knowing the layout of the warehouse through a previous driver assignment.',
        cautionStatementTimestamp: '2026-07-30T14:20:00',
        cautionStatementOfficerId: 'off_003',
        arrestStatus: 'remanded',
        arrestDate: '2026-07-29T18:00:00',
        remandFacility: 'Accra Central Police Cells (Remand Section A)',
        linkedCaseIds: ['case_001', 'case_004'] // Cross-station link with Takoradi!
      }
    ],
    evidence: [
      {
        id: 'ev_001',
        caseId: 'case_001',
        itemNumber: 'EX-ACR-2026-001',
        category: 'digital',
        description: 'CCTV footage USB drive recovered from warehouse backup server showing entry timestamp 02:28 AM.',
        photoUrl: getPlaceholderImage('evidence', 'CCTV Storage USB'),
        dateCollected: '2026-07-28T09:40:00',
        collectedByOfficerName: 'Kofi Asante',
        storageLocker: 'Exhibit Locker Vault 2, Drawer B',
        chainOfCustodyLog: [
          {
            date: '2026-07-28T09:40:00',
            action: 'Collected from Crime Scene',
            officer: 'Kofi Asante',
            reason: 'Initial Crime Scene Processing'
          },
          {
            date: '2026-07-29T10:15:00',
            action: 'Transferred to CID Forensic Lab',
            officer: 'Kofi Asante',
            reason: 'Video Enhancement & Analysis'
          }
        ]
      },
      {
        id: 'ev_002',
        caseId: 'case_001',
        itemNumber: 'EX-ACR-2026-002',
        category: 'physical',
        description: 'One expended 12-gauge shotgun cartridge shell recovered near northern perimeter fence.',
        photoUrl: getPlaceholderImage('evidence', 'Cartridge Shell'),
        dateCollected: '2026-07-28T10:10:00',
        collectedByOfficerName: 'Kofi Asante',
        storageLocker: 'Ballistics Secure Bin 4',
        chainOfCustodyLog: [
          {
            date: '2026-07-28T10:10:00',
            action: 'Secured at Scene',
            officer: 'Kofi Asante',
            reason: 'Ballistics Matching'
          }
        ]
      }
    ],
    witnessStatements: [
      {
        id: 'wit_001',
        caseId: 'case_001',
        witnessName: 'Yaw Boateng',
        contact: '+233 277 882 119',
        ghanaCardId: 'GHA-552910392-4',
        statementText: 'I was stationed at the rear security post when I heard glass shatter. Before I could activate the distress alarm, two men pointed a firearm at me and ordered me onto the floor.',
        dateRecorded: '2026-07-28T11:30:00',
        recordedByOfficerName: 'Kwame Mensah',
        verified: true
      }
    ],
    submissions: [
      {
        id: 'sub_001',
        caseId: 'case_001',
        officerId: 'off_001',
        officerName: 'Kwame Mensah',
        officerBadge: 'GPS-SGT-4821',
        officerRank: 'Sergeant',
        officerRole: 'counter_nco',
        submissionType: 'initial_intake',
        title: 'Initial Counter Complaint Logged (Charge Office)',
        content: 'Complainant reported in person at the Charge Office Counter at 07:15 hours accompanied by Security Supervisor Yaw Boateng. Case registered in Station Counter Diary and forwarded to Station Officer for CID assignment.',
        timestamp: '2026-07-28T07:45:00'
      },
      {
        id: 'sub_001_b',
        caseId: 'case_001',
        officerId: 'off_002',
        officerName: 'Emmanuel Ofori',
        officerBadge: 'GPS-CINSP-2290',
        officerRank: 'Chief Inspector',
        officerRole: 'station_officer',
        submissionType: 'station_supervision',
        title: 'Station Officer Intake Endorsement & CID Assignment',
        content: 'Counter intake reviewed and verified against Charge Office Diary. Docket allocated to Detective Inspector Kofi Asante (CID) for urgent crime scene reconnaissance and ballistics recovery.',
        timestamp: '2026-07-28T08:15:00',
        isEndorsed: true
      },
      {
        id: 'sub_002',
        caseId: 'case_001',
        officerId: 'off_003',
        officerName: 'Kofi Asante',
        officerBadge: 'GPS-INSP-3091',
        officerRank: 'Inspector (CID)',
        officerRole: 'investigator',
        submissionType: 'investigation_finding',
        title: 'Crime Scene Reconnaissance & Suspect Interception',
        content: 'Recovered CCTV recordings and one spent shell casing. Intelligence tip-off led to the tracking of suspect Ibrahim Fuseini alias "Alhaji Red" in Fadama. Suspect arrested and currently in detention under 48-hour judicial remand order.',
        timestamp: '2026-07-30T11:00:00'
      },
      {
        id: 'sub_003',
        caseId: 'case_001',
        officerId: 'off_004',
        officerName: 'Nana Kwabena Osei',
        officerBadge: 'GPS-CSUPT-0104',
        officerRank: 'Chief Superintendent',
        officerRole: 'senior_officer',
        submissionType: 'senior_endorsement',
        title: 'Divisional Commander Review & Ballistics Directive',
        content: 'Endorsed. Expended shell should be forwarded to National CID Ballistics Unit immediately. Ensure suspect Fuseini is checked against Western Region Takoradi Harbor records due to matching modus operandi.',
        timestamp: '2026-07-30T16:45:00',
        isEndorsed: true,
        endorsedBy: {
          officerName: 'Nana Kwabena Osei',
          officerBadge: 'GPS-CSUPT-0104',
          timestamp: '2026-07-30T16:45:00',
          comments: 'High-priority docket. Weekly progress reports required.'
        }
      }
    ]
  },
  {
    id: 'case_002',
    docketNumber: 'GPS/CNT/CR-2026/0019',
    offenceCategory: 'fraud_scam',
    offenceTitle: 'Cyber Syndicate Mobile Money & Banking Spoofing Scheme',
    act29OffenceCode: 'ACT29_SEC131',
    act29Section: 'Section 131',
    statuteCitation: 'Defrauding by False Pretences: Contrary to Section 131 of the Criminal Offences Act, 1960 (Act 29/60).',
    incidentDateTime: '2026-08-01T14:00:00',
    lodgedDateTime: '2026-08-02T09:20:00',
    stationId: 'stn_cantonments',
    stationName: 'Cantonments District Police Station',
    locationDescription: 'Cantonments Embassy Road, Accra',
    narrative: 'Complainant was deceived through a fraudulent electronic communication claiming to originate from a commercial banking headquarters, transferring GHS 68,000 into three designated mobile wallets under false pretenses.',
    status: 'under_investigation',
    statusUpdatedAt: '2026-08-03T15:00:00',
    priority: 'urgent',
    officerInChargeId: 'off_003',
    officerInChargeName: 'Detective Inspector Kofi Asante',
    officerInChargeBadge: 'GPS-INSP-3091',
    isSynthetic: true,
    complainant: {
      id: 'comp_002',
      fullName: 'Dr. Elizabeth Akosua Mensah',
      ghanaCardId: 'GHA-882910401-2',
      phone: '+233 202 334 455',
      email: 'elizabeth.mensah.synth@example.com',
      address: 'Switchback Road, Cantonments, Accra',
      gender: 'female',
      occupation: 'Medical Consultant',
      photoUrl: getPlaceholderImage('complainant', 'Dr E Mensah')
    },
    suspects: [
      {
        id: 'susp_002',
        fullName: 'Kwabena Boateng Appiah',
        alias: 'Red Scorpion / Bra Kwabena',
        ghanaCardId: 'GHA-892109283-4',
        gender: 'male',
        approximateAge: 29,
        address: 'Ahodwo, Kumasi / Dansoman, Accra',
        photoUrl: getPlaceholderImage('suspect', 'Kwabena Boateng'),
        cautionStatement: 'Suspect claimed he was merely a third-party POS cash-out vendor and was unaware of the fraudulent source of funds.',
        cautionStatementTimestamp: '2026-08-03T16:00:00',
        cautionStatementOfficerId: 'off_003',
        arrestStatus: 'arrested',
        arrestDate: '2026-08-03T10:30:00',
        remandFacility: 'Cantonments Cell 3',
        linkedCaseIds: ['case_002', 'case_005'] // Cross-station link with Kumasi Central!
      }
    ],
    evidence: [
      {
        id: 'ev_003',
        caseId: 'case_002',
        itemNumber: 'EX-CNT-2026-008',
        category: 'digital',
        description: 'Certified Telco transaction logs and Call Detail Records (CDR) for target wallet numbers.',
        photoUrl: getPlaceholderImage('evidence', 'Telco Statement Printout'),
        dateCollected: '2026-08-02T16:00:00',
        collectedByOfficerName: 'Abena Boakye',
        storageLocker: 'Cyber Evidence Cabinet A',
        chainOfCustodyLog: [
          {
            date: '2026-08-02T16:00:00',
            action: 'Received from Telecommunications Legal Liaison',
            officer: 'Abena Boakye',
            reason: 'Docket Intake'
          }
        ]
      }
    ],
    witnessStatements: [],
    submissions: [
      {
        id: 'sub_004',
        caseId: 'case_002',
        officerId: 'off_005',
        officerName: 'Abena Boakye',
        officerBadge: 'GPS-CPL-7120',
        officerRank: 'Corporal',
        officerRole: 'counter_nco',
        submissionType: 'initial_intake',
        title: 'Electronic Fraud Complaint Docketed (Counter)',
        content: 'Complainant lodged formal report with transaction SMS trails and bank statements. Case assigned to CID Cyber Unit.',
        timestamp: '2026-08-02T09:30:00'
      },
      {
        id: 'sub_004_b',
        caseId: 'case_002',
        officerId: 'off_006',
        officerName: 'Faustina Danquah',
        officerBadge: 'GPS-INSP-4412',
        officerRank: 'Inspector',
        officerRole: 'station_officer',
        submissionType: 'station_supervision',
        title: 'Station Officer Counter Supervision & DOVVSU/CID Route',
        content: 'Counter intake reviewed. High monetary value scam verified with preliminary telco evidence. Transferred to Regional Cyber CID.',
        timestamp: '2026-08-02T10:15:00',
        isEndorsed: true
      }
    ]
  },
  {
    id: 'case_003',
    docketNumber: 'GPS/ACR/CR-2026/0011',
    offenceCategory: 'theft',
    offenceTitle: 'Theft of Government Property & Solar Inverters',
    act29OffenceCode: 'ACT29_SEC124',
    act29Section: 'Section 124',
    statuteCitation: 'Stealing: Contrary to Section 124 of the Criminal Offences Act, 1960 (Act 29/60).',
    incidentDateTime: '2026-07-04T18:00:00',
    lodgedDateTime: '2026-07-05T08:00:00',
    stationId: 'stn_accra_central',
    stationName: 'Accra Central Divisional Police Headquarters',
    locationDescription: 'Public Works Ministry Compound, Accra Central',
    narrative: 'Eight high-capacity hybrid solar inverters and battery banks installed at the auxiliary data facility were dismantled and stolen over the weekend.',
    status: 'under_investigation',
    statusUpdatedAt: '2026-07-10T14:00:00', // Stalled / Aging case (> 20 days since last update!)
    priority: 'standard',
    flaggedForSeniorReview: true,
    flagReason: 'Aging case: 24+ days in "Under Investigation" without CID progress submission.',
    isSynthetic: true,
    complainant: {
      id: 'comp_003',
      fullName: 'Ing. Patrick Osei-Tutu',
      ghanaCardId: 'GHA-110293849-5',
      phone: '+233 244 771 990',
      address: 'Estates Directorate, Ministries, Accra',
      gender: 'male',
      occupation: 'Chief Electrical Engineer',
      photoUrl: getPlaceholderImage('complainant', 'Ing Patrick')
    },
    suspects: [],
    evidence: [],
    witnessStatements: [],
    submissions: [
      {
        id: 'sub_005',
        caseId: 'case_003',
        officerId: 'off_001',
        officerName: 'Kwame Mensah',
        officerBadge: 'GPS-SGT-4821',
        officerRank: 'Sergeant',
        officerRole: 'counter_nco',
        submissionType: 'initial_intake',
        title: 'Initial Charge Sheet Prepared (Counter Intake)',
        content: 'Property theft registered under Section 124 of Act 29/60. Scene inspected by Counter NCO and Charge Office team. Forwarded to Station Officer and Technical Branch for fingerprint analysis.',
        timestamp: '2026-07-05T08:30:00'
      }
    ]
  },
  {
    id: 'case_004',
    docketNumber: 'GPS/TKD/CR-2026/0031',
    offenceCategory: 'robbery',
    offenceTitle: 'Harbor Transit Container Hijacking Attempt',
    act29OffenceCode: 'ACT29_SEC149',
    act29Section: 'Section 149',
    statuteCitation: 'Robbery: Contrary to Section 149 of the Criminal Offences Act, 1960 (Act 29/60).',
    incidentDateTime: '2026-06-14T23:15:00',
    lodgedDateTime: '2026-06-15T06:00:00',
    stationId: 'stn_takoradi_harbor',
    stationName: 'Takoradi Harbor Police Station',
    locationDescription: 'Gate 4 Access Corridor, Takoradi Port',
    narrative: 'Armed syndicate attempted to intercept a container truck transporting imported lubricants and lubricants. Driver resisted; suspects fled the scene when harbor security patrol arrived.',
    status: 'under_investigation',
    statusUpdatedAt: '2026-06-20T10:00:00',
    priority: 'urgent',
    isSynthetic: true,
    complainant: {
      id: 'comp_004',
      fullName: 'Benjamin Kojo Arthur',
      ghanaCardId: 'GHA-990182743-3',
      phone: '+233 312 884 100',
      address: 'Beach Road, Takoradi',
      gender: 'male',
      occupation: 'Haulage Driver',
      photoUrl: getPlaceholderImage('complainant', 'Benjamin Arthur')
    },
    suspects: [
      {
        id: 'susp_003',
        fullName: 'Ibrahim Fuseini',
        alias: 'Alhaji Red',
        ghanaCardId: 'GHA-661209381-0', // MATCH WITH CASE 001!
        gender: 'male',
        approximateAge: 34,
        address: 'Takoradi New Takoradi / Accra Fadama',
        photoUrl: getPlaceholderImage('suspect', 'Ibrahim Fuseini'),
        cautionStatement: 'Suspect absconded during initial regional bail and skipped court summons.',
        arrestStatus: 'wanted',
        linkedCaseIds: ['case_004', 'case_001']
      }
    ],
    evidence: [],
    witnessStatements: [],
    submissions: [
      {
        id: 'sub_006',
        caseId: 'case_004',
        officerId: 'off_003',
        officerName: 'Francisca Quansah',
        officerBadge: 'GPS-SUPT-1902',
        officerRank: 'Superintendent',
        officerRole: 'senior_officer',
        submissionType: 'directive',
        title: 'Regional Wanted Notice Issued',
        content: 'Suspect Ibrahim Fuseini has been placed on the Western Region wanted list. Warrant for arrest in possession.',
        timestamp: '2026-06-20T10:00:00'
      }
    ]
  },
  {
    id: 'case_005',
    docketNumber: 'GPS/KMS/CR-2026/0088',
    offenceCategory: 'cybercrime',
    offenceTitle: 'Impersonation of Gold Export Broker & Wire Fraud',
    act29OffenceCode: 'ACT29_SEC131',
    act29Section: 'Section 131',
    statuteCitation: 'Defrauding by False Pretences: Contrary to Section 131 of the Criminal Offences Act, 1960 (Act 29/60).',
    incidentDateTime: '2026-05-10T11:00:00',
    lodgedDateTime: '2026-05-11T14:30:00',
    stationId: 'stn_kumasi_central',
    stationName: 'Kumasi Central Divisional Police Headquarters',
    locationDescription: 'Adum Commercial Street, Kumasi',
    narrative: 'A foreign investor was defrauded of GHS 210,000 under the pretext of facilitating precious minerals assay certifications and export clearance.',
    status: 'forwarded_to_court',
    statusUpdatedAt: '2026-07-15T09:00:00',
    priority: 'urgent',
    officerInChargeId: 'off_007',
    officerInChargeName: 'Detective Sergeant Emmanuel Darko',
    officerInChargeBadge: 'GPS-DSGT-5542',
    isSynthetic: true,
    complainant: {
      id: 'comp_005',
      fullName: 'Marcus Aurelius Van Der Bilt',
      phone: '+233 551 229 001',
      address: 'Golden Tulip Hotel Suites, Kumasi',
      gender: 'male',
      occupation: 'Commodities Consultant',
      photoUrl: getPlaceholderImage('complainant', 'M Van Der Bilt')
    },
    suspects: [
      {
        id: 'susp_004',
        fullName: 'Kwabena Boateng Appiah',
        alias: 'Red Scorpion / Bra Kwabena',
        ghanaCardId: 'GHA-892109283-4', // MATCH WITH CASE 002!
        gender: 'male',
        approximateAge: 29,
        address: 'Ahodwo, Kumasi',
        photoUrl: getPlaceholderImage('suspect', 'Kwabena Boateng'),
        cautionStatement: 'Suspect admits acting as an intermediary but asserts he handed funds to a registered broker.',
        arrestStatus: 'remanded',
        remandFacility: 'Kumasi Central Prison (Remand Wing)',
        linkedCaseIds: ['case_005', 'case_002']
      }
    ],
    evidence: [],
    witnessStatements: [],
    courtRecord: {
      courtName: 'Kumasi Circuit Court 2',
      suitNumber: 'KCC2/CR/2026/194',
      prosecutingOfficer: 'Chief Inspector David Mensah',
      firstHearingDate: '2026-07-22T09:00:00',
      presidingJudge: 'Her Honour Justice Bernice Sarpong',
      proceedings: [
        {
          id: 'proc_001',
          date: '2026-07-22T09:30:00',
          courtName: 'Kumasi Circuit Court 2',
          presidingJudge: 'Her Honour Justice Bernice Sarpong',
          proceedingsSummary: 'Plea of not guilty taken. Prosecution prayed the court to remand suspect in custody due to flight risk and ongoing cross-jurisdictional investigations.',
          nextAdjournmentDate: '2026-08-19T09:00:00',
          adjournmentReason: 'Continuation of Hearing & Forensic Evidence Presentation'
        }
      ],
      finalOutcome: 'pending_trial'
    },
    submissions: [
      {
        id: 'sub_007',
        caseId: 'case_005',
        officerId: 'off_007',
        officerName: 'Emmanuel Darko',
        officerBadge: 'GPS-DSGT-5542',
        officerRank: 'Detective Sergeant',
        officerRole: 'investigator',
        submissionType: 'investigation_finding',
        title: 'Docket Forwarded to Attorney General & Court Registrar',
        content: 'Investigation concluded. Advice received from Regional State Attorney to prosecute on 3 counts of Defrauding by False Pretenses (Section 131 of Act 29/60).',
        timestamp: '2026-07-15T09:00:00'
      }
    ]
  },
  {
    id: 'case_006',
    docketNumber: 'GPS/KNS/CR-2026/0074',
    offenceCategory: 'assault',
    offenceTitle: 'Assault Occasioning Harm & Unlawful Damage at Kaneshie Market',
    act29OffenceCode: 'ACT29_SEC84',
    act29Section: 'Section 84 & 172',
    statuteCitation: 'Assault & Unlawful Damage: Contrary to Sections 84 & 172 of the Criminal Offences Act, 1960 (Act 29/60).',
    incidentDateTime: '2026-07-18T16:40:00',
    lodgedDateTime: '2026-07-18T17:10:00',
    stationId: 'stn_kaneshie',
    stationName: 'Kaneshie Divisional Police Command',
    locationDescription: 'Kaneshie Market Complex, Gate 2 Transport Yard',
    narrative: 'Altercation between market association transport union members resulting in severe physical injury to complainant and destruction of commercial ticketing counter.',
    status: 'bail_granted',
    statusUpdatedAt: '2026-07-24T12:00:00',
    priority: 'standard',
    isSynthetic: true,
    complainant: {
      id: 'comp_006',
      fullName: 'Theresa Naa Lamiley Mills',
      ghanaCardId: 'GHA-339102948-6',
      phone: '+233 244 550 119',
      address: 'Kaneshie 1st Light, Accra',
      gender: 'female',
      occupation: 'Market Traders Association Treasurer',
      photoUrl: getPlaceholderImage('complainant', 'Theresa Mills')
    },
    suspects: [
      {
        id: 'susp_005',
        fullName: 'Kofi Mensah Annan',
        alias: 'Abaawa',
        ghanaCardId: 'GHA-449102834-8',
        gender: 'male',
        approximateAge: 38,
        address: 'Bubuashie, Accra',
        photoUrl: getPlaceholderImage('suspect', 'Kofi M Annan'),
        cautionStatement: 'Suspect admits engaged in scuffle but claims he acted in self-defense after an argument over loading levies.',
        arrestStatus: 'bail_granted',
        arrestDate: '2026-07-19T08:00:00',
        bailDetails: {
          grantedDate: '2026-07-24T12:00:00',
          amountGHS: 15000,
          suretiesCount: 2,
          suretyDetails: 'Two justified civil servants residing in Kaneshie district.'
        },
        linkedCaseIds: ['case_006']
      }
    ],
    evidence: [],
    witnessStatements: [],
    dispositionNotes: 'Police enquiry bail granted pending mutual alternative dispute resolution and compensation for destroyed property agreed by Market Committee.',
    dispositionDate: '2026-07-24T12:00:00',
    submissions: [
      {
        id: 'sub_008',
        caseId: 'case_006',
        officerId: 'off_004',
        officerName: 'Samuel Addo',
        officerBadge: 'GPS-CSUPT-0091',
        officerRank: 'Chief Superintendent',
        officerRole: 'senior_officer',
        submissionType: 'senior_endorsement',
        title: 'Bail Endorsement and ADR Referral',
        content: 'Bail bond executed. Complainant agreed to ADR committee settlement. If terms are not met within 30 days, docket to be restored for court processing.',
        timestamp: '2026-07-24T12:00:00',
        isEndorsed: true
      }
    ]
  },
  {
    id: 'case_007',
    docketNumber: 'GPS/CNT/CR-2026/0025',
    offenceCategory: 'domestic_violence',
    offenceTitle: 'Threat of Death & Domestic Assault Report',
    act29OffenceCode: 'ACT732_SEC84',
    act29Section: 'Section 84 (Act 29/60) & Act 732',
    statuteCitation: 'Domestic Violence & Threat of Death: Contrary to Act 732 and Sections 75 & 84 of the Criminal Offences Act, 1960 (Act 29/60).',
    incidentDateTime: '2026-08-08T20:00:00',
    lodgedDateTime: '2026-08-09T08:30:00',
    stationId: 'stn_cantonments',
    stationName: 'Cantonments District Police Station',
    locationDescription: 'Labone Crescent, Accra',
    narrative: 'Complainant lodged a report regarding threats of harm during a matrimonial dispute. DOVVSU (Domestic Violence & Victim Support Unit) case opened.',
    status: 'closed_withdrawn',
    statusUpdatedAt: '2026-08-11T16:00:00',
    priority: 'standard',
    dispositionNotes: 'Complainant submitted formal written withdrawal affidavit following DOVVSU family counseling and mutually signed peace bond at Cantonments DOVVSU.',
    dispositionDate: '2026-08-11T16:00:00',
    isSynthetic: true,
    complainant: {
      id: 'comp_007',
      fullName: 'Salome Afia Frempong',
      ghanaCardId: 'GHA-229103948-1',
      phone: '+233 244 883 002',
      address: 'Labone, Accra',
      gender: 'female',
      occupation: 'Civil Servant',
      photoUrl: getPlaceholderImage('complainant', 'Salome Frempong')
    },
    suspects: [],
    evidence: [],
    witnessStatements: [],
    submissions: [
      {
        id: 'sub_009',
        caseId: 'case_007',
        officerId: 'off_005',
        officerName: 'Abena Boakye',
        officerBadge: 'GPS-CPL-7120',
        officerRank: 'Corporal',
        officerRole: 'counter_nco',
        submissionType: 'initial_intake',
        title: 'DOVVSU Counter Intake & Referral',
        content: 'Report received at Counter Office and medical examination form issued. DOVVSU counseling session scheduled.',
        timestamp: '2026-08-09T09:00:00'
      },
      {
        id: 'sub_009_b',
        caseId: 'case_007',
        officerId: 'off_006',
        officerName: 'Faustina Danquah',
        officerBadge: 'GPS-INSP-4412',
        officerRank: 'Inspector',
        officerRole: 'station_officer',
        submissionType: 'station_supervision',
        title: 'Station Officer DOVVSU Supervision Endorsement',
        content: 'Reviewed Counter NCO intake. Medical report verified and family peace bond executed upon mutual settlement agreement.',
        timestamp: '2026-08-11T16:00:00',
        isEndorsed: true
      }
    ]
  }
];
