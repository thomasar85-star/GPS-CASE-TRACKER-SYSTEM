import { OffenceCategory } from '../types';

export interface Act29OffenceDefinition {
  code: string;
  category: OffenceCategory;
  actTitle: string;
  actNumber: string; // e.g. "Act 29/60 of 1960"
  section: string; // e.g. "Section 124"
  title: string; // e.g. "Stealing (Theft)"
  classification: 'First Degree Felony' | 'Second Degree Felony' | 'Misdemeanour' | 'Special Statutory Offence';
  punishmentSummary: string;
  statementOfOffence: string;
  particularsTemplate: string;
  elements: string[];
}

export const GHANA_ACT_29_OFFENCES: Act29OffenceDefinition[] = [
  {
    code: 'ACT29_SEC124',
    category: 'theft',
    actTitle: 'Criminal Offences Act, 1960 (Act 29)',
    actNumber: 'Act 29/60 of 1960',
    section: 'Section 124',
    title: 'Stealing (Theft)',
    classification: 'Second Degree Felony',
    punishmentSummary: 'Imprisonment up to 10 years or fine under Section 296',
    statementOfOffence: 'Stealing: Contrary to Section 124 of the Criminal Offences Act, 1960 (Act 29/60).',
    particularsTemplate: 'For that you on [Date] at [Location], in the jurisdiction of this Court, did dishonestly appropriate a [Property Description] valued at [Amount GHS], the property of [Complainant Name].',
    elements: [
      'Dishonest appropriation of property',
      'Property belongs to another person',
      'Without consent or claim of right made in good faith',
      'Intent to permanently deprive the owner'
    ]
  },
  {
    code: 'ACT29_SEC149',
    category: 'robbery',
    actTitle: 'Criminal Offences Act, 1960 (Act 29)',
    actNumber: 'Act 29/60 of 1960',
    section: 'Section 149',
    title: 'Robbery (Armed Robbery)',
    classification: 'First Degree Felony',
    punishmentSummary: 'Imprisonment for not less than 10 to 15 years, or life imprisonment if committed with offensive weapon',
    statementOfOffence: 'Robbery: Contrary to Section 149 of the Criminal Offences Act, 1960 (Act 29/60).',
    particularsTemplate: 'For that you on [Date] at [Location], being armed with offensive weapons to wit [Weapons used], did rob [Complainant Name] of cash and valuables valued at [Amount GHS].',
    elements: [
      'Stealing property from person or custody',
      'Use of force, threat of violence, or offensive weapon',
      'Intimidation preceding or accompanying the appropriation'
    ]
  },
  {
    code: 'ACT29_SEC84',
    category: 'assault',
    actTitle: 'Criminal Offences Act, 1960 (Act 29)',
    actNumber: 'Act 29/60 of 1960',
    section: 'Section 84',
    title: 'Assault and Battery',
    classification: 'Misdemeanour',
    punishmentSummary: 'Imprisonment up to 3 years or fine',
    statementOfOffence: 'Assault: Contrary to Section 84 of the Criminal Offences Act, 1960 (Act 29/60).',
    particularsTemplate: 'For that you on [Date] at [Location], did unlawfully assault [Complainant Name] by beating and applying unlawful physical force to their person.',
    elements: [
      'Application of unlawful physical force or threat',
      'Without lawful consent or justification',
      'Intentional or reckless infliction'
    ]
  },
  {
    code: 'ACT29_SEC69',
    category: 'assault',
    actTitle: 'Criminal Offences Act, 1960 (Act 29)',
    actNumber: 'Act 29/60 of 1960',
    section: 'Section 69',
    title: 'Causing Harm',
    classification: 'Second Degree Felony',
    punishmentSummary: 'Imprisonment up to 10 years',
    statementOfOffence: 'Causing Harm: Contrary to Section 69 of the Criminal Offences Act, 1960 (Act 29/60).',
    particularsTemplate: 'For that you on [Date] at [Location], did intentionally and unlawfully cause bodily harm to [Complainant Name].',
    elements: [
      'Infliction of bodily injury / grievous bodily harm',
      'Unlawful and without lawful excuse',
      'Direct cause of physical injury'
    ]
  },
  {
    code: 'ACT29_SEC75',
    category: 'assault',
    actTitle: 'Criminal Offences Act, 1960 (Act 29)',
    actNumber: 'Act 29/60 of 1960',
    section: 'Section 75',
    title: 'Threat of Death',
    classification: 'Second Degree Felony',
    punishmentSummary: 'Imprisonment up to 10 years',
    statementOfOffence: 'Threat of Death: Contrary to Section 75 of the Criminal Offences Act, 1960 (Act 29/60).',
    particularsTemplate: 'For that you on [Date] at [Location], did intentionally threaten [Complainant Name] with death.',
    elements: [
      'Utterance or demonstration of intention to kill',
      'Targeted at specific victim or persons',
      'Reasonable apprehension of death created'
    ]
  },
  {
    code: 'ACT29_SEC131',
    category: 'fraud_scam',
    actTitle: 'Criminal Offences Act, 1960 (Act 29)',
    actNumber: 'Act 29/60 of 1960',
    section: 'Section 131',
    title: 'Defrauding by False Pretences',
    classification: 'Second Degree Felony',
    punishmentSummary: 'Imprisonment up to 10 years or fine',
    statementOfOffence: 'Defrauding by False Pretences: Contrary to Section 131 of the Criminal Offences Act, 1960 (Act 29/60).',
    particularsTemplate: 'For that you on [Date] at [Location], with intent to defraud, did obtain from [Complainant Name] the sum of [Amount GHS] by falsely pretending that [False representation details].',
    elements: [
      'Representation of a past or present fact known to be false',
      'Intent to defraud victim',
      'Victim parted with money, goods, or valuable security relying on false pretence'
    ]
  },
  {
    code: 'ACT29_SEC152',
    category: 'theft',
    actTitle: 'Criminal Offences Act, 1960 (Act 29)',
    actNumber: 'Act 29/60 of 1960',
    section: 'Section 152',
    title: 'Unlawful Entry (Burglary / Housebreaking)',
    classification: 'Second Degree Felony',
    punishmentSummary: 'Imprisonment up to 10 years',
    statementOfOffence: 'Unlawful Entry: Contrary to Section 152 of the Criminal Offences Act, 1960 (Act 29/60).',
    particularsTemplate: 'For that you on [Date] at [Location], did unlawfully enter the building / dwelling house of [Complainant Name] with intent to commit a crime therein to wit stealing.',
    elements: [
      'Unlawful entry into building, vessel, or premises',
      'Without consent of the lawful occupier',
      'With intent to commit a crime / felony therein'
    ]
  },
  {
    code: 'ACT29_SEC172',
    category: 'unlawful_damage',
    actTitle: 'Criminal Offences Act, 1960 (Act 29)',
    actNumber: 'Act 29/60 of 1960',
    section: 'Section 172',
    title: 'Causing Unlawful Damage',
    classification: 'Misdemeanour',
    punishmentSummary: 'Imprisonment up to 3 years or fine',
    statementOfOffence: 'Causing Unlawful Damage: Contrary to Section 172 of the Criminal Offences Act, 1960 (Act 29/60).',
    particularsTemplate: 'For that you on [Date] at [Location], did intentionally and unlawfully cause damage to [Damaged Property Description] valued at [Amount GHS], property of [Complainant Name].',
    elements: [
      'Intentional or reckless damage to property',
      'Property belongs to another person or public body',
      'Without claim of right made in good faith'
    ]
  },
  {
    code: 'ACT29_SEC46',
    category: 'homicide',
    actTitle: 'Criminal Offences Act, 1960 (Act 29)',
    actNumber: 'Act 29/60 of 1960',
    section: 'Section 46',
    title: 'Murder',
    classification: 'First Degree Felony',
    punishmentSummary: 'Life Imprisonment under Criminal and Other Offences (Procedure) Act as amended',
    statementOfOffence: 'Murder: Contrary to Section 46 of the Criminal Offences Act, 1960 (Act 29/60).',
    particularsTemplate: 'For that you on [Date] at [Location], did intentionally cause the death of [Victim Name] by unlawful harm.',
    elements: [
      'Death of a human being',
      'Death caused by unlawful harm',
      'Harm inflicted with intention to cause death (malice prepense)'
    ]
  },
  {
    code: 'ACT29_SEC50',
    category: 'homicide',
    actTitle: 'Criminal Offences Act, 1960 (Act 29)',
    actNumber: 'Act 29/60 of 1960',
    section: 'Section 50',
    title: 'Manslaughter',
    classification: 'First Degree Felony',
    punishmentSummary: 'Imprisonment for life or term of years',
    statementOfOffence: 'Manslaughter: Contrary to Section 50 of the Criminal Offences Act, 1960 (Act 29/60).',
    particularsTemplate: 'For that you on [Date] at [Location], did unlawfully cause the death of [Victim Name] by unlawful harm without premeditation.',
    elements: [
      'Unlawful killing of a human being',
      'Without intent to cause death or under extreme provocation / negligence'
    ]
  },
  {
    code: 'ACT29_SEC97',
    category: 'assault',
    actTitle: 'Criminal Offences Act, 1960 (Act 29)',
    actNumber: 'Act 29/60 of 1960',
    section: 'Section 97',
    title: 'Rape',
    classification: 'First Degree Felony',
    punishmentSummary: 'Imprisonment not less than 7 to 25 years',
    statementOfOffence: 'Rape: Contrary to Section 97 of the Criminal Offences Act, 1960 (Act 29/60).',
    particularsTemplate: 'For that you on [Date] at [Location], did have unlawful carnal knowledge of [Victim Name], a female, without her consent.',
    elements: [
      'Carnal knowledge of female person',
      'Without consent obtained freely',
      'By force, threat of violence, or deception'
    ]
  },
  {
    code: 'ACT29_SEC101',
    category: 'assault',
    actTitle: 'Criminal Offences Act, 1960 (Act 29)',
    actNumber: 'Act 29/60 of 1960',
    section: 'Section 101',
    title: 'Defilement of a Child (Under 16 Years)',
    classification: 'First Degree Felony',
    punishmentSummary: 'Imprisonment not less than 7 to 25 years',
    statementOfOffence: 'Defilement of Child: Contrary to Section 101 of the Criminal Offences Act, 1960 (Act 29/60).',
    particularsTemplate: 'For that you on [Date] at [Location], did have unlawful carnal knowledge of [Victim Name], a child aged [Age] years.',
    elements: [
      'Carnal knowledge of child under 16 years',
      'Consent of child is immaterial at law'
    ]
  },
  {
    code: 'ACT29_SEC159',
    category: 'fraud_scam',
    actTitle: 'Criminal Offences Act, 1960 (Act 29)',
    actNumber: 'Act 29/60 of 1960',
    section: 'Section 159',
    title: 'Forgery of Official or Private Documents',
    classification: 'Second Degree Felony',
    punishmentSummary: 'Imprisonment up to 10 years',
    statementOfOffence: 'Forgery: Contrary to Section 159 of the Criminal Offences Act, 1960 (Act 29/60).',
    particularsTemplate: 'For that you on [Date] at [Location], with intent to defraud, did forge a certain document to wit [Document Description].',
    elements: [
      'Making a false document with intent to deceive',
      'Intended to pass as authentic',
      'Intent to cause economic or legal detriment'
    ]
  },
  {
    code: 'ACT29_SEC146',
    category: 'theft',
    actTitle: 'Criminal Offences Act, 1960 (Act 29)',
    actNumber: 'Act 29/60 of 1960',
    section: 'Section 146',
    title: 'Dishonestly Receiving Stolen Property',
    classification: 'Second Degree Felony',
    punishmentSummary: 'Imprisonment up to 10 years',
    statementOfOffence: 'Dishonestly Receiving: Contrary to Section 146 of the Criminal Offences Act, 1960 (Act 29/60).',
    particularsTemplate: 'For that you on [Date] at [Location], did dishonestly receive [Stolen Goods Description] knowing the same to have been obtained by felony / stealing.',
    elements: [
      'Receipt or possession of stolen goods',
      'Knowledge or reason to believe property was stolen',
      'Dishonest intent in retaining possession'
    ]
  },
  {
    code: 'ACT29_SEC196',
    category: 'other',
    actTitle: 'Criminal Offences Act, 1960 (Act 29)',
    actNumber: 'Act 29/60 of 1960',
    section: 'Section 196',
    title: 'Rioting and Breach of Public Peace',
    classification: 'Misdemeanour',
    punishmentSummary: 'Imprisonment up to 3 years',
    statementOfOffence: 'Rioting: Contrary to Section 196 of the Criminal Offences Act, 1960 (Act 29/60).',
    particularsTemplate: 'For that you on [Date] at [Location], together with others numbering three or more, did riotously assemble and disturb the public peace.',
    elements: [
      'Unlawful assembly of three or more persons',
      'Execution of common intent with violence or terror',
      'Breach of public tranquility'
    ]
  },
  {
    code: 'ACT29_SEC239',
    category: 'other',
    actTitle: 'Criminal Offences Act, 1960 (Act 29)',
    actNumber: 'Act 29/60 of 1960',
    section: 'Section 239',
    title: 'Corruption of and by Public Officers',
    classification: 'Second Degree Felony',
    punishmentSummary: 'Imprisonment up to 10 years',
    statementOfOffence: 'Corruption: Contrary to Section 239 of the Criminal Offences Act, 1960 (Act 29/60).',
    particularsTemplate: 'For that you on [Date] at [Location], did corruptly give / demand valuable consideration to influence an official act.',
    elements: [
      'Giving or receiving valuable consideration',
      'Targeting public officer or duty',
      'Corrupt intent to influence public function'
    ]
  },
  {
    code: 'ACT732_SEC84',
    category: 'domestic_violence',
    actTitle: 'Domestic Violence Act 2007 (Act 732) r/w Act 29/60',
    actNumber: 'Act 29/60 of 1960 & Act 732',
    section: 'Section 84 (Act 29/60) & Act 732',
    title: 'Domestic Violence & Battery (DOVVSU)',
    classification: 'Special Statutory Offence',
    punishmentSummary: 'Imprisonment up to 3 years or fine / protection orders',
    statementOfOffence: 'Domestic Violence: Contrary to Section 1 of Act 732 read with Section 84 of the Criminal Offences Act, 1960 (Act 29/60).',
    particularsTemplate: 'For that you on [Date] at [Location], did engage in domestic violence by assaulting and threatening your domestic partner / dependent [Victim Name].',
    elements: [
      'Physical, sexual, emotional, or economic abuse within domestic relationship',
      'Direct violation of domestic protection'
    ]
  },
  {
    code: 'ACT1019_SEC20',
    category: 'narcotics',
    actTitle: 'Narcotics Control Commission Act, 2020 (Act 1019) r/w Act 29/60',
    actNumber: 'Act 29/60 of 1960 & Act 1019',
    section: 'Section 20 (Act 29/60) & Act 1019',
    title: 'Possession & Trafficking of Narcotic Drugs',
    classification: 'First Degree Felony',
    punishmentSummary: 'Imprisonment not less than 10 years and fine',
    statementOfOffence: 'Possession of Narcotic Drugs: Contrary to the Narcotics Control Commission Act, 2020 (Act 1019) and Section 20 of Criminal Offences Act, 1960 (Act 29/60).',
    particularsTemplate: 'For that you on [Date] at [Location], did unlawfully possess [Quantity / Substance] without lawful authority.',
    elements: [
      'Unlawful possession or trafficking of controlled narcotic substance',
      'Knowledge and physical control of substance'
    ]
  },
  {
    code: 'ACT1038_SEC131',
    category: 'cybercrime',
    actTitle: 'Cybersecurity Act, 2020 (Act 1038) r/w Act 29/60',
    actNumber: 'Act 29/60 of 1960 & Act 1038',
    section: 'Section 131 (Act 29/60) & Act 1038',
    title: 'Cyber Fraud & Electronic Unauthorized Access',
    classification: 'Second Degree Felony',
    punishmentSummary: 'Imprisonment up to 10 years and restitution',
    statementOfOffence: 'Cyber Fraud: Contrary to Cybersecurity Act, 2020 (Act 1038) read with Section 131 of Criminal Offences Act, 1960 (Act 29/60).',
    particularsTemplate: 'For that you on [Date] at [Location], did use a computer system to defraud [Complainant Name] of GHS [Amount].',
    elements: [
      'Use of computer or digital telecommunications network',
      'Unauthorized access or data interception',
      'Intent to defraud'
    ]
  },
  {
    code: 'ACT683_SEC29',
    category: 'traffic_infraction',
    actTitle: 'Road Traffic Act, 2004 (Act 683) r/w Act 29/60',
    actNumber: 'Act 29/60 of 1960 & Act 683',
    section: 'Section 50/84 (Act 29/60) & Act 683',
    title: 'Careless Driving & Causing Dangerous Harm (MTTD)',
    classification: 'Misdemeanour',
    punishmentSummary: 'Fine and/or imprisonment, license endorsement',
    statementOfOffence: 'Careless Driving & Causing Harm: Contrary to Road Traffic Act, 2004 (Act 683) and Act 29/60.',
    particularsTemplate: 'For that you on [Date] at [Location], did drive a motor vehicle with registration number [Vehicle Number] without due care and attention.',
    elements: [
      'Operation of motor vehicle on public road',
      'Failure to adhere to statutory duty of care',
      'Resulting collision or endangerment'
    ]
  }
];

export function getAct29OffenceByCode(code: string): Act29OffenceDefinition | undefined {
  return GHANA_ACT_29_OFFENCES.find(o => o.code === code);
}

export function getAct29OffencesByCategory(category: OffenceCategory): Act29OffenceDefinition[] {
  return GHANA_ACT_29_OFFENCES.filter(o => o.category === category);
}

export function getDefaultAct29OffenceForCategory(category: OffenceCategory): Act29OffenceDefinition {
  const match = GHANA_ACT_29_OFFENCES.find(o => o.category === category);
  return match || GHANA_ACT_29_OFFENCES[0];
}
