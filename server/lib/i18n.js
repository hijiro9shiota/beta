const locales = {
  'fr-FR': {
    appName: 'Assistant de cours',
    record: 'Enregistrer un cours',
    import: 'Importer un audio',
    sections: 'Matières et sections',
    language: 'Langue',
    theme: 'Thème',
    dark: 'Sombre',
    light: 'Clair'
  },
  'en-US': {
    appName: 'Course Companion',
    record: 'Record a lecture',
    import: 'Import audio',
    sections: 'Subjects & Sections',
    language: 'Language',
    theme: 'Theme',
    dark: 'Dark',
    light: 'Light'
  }
};

function parseAcceptLanguage(header = '') {
  return header
    .split(',')
    .map((part) => part.trim().split(';')[0])
    .filter(Boolean);
}

export function detectLocale(req) {
  const header = req.headers['accept-language'];
  const candidates = parseAcceptLanguage(header);
  for (const candidate of candidates) {
    const normalized = candidate.includes('-') ? candidate : `${candidate}-US`;
    if (locales[normalized]) {
      return normalized;
    }
    const base = Object.keys(locales).find((key) => key.startsWith(candidate.split('-')[0]));
    if (base) {
      return base;
    }
  }
  return 'en-US';
}

export function i18nMiddleware(req, res, next) {
  const locale = detectLocale(req);
  req.locale = locale;
  req.dictionary = locales[locale];
  next();
}

export function getDictionaries() {
  return locales;
}
