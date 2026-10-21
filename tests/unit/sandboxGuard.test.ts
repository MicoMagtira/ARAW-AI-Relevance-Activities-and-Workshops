// Chatbot Sandbox safety checks: red flags in all five languages, personal data, and the streamed dose filter.
import { describe, expect, it } from 'vitest';
import { createDoseFilter, detectPersonalData, detectRedFlags, hasDose, normalize } from '../../src/sandbox/guard';

const flags = (text: string) => detectRedFlags(text).ids;

describe('normalize', () => {
  it('lowercases, drops accents and collapses spaces', () => {
    expect(normalize('  Nawalan  ng MALAY  ')).toBe('nawalan ng malay');
    expect(normalize('Ñino’s')).toBe("nino's");
  });
});

describe('detectRedFlags', () => {
  it('finds each CONTENT_GUIDE red flag in English', () => {
    expect(flags('My father has chest pain right now')).toContain('chest');
    expect(flags('She can’t breathe properly')).toContain('breathing');
    expect(flags('His face is drooping and he has slurred speech')).toContain('stroke');
    expect(flags('My son had a seizure')).toContain('seizure');
    expect(flags('The bleeding is heavy and will not stop')).toContain('bleeding');
    expect(flags('Dengue and now her gums are bleeding')).toContain('dengue');
    expect(flags('My child has no tears and is very sleepy')).toContain('dehydration');
    expect(flags('My 2 months old baby has a fever')).toContain('babyFever');
    expect(flags('A dog bit my hand')).toContain('bite');
  });

  it('finds red flags in Filipino, Cebuano, Ilokano and Hiligaynon', () => {
    expect(flags('Masakit ang dibdib ng lolo ko')).toContain('chest');
    expect(flags('Hirap huminga ang anak ko')).toContain('breathing');
    expect(flags('Nahimatay si nanay kanina')).toContain('seizure');
    expect(flags('Kinagat ng aso ang kapatid ko')).toContain('bite');
    expect(flags('Nilalagnat ang sanggol namin')).toContain('babyFever');
    expect(flags('Sakit kaayo akong dughan')).toContain('chest');
    expect(flags('Lisod siya moginhawa')).toContain('breathing');
    expect(flags('Gikagat sa iro ang akong anak')).toContain('bite');
    expect(flags('Masakit ti barukong ni tatang')).toContain('chest');
    expect(flags('Narigat ti agang-ang na')).toContain('breathing');
    expect(flags('Ginkagat sang ido ang bata')).toContain('bite');
    expect(flags('Budlay magginhawa si lola')).toContain('breathing');
  });

  it('keeps thoughts of self-harm apart, in every language', () => {
    for (const text of ['I want to kill myself', 'Gusto ko nang mamatay', 'Gusto na ko maghikog', 'Kayat ko ti matay', 'Indi na ko gusto mabuhi']) {
      expect(detectRedFlags(text).selfHarm).toBe(true);
    }
  });

  it('leaves everyday health questions alone', () => {
    for (const text of [
      'How can I keep mosquitoes away at home?',
      'What does a vaccine do?',
      'Paano maiwasan ang dengue?',
      'Kagat ng lamok sa bata, paano maiwasan?',
      'Is it true that garlic cures high blood pressure?',
      'Unsa ang buhat sa bakuna?',
      'May kaso ba ang balita?',
    ]) {
      expect(flags(text)).toEqual([]);
    }
  });
});

describe('detectPersonalData', () => {
  it('finds phone numbers, ID numbers, emails, names, addresses and diagnoses', () => {
    expect(detectPersonalData('Call me at 0917 123 4567')).toContain('phone');
    expect(detectPersonalData('+63 917-123-4567')).toContain('phone');
    expect(detectPersonalData('My PhilHealth is 12-345678901-2')).toContain('id');
    expect(detectPersonalData('juan@example.com')).toContain('email');
    expect(detectPersonalData('My name is Juan Dela Cruz')).toContain('name');
    expect(detectPersonalData('Ako si Maria, 45 taong gulang')).toContain('name');
    expect(detectPersonalData('Ang akong ngalan kay Pedro')).toContain('name');
    expect(detectPersonalData('Nakatira ako sa Purok 3')).toContain('address');
    expect(detectPersonalData('I was diagnosed with diabetes')).toContain('diagnosis');
    expect(detectPersonalData('Nagpositibo ako sa TB')).toContain('diagnosis');
  });

  it('does not count a phone number twice, and lets ordinary questions through', () => {
    expect(detectPersonalData('09171234567')).toEqual(['phone']);
    expect(detectPersonalData('What is the date today?')).toEqual([]);
    expect(detectPersonalData('Is it safe to share my PhilHealth number with a chatbot?')).toEqual([]);
    expect(detectPersonalData('My child is 5 years old')).toEqual([]);
  });
});

describe('hasDose', () => {
  it('spots amounts and schedules in several languages', () => {
    expect(hasDose('Give 250 mg of paracetamol.')).toBe(true);
    expect(hasDose('Take 2 tablets.')).toBe(true);
    expect(hasDose('Uminom ng isang tableta.')).toBe(true);
    expect(hasDose('Take it twice a day.')).toBe(true);
    expect(hasDose('Every 6 hours is fine.')).toBe(true);
    expect(hasDose('Inumin tuwing 4 na oras.')).toBe(false); // "na" between: not a schedule pattern on its own
    expect(hasDose('Inumin tuwing 4 oras.')).toBe(true);
    expect(hasDose('3 beses sa isang araw.')).toBe(true);
    expect(hasDose('5 ml of syrup')).toBe(true);
  });

  it('leaves ordinary sentences with numbers alone', () => {
    expect(hasDose('Dengue season peaks from June to October.')).toBe(false);
    expect(hasDose('Wash your hands for 20 seconds.')).toBe(false);
    expect(hasDose('Ask a health worker about medicine.')).toBe(false);
  });
});

describe('createDoseFilter', () => {
  const HIDDEN = '[hidden]';

  it('replaces a sentence with a dose and keeps the others', () => {
    const f = createDoseFilter(HIDDEN);
    f.push('Rest and drink water. Give 250 mg of paracetamol. Ask a health worker.');
    expect(f.end()).toBe(`Rest and drink water. ${HIDDEN} Ask a health worker.`);
    expect(f.hidDose).toBe(true);
  });

  it('never shows a dose while it streams in, even split across pieces', () => {
    const f = createDoseFilter(HIDDEN);
    const seen: string[] = [];
    for (const piece of ['Rest well. Give ', '2', '50', ' m', 'g every ', '6 hours', '. See a doctor.']) seen.push(f.push(piece));
    for (const shown of seen) {
      expect(shown).not.toMatch(/250|mg|6 hours/);
    }
    expect(f.end()).toBe(`Rest well. ${HIDDEN} See a doctor.`);
  });

  it('shows text without numbers as it comes, and keeps decimals inside a sentence', () => {
    const f = createDoseFilter(HIDDEN);
    expect(f.push('Drink water')).toBe('Drink water');
    expect(f.push(' and rest. It is 2.5 km away.')).toBe('Drink water and rest. It is 2.5 km away.');
    expect(f.hidDose).toBe(false);
  });

  it('keeps line breaks', () => {
    const f = createDoseFilter(HIDDEN);
    f.push('Tips:\n• Rest\n• Take 500mg\n• Drink water');
    expect(f.end()).toBe(`Tips:\n• Rest\n${HIDDEN}\n• Drink water`);
  });
});
